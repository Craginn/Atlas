import { OutputLine } from './types';

// Browser side of the dev-server shell bridge.
//
// A page cannot spawn a process, so `/sh` in the app posts the command to the
// dev server and renders what streams back. The bridge is off unless the server
// was started with ATLAS_ENABLE_SHELL=1, and it does not exist at all in a
// production build.

/** Whether this session has a shell available, per /api/key-status. */
let shellAvailable = false;

export function setShellAvailable(value: boolean) {
  shellAvailable = value;
}

export function isShellAvailable(): boolean {
  return shellAvailable;
}

/**
 * Ask the server whether a shell bridge is reachable, and record the answer.
 *
 * Fire once at startup. A failure (plain static hosting with no sidecar) just
 * leaves the shell marked unavailable, which is the correct fallback. The probe
 * hits /api/key-status — the same endpoint the dev server and production sidecar
 * expose — and reads only its `shell` flag.
 */
export async function refreshShellStatus(): Promise<void> {
  try {
    const res = await fetch('/api/key-status', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setShellAvailable(data?.shell === true);
  } catch {
    // No sidecar — the shell stays unavailable.
  }
}

/**
 * Post a command and stream the response.
 *
 * The bridge answers newline-delimited JSON so output can be rendered as it is
 * produced. A chunk boundary can land mid-line, so the tail is held until its
 * newline arrives rather than being parsed as truncated JSON.
 */
export async function runShellViaBridge(
  command: string,
  onChunk: (line: OutputLine) => void,
  signal?: AbortSignal,
): Promise<{ exitCode: number }> {
  const res = await fetch('/api/shell', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command }),
    signal,
  });

  if (!res.ok) {
    let message = `Shell bridge returned ${res.status}.`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body; the status alone will have to do.
    }
    onChunk({ kind: 'err', text: message });
    return { exitCode: 1 };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onChunk({ kind: 'err', text: 'Shell bridge sent no body.' });
    return { exitCode: 1 };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let exitCode = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (!part.trim()) continue;
      try {
        const msg = JSON.parse(part);
        if (msg.kind === 'exit') exitCode = msg.code ?? 0;
        else onChunk({ kind: msg.kind === 'err' ? 'err' : 'out', text: msg.text ?? '' });
      } catch {
        // A malformed frame is not worth aborting a long-running command over.
        onChunk({ kind: 'out', text: part });
      }
    }
  }

  return { exitCode };
}
