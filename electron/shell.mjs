import { spawn } from 'node:child_process';
import os from 'node:os';

// Shell access for the in-app terminal, run in Electron's main process and
// reached only over IPC from the app's own window — no network port is opened.
//
// Two kinds of session:
//
//   interactive — a long-lived shell, one per terminal pane. Runs in a real
//                 pseudo-terminal when node-pty loads (so claude, vim, top work);
//                 otherwise falls back to piped stdio, where anything that wants
//                 a TTY will degrade or refuse.
//   one-shot    — `/sh` and `/task`: run one command, stream its output back.

export const DEFAULT_SHELL =
  process.env.ATLAS_SHELL ||
  (process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash');

/** Hard ceiling so a hung one-shot command cannot run forever. */
const TIMEOUT_MS = Number(process.env.ATLAS_SHELL_TIMEOUT_MS || 300_000);

/** Resolved once: importing a missing native module is slow to retry. */
let ptyModule = null;
let ptyProbed = false;

async function loadPty() {
  if (ptyProbed) return ptyModule;
  ptyProbed = true;
  try {
    const mod = await import('node-pty');
    ptyModule = mod.default ?? mod;
  } catch {
    // Not installed or built for a different runtime. Pipe mode still works.
    ptyModule = null;
  }
  return ptyModule;
}

/** Args that make the default shell usable without a TTY. */
function pipeArgs(shell) {
  return /powershell|pwsh/i.test(shell) ? ['-NoLogo', '-Command', '-'] : ['-i'];
}

/**
 * Start an interactive shell. Returns an object with write/resize/kill and
 * onData/onExit hooks, plus the mode it ended up in.
 */
export async function startShell(cols, rows) {
  const pty = await loadPty();
  const cwd = os.homedir();
  const env = { ...process.env };

  if (pty) {
    const term = pty.spawn(DEFAULT_SHELL, [], { name: 'xterm-color', cols, rows, cwd, env });
    return {
      mode: 'pty',
      io: {
        write: data => term.write(data),
        resize: (c, r) => term.resize(c, r),
        kill: () => term.kill(),
        onData: cb => term.onData(cb),
        onExit: cb => term.onExit(cb),
      },
    };
  }

  const child = spawn(DEFAULT_SHELL, pipeArgs(DEFAULT_SHELL), {
    cwd,
    env: { ...env, TERM: 'dumb' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const dataHandlers = [];
  const exitHandlers = [];
  child.stdout.on('data', d => dataHandlers.forEach(h => h(d.toString())));
  child.stderr.on('data', d => dataHandlers.forEach(h => h(d.toString())));
  child.on('error', e => dataHandlers.forEach(h => h(`${e.message}\r\n`)));
  child.on('close', code => exitHandlers.forEach(h => h({ exitCode: code ?? 0 })));

  return {
    mode: 'pipe',
    io: {
      write: data => child.stdin.write(data),
      // No TTY to resize. Ignored rather than thrown: the pane sends a resize
      // on every layout change and it must not kill the session.
      resize: () => {},
      kill: () => child.kill(),
      onData: cb => dataHandlers.push(cb),
      onExit: cb => exitHandlers.push(cb),
    },
  };
}

/**
 * Run one command, streaming output line by line through `send(kind, text)`.
 * Resolves with the exit code. Returns a `kill` for cancellation.
 */
export function runCommand(command, send) {
  // `shell: true` is required for pipes and redirection. Nothing is escaped
  // because nothing can be: this runs exactly what the user typed.
  const child = spawn(command, {
    shell: true,
    cwd: os.homedir(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Buffer partial lines so output is not split mid-word.
  const reader = kind => {
    let buffer = '';
    return {
      push(data) {
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
  child.stdout.on('data', d => stdout.push(d));
  child.stderr.on('data', d => stderr.push(d));

  const done = new Promise(resolve => {
    const timer = setTimeout(() => {
      send('err', `Timed out after ${TIMEOUT_MS}ms — killed.`);
      child.kill('SIGKILL');
    }, TIMEOUT_MS);
    child.on('error', e => {
      clearTimeout(timer);
      send('err', e.message);
      resolve(127);
    });
    child.on('close', code => {
      clearTimeout(timer);
      stdout.flush();
      stderr.flush();
      resolve(code ?? 0);
    });
  });

  return {
    done,
    kill: () => {
      if (child.exitCode === null) child.kill('SIGTERM');
    },
  };
}
