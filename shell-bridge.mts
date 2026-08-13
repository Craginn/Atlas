import { spawn } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';

// The dev-server shell bridge: lets the in-app terminal run commands, since a
// browser tab has no shell of its own.
//
// This hands whoever can reach the endpoint the ability to run arbitrary
// commands as the user running the dev server, so it is off unless explicitly
// switched on, and refuses non-local callers. The dev server binds to all
// interfaces (host: true, for phone testing), which means "reachable" would
// otherwise include everyone on the same Wi-Fi.
//
// The AI agent never calls this. It is wired to `/sh`, which only runs text the
// user typed; no agent tool can reach it.

export const SHELL_ENABLED = process.env.ATLAS_ENABLE_SHELL === '1';

/** Allow a non-local caller only if the user has explicitly accepted that. */
const ALLOW_REMOTE = process.env.ATLAS_SHELL_ALLOW_REMOTE === '1';

/** Hard ceiling so a hung command cannot pin the session open forever. */
const TIMEOUT_MS = Number(process.env.ATLAS_SHELL_TIMEOUT_MS || 300_000);

const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function isLocal(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress ?? '';
  return LOCAL_ADDRESSES.has(addr);
}

/**
 * Handle POST /api/shell. Streams combined output as newline-delimited JSON so
 * the browser can render progressively — a piped installer that only appeared
 * after it finished would be useless.
 */
export async function handleShell(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!SHELL_ENABLED) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Shell bridge disabled. Start with ATLAS_ENABLE_SHELL=1.' }));
    return;
  }
  if (!isLocal(req) && !ALLOW_REMOTE) {
    // Deliberately explicit: a silent failure here would look like a bug.
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error:
          'Shell bridge refuses non-local callers. Use the machine running the dev server, ' +
          'or set ATLAS_SHELL_ALLOW_REMOTE=1 if you really mean to expose it.',
      }),
    );
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  const body = await new Promise<string>(resolve => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });

  let command = '';
  try {
    command = JSON.parse(body).command ?? '';
  } catch {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Expected JSON {command}.' }));
    return;
  }
  if (!command.trim()) {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Empty command.' }));
    return;
  }

  res.writeHead(200, {
    'content-type': 'application/x-ndjson',
    'cache-control': 'no-store',
    // Chunks must reach the browser as they are produced, not when a proxy
    // decides the response looks complete.
    'x-accel-buffering': 'no',
  });

  const send = (kind: string, text: string) => res.write(`${JSON.stringify({ kind, text })}\n`);

  console.log(`[shell] ${command}`);

  // `shell: true` is required for pipes and redirection — `curl … | bash` is
  // the stated use case. Nothing is escaped because nothing can be: this runs
  // exactly what the user typed.
  const child = spawn(command, {
    shell: true,
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const timer = setTimeout(() => {
    send('err', `Timed out after ${TIMEOUT_MS}ms — killed.`);
    child.kill('SIGKILL');
  }, TIMEOUT_MS);

  // Buffer partial lines so output is not split mid-word.
  const reader = (kind: string) => {
    let buffer = '';
    return {
      push(data: Buffer) {
        buffer += data.toString();
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';
        for (const line of parts) send(kind, line);
      },
      flush() {
        if (buffer) send(kind, buffer);
        buffer = '';
      },
    };
  };
  const stdout = reader('out');
  const stderr = reader('err');
  child.stdout?.on('data', d => stdout.push(d));
  child.stderr?.on('data', d => stderr.push(d));

  // If the browser navigates away mid-command, don't leave the process running.
  req.on('close', () => {
    if (child.exitCode === null) child.kill('SIGTERM');
  });

  child.on('error', e => {
    clearTimeout(timer);
    send('err', e.message);
    res.end(`${JSON.stringify({ kind: 'exit', code: 127 })}\n`);
  });

  child.on('close', code => {
    clearTimeout(timer);
    stdout.flush();
    stderr.flush();
    res.end(`${JSON.stringify({ kind: 'exit', code: code ?? 0 })}\n`);
  });
}
