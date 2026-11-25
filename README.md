# Aid Atlas

A desktop dev environment for writing, running and debugging AI Dungeon scripts
locally. Atlas runs your Library / Input / Context / Output modifiers the way AI
Dungeon does, shows you exactly what each hook did, and surfaces the errors AI
Dungeon would silently swallow. Fully offline: it never calls an AI provider.

## Features

| Area | What it does |
| --- | --- |
| **Simulation Engine** | Take turns against your scripts and watch the input → context → output pipeline run. |
| **State Editor** | Each top-level `state` key in its own box, with search, sorting and a jump list of what the last turn changed; plus raw JSON, per-hook deltas and history. |
| **JS Code Editor** | The four script slots, with depth-coloured brackets, indent guides, a scope breadcrumb (`modifier() › if › forEach callback()`), AID globals highlighted, and live diagnostics. |
| **Block Canvas** | Build or read scripts as visual blocks that round-trip to JavaScript. |
| **Plot Essentials** | AI Instructions, Plot Essentials, Story Summary and Author's Note. |
| **Story Cards** | The card deck, including cards your scripts create or update. |
| **AID Docs** | A local copy of the AI Dungeon scripting and platform docs. |
| **Context Lab** | Import captures from real AI Dungeon (via the `AID Probe/` scripts), see the real context split into its sections, and diff it against what Atlas assembles. |
| **Sentinel Debugger** | Syntax checks, execution traces and per-hook error reporting. |
| **Heimdall panel** | Logs, code logs and errors for each turn — uncaught throws in red, caught-and-logged errors in amber. |

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
script is needed. (The installer is unsigned, so Windows SmartScreen will warn
the first time.)

If `npm run dev` reports that Electron failed to install, run
`node node_modules/electron/install.js` once — newer npm versions can block
Electron's download step.

Other scripts: `npm test` · `npm run lint` · `npm run typecheck`.

## How scripts run

Each hook runs in a Web Worker, in sloppy mode like AI Dungeon, with `Library.js`
concatenated ahead of it. The Story Card globals (`addStoryCard`,
`updateStoryCard`, …) behave per the AI Dungeon Story Card API, and cards a
script touches are carried turn to turn and reflected in the Story Cards view.

## Checking Atlas against real AI Dungeon

Atlas assembles the context a Context Modifier receives using the layout
Latitude publishes (`World Lore:`, `Story Summary:`, `Memories:`,
`Recent Story:`, `[Author's note: …]`; AI Instructions go out as the system
prompt). To verify that against the live platform:

1. Paste the four files from `AID Probe/` into a throwaway AI Dungeon scenario
   (or use the copy buttons in **Context Lab → How to capture**).
2. Play a few turns, then export the scenario's story cards.
3. Import the JSON in **Context Lab**. Each captured turn shows the real
   context, `info`, and history shape, and a line diff against Atlas's rebuild
   of the same turn.

## Project layout

```
electron/              Electron main process, preload bridge, shell sessions
scripts/dev.mjs        Launches Vite + Electron for `npm run dev` / `npm start`
src/                   The React app (renderer), bundled by Vite
  components/atlas/    The IDE views; AID-Docs/ holds the bundled docs
  services/            Script execution, story cards, terminal commands
RPG ENGINE/            Script-suite fixture loaded by Settings → Debug
AID Probe/             Capture scripts to run inside real AI Dungeon (Context Lab)
docs-source/           Raw scrape of help.aidungeon.com, used to update AID-Docs
```

Vite is only the bundler: it compiles the React/TypeScript app into `dist/`,
which Electron serves over a private `atlas://` scheme.

## Updating the AI Dungeon docs

The **AID Docs** tab bundles every `.md` file under
`src/components/atlas/AID-Docs/`. To refresh them, compare against the raw
pages in `docs-source/help.aidungeon.com/` (each file records its source URL and
scrape date) and edit the curated docs. Don't put raw pages inside `AID-Docs/` —
anything there ships in the app.

## Terminal

The terminal view is a real shell (PowerShell on Windows) running in Electron's
main process, reached only by the app's own window over IPC — no network port
is opened. A leading `/` runs an Atlas command instead (`/help` lists them);
`/task <cmd>` runs a command in the Tasks panel. *The Terminal tab is currently
hidden from the menu (see `src/pages/Index.tsx`).*

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
