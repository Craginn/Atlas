import { OutputLine } from './types';

// Renderer side of the desktop shell bridge.
//
// A page cannot spawn a process, so the terminal asks Electron's main process
// through the preload API (`window.atlasDesktop`, see electron/preload.cjs).
// Outside Electron (tests, a plain browser) that API is absent and the shell is
// simply unavailable — Atlas's own commands still work.

/** Message from an interactive shell session. */
export type ShellMessage =
  | { type: 'ready'; mode: 'pty' | 'pipe'; shell: string }
  | { type: 'data'; data: string }
  | { type: 'notice'; text: string }
  | { type: 'exit'; exitCode: number };

export interface ShellSession {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  close(): void;
}

interface AtlasDesktop {
  shellStatus(): Promise<{ shell: boolean }>;
  openShell(cols: number, rows: number, onMessage: (msg: ShellMessage) => void): Promise<ShellSession>;
  startCommand(
    command: string,
    onLine: (line: { kind: 'out' | 'err'; text: string }) => void,
  ): { done: Promise<number>; abort(): void };
  /** OS-encrypted storage for the user's own secrets (electron/main.mjs). */
  secrets?: {
    available(): Promise<boolean>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
  };
}

declare global {
  interface Window {
    atlasDesktop?: AtlasDesktop;
  }
}

const desktop = (): AtlasDesktop | undefined =>
  typeof window !== 'undefined' ? window.atlasDesktop : undefined;

/** Whether this session has a shell available. */
let shellAvailable = false;

export function setShellAvailable(value: boolean) {
  shellAvailable = value;
}

export function isShellAvailable(): boolean {
  return shellAvailable;
}

/** Ask the desktop host whether a shell is available, and record the answer. */
export async function refreshShellStatus(): Promise<void> {
  try {
    const status = await desktop()?.shellStatus();
    setShellAvailable(status?.shell === true);
  } catch {
    setShellAvailable(false);
  }
}

/** Open an interactive shell session in the desktop host. */
export function openShellSession(
  cols: number,
  rows: number,
  onMessage: (msg: ShellMessage) => void,
): Promise<ShellSession> {
  const host = desktop();
  if (!host) return Promise.reject(new Error('No desktop shell available.'));
  return host.openShell(cols, rows, onMessage);
}

/** Run one command and stream its output. */
export async function runShellViaBridge(
  command: string,
  onChunk: (line: OutputLine) => void,
  signal?: AbortSignal,
): Promise<{ exitCode: number }> {
  const host = desktop();
  if (!host) {
    onChunk({ kind: 'err', text: 'No shell available — run Atlas as the desktop app.' });
    return { exitCode: 1 };
  }
  const job = host.startCommand(command, line =>
    onChunk({ kind: line.kind === 'err' ? 'err' : 'out', text: line.text ?? '' }),
  );
  signal?.addEventListener('abort', () => job.abort(), { once: true });
  try {
    return { exitCode: await job.done };
  } catch (e) {
    onChunk({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    return { exitCode: 1 };
  }
}
