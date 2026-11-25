// Bridge between the app's window and the main process. Exposes only the
// terminal's narrow API — the page never gets Node or ipcRenderer itself.
// (CommonJS because sandboxed preloads cannot be ES modules.)
//
// Ids are picked here and the listener is registered *before* the request is
// sent, so no message for a session or command can arrive unheard.

const { contextBridge, ipcRenderer } = require('electron');

let nextId = 1;

const ptyListeners = new Map();
ipcRenderer.on('pty:message', (_event, id, msg) => {
  const listener = ptyListeners.get(id);
  if (msg.type === 'exit') ptyListeners.delete(id);
  listener?.(msg);
});

const runs = new Map();
ipcRenderer.on('shell:chunk', (_event, id, line) => runs.get(id)?.onLine(line));
ipcRenderer.on('shell:done', (_event, id, code) => {
  const run = runs.get(id);
  runs.delete(id);
  run?.resolve(code);
});

contextBridge.exposeInMainWorld('atlasDesktop', {
  shellStatus: () => ipcRenderer.invoke('shell:status'),

  /** Open an interactive shell; `onMessage` gets {type:'ready'|'data'|'notice'|'exit'}. */
  async openShell(cols, rows, onMessage) {
    const id = nextId++;
    ptyListeners.set(id, onMessage);
    ipcRenderer.send('pty:open', id, cols, rows);
    return {
      write: data => ipcRenderer.send('pty:input', id, data),
      resize: (c, r) => ipcRenderer.send('pty:resize', id, c, r),
      close: () => {
        ptyListeners.delete(id);
        ipcRenderer.send('pty:close', id);
      },
    };
  },

  /**
   * Run one command; `onLine` gets {kind:'out'|'err', text}. `done` resolves
   * with the exit code; `abort()` kills the command.
   */
  startCommand(command, onLine) {
    const id = nextId++;
    const done = new Promise(resolve => runs.set(id, { onLine, resolve }));
    ipcRenderer.send('shell:run', id, command);
    return { done, abort: () => ipcRenderer.send('shell:abort', id) };
  },
});
