# CLAUDE.md

Guidance for working in this repo (Atlas — a dev environment that runs AI Dungeon
scripts locally, with a debug/trace UI).

## Consult the AI Dungeon docs for AID-specific behavior

A local copy of the AI Dungeon scripting docs lives at:

    src/components/atlas/AID-Docs/Aid-Doc's/

**Before implementing or verifying anything that depends on the AI Dungeon platform
contract, read the relevant doc there — do not rely on memory.** This includes:

- Scripting globals & hooks — `01-scripting/api/` (input/context/output modifiers,
  `state`, `info`, `history`, `storyCards`, the Story Card API).
- Story Cards — `01-scripting/api/story-cards-api.md` (e.g. `updateStoryCard(index,
  keys, entry, type) → void`: replaces the card, throws if the index is missing,
  bumps `updatedAt`).
- Context assembly order, memory system, scenarios — see the numbered folders and
  `index.md`.

If a needed doc is missing or ambiguous, say so and ask the user rather than
guessing at the platform behavior.

**You do NOT need to check the docs for ordinary JavaScript/TypeScript** (language
semantics, standard library, normal tooling) — only for AID-platform specifics.

## How scripts execute (important context)

- **The fixture** under `RPG ENGINE/` (`Library.js`, `Input.js`, `Context.js`,
  `Output.js`) is a backend test fixture — an AID scenario's script suite, not app
  code. `Library.js` is shared code concatenated ahead of each hook.
- **Execution** runs in a Web Worker via `eval` (`src/services/offlineSimulationService.ts`)
  in **sloppy mode** — the fixture relies on implicit globals that would throw under
  strict mode. Keep that in mind when writing/validating fixture code (prefer
  declaring variables with `let`/`const` anyway).
- **AID swallows script exceptions silently.** The app surfaces them: an uncaught
  throw becomes an `executionError` (engine halts, red in HeimdallPanel); an error a
  script catches and `console.error`s is collected into `scriptErrors` and shown as an
  amber warning. Never let a caught error vanish — `console.error` it (recoverable) or
  re-throw (fatal); never just `console.log` a swallowed crash.
- The Story Card globals come from one source of truth, `createStoryCardApi()` in
  `offlineSimulationService.ts`; the worker embeds it via `.toString()`. Change it
  there, not in a copy.
- **Story Card persistence:** script writes go to `worldState.storyCards` (carried
  turn to turn). Reflecting them in the **Story Cards view (Knowledge Base)** goes
  through `mergeScriptStoryCards`, which must be told which cards the script actually
  touched — `simulateStep` returns `changedStoryCardIds` for this. It appends new
  cards and updates changed ones, but leaves untouched cards as the user hand-edited
  them. (A script that updates an existing card — e.g. `updateStoryCard` / a
  `> setting: value` write — relies on this to show up.)

## Error locations

- The worker locates a failure from the **innermost** `userscript.js` stack frame,
  so a throw inside a Library function reports `script: 'Library'` + its line/column,
  with `calledFrom` = the hook line that called it. `hook` is only *which hook was
  running*. Don't reintroduce "skip Library frames" — it sends users to the wrong file.
- Every error surface (Heimdall, Sentinel, editor, Block Canvas) goes through
  `src/services/errors/problems.ts` (`Problem`: located + `explainError` text) and
  `ProblemCard`. Add new error sources there, not as ad-hoc strings.
- `src/test/nodeWorker.ts` runs the real worker under Vitest; use it to test
  anything about lines/columns.

## Context assembly

- `assembleContext` (`src/services/scriptingService.ts`) follows Latitude's
  published template (help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai);
  AI Instructions are the system prompt, not part of `text`. Its tests assert the
  exact string — change both together, and only on evidence from the official site
  or a Context Lab capture.
- `AID Probe/` is a script suite meant to run **inside real AI Dungeon** (not a
  fixture for Atlas). Keep it to conservative JS (no `?.`/`??`), never let it change
  `text` or throw. `src/services/contextLab.test.ts` runs it end to end.

## App shell (Electron)

- The app is an Electron desktop app. `electron/main.mjs` is the main process;
  Vite only bundles the React renderer (`npm run dev` = Vite dev server + Electron
  via `scripts/dev.mjs`; `npm run dist` = Windows installer via electron-builder).
- The renderer is sandboxed (no Node). Its only host API is `window.atlasDesktop`
  from `electron/preload.cjs`, used by `src/services/terminal/shellClient.ts` for
  the in-app terminal; shell sessions live in `electron/shell.mjs`.
- Renderer packages are `devDependencies` on purpose (Vite bundles them); only
  runtime deps of the main process belong in `dependencies`.

## Testing

- Tests use Vitest (`npx vitest run <path>`). Pipeline tests mock
  `offlineSimulationService` and run the fixture in-process; **use sloppy `(0, eval)`**
  in those mocks so implicit-global fixture code runs (direct `eval` in an ES-module
  test is strict and will throw).
- After fixture edits, validate all four files load: `new Function(fs.readFileSync(...))`.
- Typecheck with `npx tsc --noEmit -p tsconfig.app.json`.
