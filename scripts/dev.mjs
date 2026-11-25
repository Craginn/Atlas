// Launches the app in Electron.
//
//   node scripts/dev.mjs          `npm run dev`: start the Vite dev server (hot
//                                 reload) and point the Electron window at it.
//   node scripts/dev.mjs --built  `npm start`: run the already-built dist/.
//
// Closing the window stops everything.

import { spawn } from 'node:child_process';
import electronPath from 'electron';

const built = process.argv.includes('--built');
const env = { ...process.env };
// Set by VS Code (and some other Electron-based hosts) for their child shells;
// it would make Electron start as plain Node and never open a window.
delete env.ELECTRON_RUN_AS_NODE;

let server = null;
if (!built) {
  const { createServer } = await import('vite');
  server = await createServer();
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) {
    console.error('Vite dev server did not report a URL.');
    process.exit(1);
  }
  env.VITE_DEV_SERVER_URL = url;
}

const child = spawn(electronPath, ['.', ...process.argv.slice(2).filter(a => a !== '--built')], {
  stdio: 'inherit',
  env,
});

child.on('exit', async code => {
  await server?.close();
  process.exit(code ?? 0);
});
