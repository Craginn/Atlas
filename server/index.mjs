#!/usr/bin/env node
// Production sidecar: serves the built app and, optionally, the interactive
// shell terminal over a WebSocket.
//
// The app is offline-only — it never calls an AI provider — so this server holds
// no keys and proxies nothing. Deliberately dependency-free (node:http only).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from './api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT || 8080);

// Per-user workspace root. Backed by a persistent volume in the container so a
// user's files outlive the instance — Cloud Run restarts freely, and a shell
// whose work vanished on redeploy would be worse than no shell.
const WORKSPACE_ROOT = process.env.ATLAS_WORKSPACE_ROOT || '/workspace';

/**
 * Resolve (and create) the workspace for a session.
 *
 * `uid` comes off the query string, so it is untrusted: it is reduced to a
 * single safe path segment before being joined, and the result is re-checked
 * against the root. Without both steps a `uid` of `../../etc` would escape.
 */
function workspaceFor(uid) {
  const safe = String(uid || 'default').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64);
  const dir = path.join(WORKSPACE_ROOT, safe || 'default');
  if (!dir.startsWith(WORKSPACE_ROOT + path.sep) && dir !== WORKSPACE_ROOT) {
    return WORKSPACE_ROOT;
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Read-only or missing volume. Fall back to the root rather than refusing
    // the session — the shell is still useful, just not persistent.
    return WORKSPACE_ROOT;
  }
  return dir;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Serve a file from dist, falling back to index.html for client-side routes. */
function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(DIST, urlPath);

  // Containment check: a crafted path must not escape dist.
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Build not found — run `npm run build` first.');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

// The REST API (projects, scripts, world state, story cards, history,
// sentinel reports, settings) handles every /api/* path except the terminal's
// /api/shell-socket below. Storage is a plain JSON file tree under ATLAS_DATA_ROOT
// (default: ./data next to the repo).
const api = createApi();

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url.split('?')[0].startsWith('/api/')) {
    void api.handle(req, res);
    return;
  }

  serveStatic(req, res);
});

// The interactive terminal: a real shell over a WebSocket, same contract the dev
// server serves (see vite.config.ts). Mounted only when a token is configured or
// the caller is local — see handleShellSocket, which enforces both.
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://placeholder');
  if (url.pathname !== '/api/shell-socket') {
    socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    return;
  }
  const cwd = workspaceFor(url.searchParams.get('uid'));
  void import('./pty-bridge.mts').then(m =>
    m.handleShellSocket(req, socket, head, {
      cwd,
      env: { HOME: cwd, ATLAS_WORKSPACE: cwd },
    }),
  );
});

server.listen(PORT, () => {
  console.log(`Atlas serving ${DIST} on http://localhost:${PORT}`);
  console.log(
    process.env.ATLAS_SHELL_TOKEN
      ? `Terminal enabled at /api/shell-socket (token required), workspaces under ${WORKSPACE_ROOT}`
      : 'Terminal is local-only — set ATLAS_SHELL_TOKEN to allow remote sessions.',
  );
});
