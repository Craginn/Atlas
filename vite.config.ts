import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
// The app runs offline: it never calls an AI provider, so there is no provider
// proxy and no API keys to inject. The only server-side surface left is the
// optional shell bridge for the in-app terminal (dev-only, opt-in).

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      {
        // Reports whether the in-app terminal's /sh can do anything here. Kept at
        // /api/key-status so the production sidecar (server/index.mjs) and the dev
        // server answer on one path; the client reads only the `shell` flag.
        name: 'atlas-shell-status',
        configureServer(server) {
          server.middlewares.use('/api/key-status', (_req, res) => {
            res.setHeader('content-type', 'application/json');
            res.setHeader('cache-control', 'no-store');
            res.end(
              JSON.stringify({ shell: process.env.ATLAS_ENABLE_SHELL === '1' }),
            );
          });
        },
      },
      {
        // Shell bridge for the in-app terminal. Dev-only by construction —
        // configureServer never runs for a production build, and the sidecar
        // (server/index.mjs) deliberately does not implement this endpoint.
        name: 'atlas-shell',
        configureServer(server) {
          if (process.env.ATLAS_ENABLE_SHELL !== '1') return;
          console.log(
            '\n  \x1b[33m⚠ Shell bridge enabled\x1b[0m — the app can run commands on this machine.',
          );

          // One-shot commands, for scripted use and the fallback path.
          server.middlewares.use('/api/shell', (req, res) => {
            void import('./server/shell-bridge.mts').then(m => m.handleShell(req, res));
          });

          // The interactive terminal: a persistent shell over a WebSocket.
          // Vite's own HMR socket also lives on this server, so only our path
          // may be claimed here — anything else must fall through untouched.
          server.httpServer?.on('upgrade', (req, socket, head) => {
            if (!req.url?.startsWith('/api/shell-socket')) return;
            void import('./server/pty-bridge.mts').then(m =>
              m.handleShellSocket(req, socket as never, head),
            );
          });

          void import('./server/pty-bridge.mts').then(async m => {
            const mode = await m.shellMode();
            if (mode === 'pipe') {
              console.log(
                '  \x1b[33m→ no pseudo-terminal\x1b[0m (node-pty not installed) — interactive ' +
                  'programs will not work in the browser terminal.',
              );
            }
          });
        },
      },
    ],
    server: {
      // Listen on all interfaces so the app is reachable from a phone on the
      // same network for mobile testing.
      host: true,
      // Allow the preview's external hostname (served through a proxy that
      // changes whenever the environment is recreated).
      allowedHosts: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Pre-bundle these CJS deps so Vite's dev-mode ESM interop is consistent.
    // Without this, `import Editor from 'react-simple-code-editor'` could resolve
    // to a namespace object instead of the component under dev, causing React's
    // "Element type is invalid ... got: object" crash in the editors.
    optimizeDeps: {
      include: ['react-simple-code-editor', 'prismjs'],
    },
  };
})
