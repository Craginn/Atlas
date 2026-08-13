import { spawn as spawnProcess } from 'node:child_process';
import type { Duplex } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import crypto from 'node:crypto';

// The browser terminal's back end: a long-lived shell the page talks to over a
// WebSocket, one session per connection.
//
// Two modes, decided at startup by whether node-pty loaded:
//
//   pty   — a real pseudo-terminal. Interactive programs (claude, vim, top)
//           work, because the shell believes it is attached to a terminal.
//   pipe  — plain child_process with piped stdio. Non-interactive commands are
//           fine; anything that wants a TTY will degrade or refuse.
//
// node-pty is a native module needing a compiler, which not every machine has,
// so it is an optionalDependency and this degrades rather than failing to boot.

export type ShellMode = 'pty' | 'pipe';

interface PtyLike {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(cb: (data: string) => void): void;
  onExit(cb: (e: { exitCode: number }) => void): void;
}

/** Resolved once: importing a missing native module is slow to retry. */
let ptyModule: unknown = null;
let ptyProbed = false;

async function loadPty(): Promise<unknown> {
  if (ptyProbed) return ptyModule;
  ptyProbed = true;
  try {
    ptyModule = await import('node-pty');
  } catch {
    // Not installed or failed to build. Pipe mode still works.
    ptyModule = null;
  }
  return ptyModule;
}

export async function shellMode(): Promise<ShellMode> {
  return (await loadPty()) ? 'pty' : 'pipe';
}

const DEFAULT_SHELL =
  process.env.ATLAS_SHELL || process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash');

/** Per-session overrides. Defaults reproduce the original local-dev behavior. */
export interface ShellSessionOptions {
  /** Working directory the shell starts in. Defaults to the server's cwd. */
  cwd?: string;
  /** Extra environment for the shell (e.g. ANTHROPIC_API_KEY, HOME). */
  env?: Record<string, string | undefined>;
}

/** Start a shell, in a PTY when one is available. */
async function startShell(
  cols: number,
  rows: number,
  opts: ShellSessionOptions = {},
): Promise<{ io: PtyLike; mode: ShellMode }> {
  const pty = (await loadPty()) as
    | { spawn(file: string, args: string[], opts: Record<string, unknown>): PtyLike }
    | null;

  const cwd = opts.cwd ?? process.cwd();
  const env = { ...process.env, ...opts.env };

  if (pty) {
    const term = pty.spawn(DEFAULT_SHELL, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env,
    });
    return { io: term, mode: 'pty' };
  }

  // Pipe fallback. `-i` asks for an interactive shell so a prompt still appears,
  // though without a TTY the shell will not do line editing or job control.
  const child = spawnProcess(DEFAULT_SHELL, ['-i'], {
    cwd,
    env: { ...env, TERM: 'dumb' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const dataHandlers: ((d: string) => void)[] = [];
  const exitHandlers: ((e: { exitCode: number }) => void)[] = [];
  child.stdout?.on('data', d => dataHandlers.forEach(h => h(d.toString())));
  child.stderr?.on('data', d => dataHandlers.forEach(h => h(d.toString())));
  child.on('close', code => exitHandlers.forEach(h => h({ exitCode: code ?? 0 })));

  return {
    mode: 'pipe',
    io: {
      write: data => child.stdin?.write(data),
      resize: () => {
        // No TTY to resize. Ignored rather than thrown: the browser sends a
        // resize on every window change and it must not kill the session.
      },
      kill: () => child.kill(),
      onData: cb => dataHandlers.push(cb),
      onExit: cb => exitHandlers.push(cb),
    },
  };
}

// ---------------------------------------------------------------- websocket

// A minimal RFC 6455 server. The alternative is the `ws` package, but this
// speaks exactly one protocol on one endpoint, and keeping a dependency out of
// the component that hands out shell access is worth ~60 lines.

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(key: string): string {
  return crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
}

/** Encode one text frame. Server frames are never masked. */
function encodeFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;

  let header: Buffer;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Pull complete frames out of a growing buffer.
 *
 * TCP gives no message boundaries, so a frame can arrive split across reads or
 * several can arrive together. Returns what could be decoded plus the remainder.
 */
function decodeFrames(buffer: Buffer): { messages: string[]; rest: Buffer; closed: boolean } {
  const messages: string[] = [];
  let offset = 0;
  let closed = false;

  for (;;) {
    if (buffer.length - offset < 2) break;
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let cursor = offset + 2;

    if (length === 126) {
      if (buffer.length - cursor < 2) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (buffer.length - cursor < 8) break;
      length = Number(buffer.readBigUInt64BE(cursor));
      cursor += 8;
    }

    let mask: Buffer | null = null;
    if (masked) {
      if (buffer.length - cursor < 4) break;
      mask = buffer.subarray(cursor, cursor + 4);
      cursor += 4;
    }

    if (buffer.length - cursor < length) break;
    const payload = buffer.subarray(cursor, cursor + length);
    cursor += length;

    if (opcode === 0x8) {
      closed = true;
      offset = cursor;
      break;
    }

    if (opcode === 0x1 || opcode === 0x0) {
      const decoded = Buffer.from(payload);
      if (mask) for (let i = 0; i < decoded.length; i++) decoded[i] ^= mask[i % 4];
      messages.push(decoded.toString('utf8'));
    }

    offset = cursor;
  }

  return { messages, rest: buffer.subarray(offset), closed };
}

const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Constant-time string compare, so a token check can't be narrowed by timing.
 * Lengths are compared first via a fixed-size digest, since timingSafeEqual
 * throws on a length mismatch and that throw would itself leak the length.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Upgrade a request to a WebSocket carrying a shell session.
 *
 * The same local-only rule as the one-shot bridge: the dev server binds all
 * interfaces so a phone can load the app, which would otherwise mean anyone on
 * the network gets a shell.
 */
export async function handleShellSocket(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  opts: ShellSessionOptions = {},
): Promise<void> {
  const local = LOCAL_ADDRESSES.has(req.socket.remoteAddress ?? '');
  if (!local && process.env.ATLAS_SHELL_ALLOW_REMOTE !== '1') {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }

  // Remote callers must present the shared token. This is the only thing standing
  // between the open internet and a shell holding the deployment's API key, so it
  // fails closed: no token configured means no remote session, ever. Local callers
  // are exempt — they already have a shell on the machine running this process.
  if (!local) {
    const expected = process.env.ATLAS_SHELL_TOKEN ?? '';
    const presented = new URL(req.url ?? '/', 'http://placeholder').searchParams.get('token') ?? '';
    if (!expected || !timingSafeEqualStr(presented, expected)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return;
    }
  }

  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return;
  }

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
  );

  const send = (msg: unknown) => {
    if (!socket.destroyed) socket.write(encodeFrame(JSON.stringify(msg)));
  };

  const { io, mode } = await startShell(80, 24, opts);
  send({ type: 'ready', mode, shell: DEFAULT_SHELL });
  if (mode === 'pipe') {
    send({
      type: 'notice',
      text:
        'Running without a pseudo-terminal — node-pty is not installed, so interactive ' +
        'programs (claude, vim, top) will not work here. Install it with ' +
        '`npm install node-pty`, or use `npm run cli`.',
    });
  }

  io.onData(data => send({ type: 'data', data }));
  io.onExit(({ exitCode }) => {
    send({ type: 'exit', exitCode });
    if (!socket.destroyed) socket.end();
  });

  let buffer = head.length ? Buffer.from(head) : Buffer.alloc(0);

  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    const { messages, rest, closed } = decodeFrames(buffer);
    buffer = rest;

    for (const raw of messages) {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'input') io.write(msg.data);
        else if (msg.type === 'resize') io.resize(msg.cols, msg.rows);
      } catch {
        // A malformed frame is not worth tearing down a live shell for.
      }
    }
    if (closed) {
      io.kill();
      socket.end();
    }
  });

  // Never leave an orphaned shell behind when the tab goes away.
  const cleanup = () => io.kill();
  socket.on('close', cleanup);
  socket.on('error', cleanup);
}
