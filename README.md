# Aid Atlas

A desktop dev environment for writing, running and debugging AI Dungeon scripts
locally — Library / Input / Context / Output modifiers, world state, story cards,
execution traces and a built-in terminal. Fully offline: it never calls an AI
provider.

## Running it

Requires [Node.js](https://nodejs.org/) 20+.

```bash
npm install
npm run dev      # Electron window with hot reload (Vite dev server behind it)
npm start        # build, then run the built app in Electron
npm run dist     # build a Windows installer into release/
```

`npm run dist` produces `release/Aid Atlas Setup <version>.exe`. Installing it
adds Start-menu and desktop shortcuts, so after that no terminal or launcher
script is needed.

Other scripts: `npm test` · `npm run lint` · `npm run typecheck`.

## Layout

```
electron/        Electron main process, preload bridge, shell sessions
scripts/dev.mjs  Starts Vite + Electron together for `npm run dev`
src/             The React app (renderer), bundled by Vite
RPG ENGINE/      Script-suite fixture loaded by Settings → Debug
```

Vite is only the bundler: it compiles the React/TypeScript app into `dist/`,
which Electron serves over a private `atlas://` scheme.

## Terminal

The Terminal view is a real shell (PowerShell on Windows) running in Electron's
main process, reached only by the app's own window over IPC — no network port
is opened. A leading `/` runs an Atlas command instead (`/help` lists them);
`/task <cmd>` runs a command in the Tasks panel.

- Interactive programs need a pseudo-terminal from `node-pty` (an optional
  dependency). Without it the header shows `no pty` and the shell runs on
  plain pipes.
- Set `ATLAS_ENABLE_SHELL=0` to turn shell access off entirely.
- One-shot commands are killed after `ATLAS_SHELL_TIMEOUT_MS` (default 5 min).

## Debug harness

**Settings → Debug** loads the RPG script suite from `RPG ENGINE/` into the
script slots. ON snapshots your current scripts first; OFF restores them.

## License

MIT
