import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_SHELL, runCommand, startShell } from './shell.mjs';

// Electron entry point. The renderer is the same React app Vite builds; in
// production it is served from dist/ over a private `atlas://` scheme (so it gets
// a stable origin — localStorage survives restarts — and client-side routes work),
// and in development it is loaded from the Vite dev server for hot reload.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const APP_ORIGIN = 'atlas://app';

// The in-app terminal can run commands on this machine. It is reachable only by
// this app's window over IPC (no port is opened). Set ATLAS_ENABLE_SHELL=0 to
// turn it off entirely.
const SHELL_ENABLED = process.env.ATLAS_ENABLE_SHELL !== '0';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'atlas',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

/** Serve a file from dist, falling back to index.html for client-side routes. */
function serveDist(request) {
  const { pathname } = new URL(request.url);
  let filePath = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
  // Containment check: a crafted path must not escape dist.
  if (!filePath.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  return net.fetch(pathToFileURL(filePath).toString());
}

function isAppUrl(url) {
  return DEV_URL ? url.startsWith(DEV_URL) : url.startsWith(APP_ORIGIN);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0c0c0f',
    title: 'Aid Atlas',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Links to the outside world open in the user's browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  void win.loadURL(DEV_URL || `${APP_ORIGIN}/`);
}

// ------------------------------------------------------------------ terminal IPC

/** Only the app's own pages may drive the shell. */
function trusted(event) {
  return SHELL_ENABLED && isAppUrl(event.senderFrame?.url ?? '');
}

// Ids are chosen by the renderer, which registers its listener for an id before
// asking for the session. Everything for a session or command then travels over
// one `webContents.send` channel, which is ordered — unlike the reply to an
// `invoke`, which can overtake messages sent before it.

/** Live interactive shells and one-shot commands, keyed by window + renderer id. */
const sessions = new Map();
const running = new Map();
const keyOf = (sender, id) => `${sender.id}:${id}`;

function registerShellIpc() {
  ipcMain.handle('shell:status', event => ({ shell: trusted(event) }));

  ipcMain.on('pty:open', async (event, id, cols, rows) => {
    const sender = event.sender;
    const send = msg => {
      if (!sender.isDestroyed()) sender.send('pty:message', id, msg);
    };
    if (!trusted(event)) {
      send({ type: 'exit', exitCode: 1 });
      return;
    }

    const key = keyOf(sender, id);
    const { io, mode } = await startShell(cols || 80, rows || 24);
    sessions.set(key, io);
    send({ type: 'ready', mode, shell: DEFAULT_SHELL });
    if (mode === 'pipe') {
      send({
        type: 'notice',
        text:
          'Running without a pseudo-terminal — node-pty did not load, so interactive ' +
          'programs (claude, vim, top) will not work here.',
      });
    }
    io.onData(data => send({ type: 'data', data }));
    io.onExit(({ exitCode }) => {
      sessions.delete(key);
      send({ type: 'exit', exitCode });
    });

    // Never leave an orphaned shell behind when the window goes away.
    sender.once('destroyed', () => {
      sessions.get(key)?.kill();
      sessions.delete(key);
    });
  });

  ipcMain.on('pty:input', (event, id, data) => {
    if (trusted(event)) sessions.get(keyOf(event.sender, id))?.write(String(data));
  });
  ipcMain.on('pty:resize', (event, id, cols, rows) => {
    if (trusted(event)) sessions.get(keyOf(event.sender, id))?.resize(cols, rows);
  });
  ipcMain.on('pty:close', (event, id) => {
    const key = keyOf(event.sender, id);
    sessions.get(key)?.kill();
    sessions.delete(key);
  });

  // One-shot commands (/sh, /task): 'shell:chunk' per line, then 'shell:done'.
  ipcMain.on('shell:run', async (event, id, command) => {
    const sender = event.sender;
    const send = (channel, payload) => {
      if (!sender.isDestroyed()) sender.send(channel, id, payload);
    };
    if (!trusted(event)) {
      send('shell:chunk', { kind: 'err', text: 'Shell disabled.' });
      send('shell:done', 1);
      return;
    }

    const key = keyOf(sender, id);
    console.log(`[shell] ${command}`);
    const job = runCommand(String(command), (kind, text) => send('shell:chunk', { kind, text }));
    running.set(key, job);
    sender.once('destroyed', job.kill);
    const code = await job.done;
    running.delete(key);
    send('shell:done', code);
  });
  ipcMain.on('shell:abort', (event, id) => {
    running.get(keyOf(event.sender, id))?.kill();
  });
}

// ------------------------------------------------------------------ lifecycle

app.whenReady().then(() => {
  protocol.handle('atlas', serveDist);
  registerShellIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  for (const io of sessions.values()) io.kill();
  if (process.platform !== 'darwin') app.quit();
});
