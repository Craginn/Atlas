# 🧭 AI Atlas


**AI Atlas** is an interactive storytelling and world-building IDE for creating AI-driven narrative simulations (e.g., for AI Dungeon). Edit executable JavaScript scripts, manage world state & knowledge base, run offline simulations, debug with logs & sentinel.

## 🚀 Features
- **Simulation Engine** - Core runtime for narrative simulations orchestrated by Director.
- **State Editor** - Edit WorldState with delta tracking.
- **AI Logic Editor / JS Code Editor** - Write/run JS for Library, Input/Context/Output modifiers (syntax highlighting via PrismJS).
- **Plot Essentials** - Configure AI behavior: Instructions, Plot Essentials, Story Summary, Author's Notes, Story Cards, Knowledge Base.
- **Robust Log Viewer / Heimdall Panel** - Real-time logs for narrative/code (scrolling, collapse long entries, JS highlighting; WIP: enhanced scroll/error retention).
- **Sentinel Debugger** - Script validation, syntax checking, execution tracing, error catching.
- **Settings View** - App configuration.

## 🛠 Tech Stack
### Core
- [React 18 + TypeScript](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui (Radix Primitives)](https://ui.shadcn.com/)

### UI/Components
- [Lucide React Icons](https://lucide.dev/)
- [Sonner Toasts](https://sonner.com/)
- [React Router 6](https://reactrouter.com/)

### Editor & Syntax
- [react-simple-code-editor](https://github.com/sorden/react-simple-code-editor)
- [PrismJS](https://prismjs.com/)

### Data/Charts
- [TanStack Query v5](https://tanstack.com/query)
- [Recharts](https://recharts.org/)
- [Zod Schemas](https://zod.dev/) + React Hook Form

### Utils
- class-variance-authority (CVA), clsx, tailwind-merge
- react-resizable-panels, vaul Drawer

## 📁 Project Structure
```
.
├── src/
│   ├── components/
│   │   └── atlas/          # Core IDE: SimulationEngine.tsx, Director.tsx, AILogicEditor.tsx, RobustLogViewer.tsx, HeimdallPanel.tsx, etc.
│   │   └── ui/             # shadcn/ui primitives (Button, Dialog, Tabs, etc.)
│   ├── services/           # aiService.ts, offlineSimulationService.ts, scriptingService.ts
│   ├── constants.ts        # WorldState, DEFAULT_SCRIPTS (Library/Input/etc.), KnowledgeBase initials
│   ├── hooks/              # use-mobile.tsx, use-toast.ts
│   ├── lib/utils.ts
│   └── pages/Index.tsx     # Router entry
├── package.json            # Deps & scripts
├── tailwind.config.ts
├── vite.config.ts
├── TODO.md                 # Current tasks
└── TODO_PLAN.md            # This plan progress
```

## 🎮 Quickstart
```bash
npm install
npm run dev
```
1. Open [http://localhost:5173](http://localhost:5173) (Vite's default dev port)
2. **Demo Flow**: Defaults load → Edit `Output Modifier` JS script → Click Director \"Start Simulation\" → View narrative in HeimdallPanel → Check RobustLogViewer for code/logs/errors → Use Sentinel for debug.

`npm run lint` | `npm run test` | `npm run build` | `npm run preview`

## 🏗️ Architecture
```
User Input → Input Modifier Script → Context Modifier → SimulationEngine (offlineService)
↓
KnowledgeBase + WorldState → AI Logic (instructions/plot) → Output Modifier → User Output
↓
Logs → RobustLogViewer/Heimdall | Debug → Sentinel | State → StateEditor
```
- **Director**: Orchestrates flow.
- **Services**: aiService (future online?), offlineSimulationService (current), scriptingService (JS exec).

## 📋 Current Status & Roadmap
- **WIP** (see [TODO.md](TODO.md)): RobustLogViewer - Per-entry scrolling, collapse long logs, toolbar toggles (auto-scroll), JS syntax highlighting (Prism), proper script error catching/retention.
- **On Hold**: Story tracking, in-house scripting calls.
- [TODO_PLAN.md](TODO_PLAN.md) for progress.

## 📸 Screenshots
*(Add via GitHub/Assets: IDE dashboard, log viewer w/ scroll/highlight, state editor)*

## 🤝 Contributing
1. Fork repo.
2. Create feature branch `blackboxai/your-feature`.
3. `npm run lint` & commit.
4. PR to `main`.

## 🚀 Deployment
```bash
npm run build
npm run preview  # http://localhost:4173
```
Or deploy Vite build to Vercel/Netlify/GHPages.

## 🖥 Terminal

The Terminal view is a real shell. Anything typed runs in it; a leading `/` runs
an Atlas command instead, operating on the scripts, world state and card deck the
app has open.

The same commands run from a real shell:

```bash
npm run cli                       # interactive session
npm run cli -- /scripts           # one-shot, for scripting and pipes
npm run cli -- /run "you draw a sword"
printf '/state hp 10\n/exit\n' | npm run cli
```

| Command | Does |
| --- | --- |
| `/help [cmd]` | List commands, or explain one |
| `/run <text>` | Run one simulation turn |
| `/scripts [--all]`, `/cat <s> [--lines]`, `/edit <s> "<code>"` | Read and edit scripts |
| `/state [key] [value]` | Show or set world state (dot-paths, JSON values) |
| `/cards`, `/card add\|show\|rm` | Story card deck |
| `/provider`, `/model`, `/keys`, `/doctor` | What's configured, and what's missing |

`/keys` and `/doctor` never print key values — only where a key came from.

### Running shell commands

The terminal is a shell. Anything typed without a leading slash runs in it:

```
atlas $ ls
atlas $ curl -fsSL https://claude.ai/install.sh | bash
atlas $ claude
```

Atlas's own commands keep the `/` prefix so they can never shadow a real binary
— `/state` is Atlas, `state` is whatever is on your PATH. A path is always
shell (`/usr/bin/env node` runs), and `/sh <cmd>` forces the shell for a name
that collides.

**In the CLI this works out of the box.** `npm run cli` hands the child process
your real terminal, so interactive programs — `claude`, `vim`, `top`, anything
that prompts or redraws — behave exactly as they would in your own shell.

The session is persistent: `cd` and `export` stick between commands, and the
prompt follows the working directory. It runs your `$SHELL` (not `/bin/sh`), and
the environment is seeded from a login shell so profile PATH additions like
`~/.local/bin` are visible — which is what lets a tool work immediately after
you install it:

```
atlas ~ $ curl -fsSL https://claude.ai/install.sh | bash
atlas ~ $ claude
```

When input is piped rather than typed, the banner and prompts are suppressed so
output stays parseable.

**In the browser it needs the bridge**, since a page has no shell of its own:

```bash
ATLAS_ENABLE_SHELL=1 npm run dev
```

That opens a persistent shell over a WebSocket, rendered with xterm.js, so
colour and cursor control work.

#### Keeping a noisy command out of the way

`/task <command>` runs something in its own box instead of the terminal stream:

```
atlas $ /task curl -fsSL https://claude.ai/install.sh | bash
  → task 1 finished (exit 0) — see the Tasks panel
```

The panel sits above the terminal with a fixed height and its own scroll, so a
few hundred lines of installer output can't push your history off screen. A task
that succeeds collapses itself; one that fails stays open, because that's the one
worth reading. Output is capped at 5,000 lines per task.

It runs in the same shell session, so anything it installs is on your PATH for
later commands. In the CLI there's no panel, so `/task` just runs inline.

#### Interactive programs in the browser need node-pty

Without a pseudo-terminal the shell reports `no job control` and interactive
programs won't run. `node-pty` provides one, but it is a native module needing
Python and a C++ toolchain, so it is an **optional** dependency — install fails
on machines without build tools, which is why it is not required:

```bash
npm install node-pty
```

The terminal shows `no pty` in its header and prints a notice when running
without one. The CLI never needs it.

#### Limits

- **Off by default.** Without `ATLAS_ENABLE_SHELL=1` neither endpoint is
  registered, and the dev server warns when they are.
- **Local callers only.** The dev server binds all interfaces so a phone can
  reach it, so both the HTTP bridge and the WebSocket reject non-local callers
  with 403 unless `ATLAS_SHELL_ALLOW_REMOTE=1`.
- **Never in production.** Both are dev-server plugins; the deployed sidecar
  (`server/index.mjs`) does not implement them.
- One-shot commands are killed after `ATLAS_SHELL_TIMEOUT_MS` (default 5 min).

## 🐞 Debug harness

**Settings → Debug** has a switch that loads the RPG script suite from
`Mock Script Test/` into the script slots — levels, XP, health, combat, spells —
so the engine runs against real scripts instead of empty ones.

- **ON** snapshots whatever is in the slots, then loads the fixture.
- **OFF** puts your snapshot back.

Flipping the switch cannot lose work. The snapshot records only the code the
toggle overwrites, so scripts you created afterwards are left alone rather than
deleted. If the snapshot is somehow missing, OFF says so and leaves the fixture
in place rather than guessing that "off" means "blank the slots".

The flag persists across reloads, and the tab shows its internal value. The
fixture is loaded lazily — `Library.js` alone is ~295KB, so it is a separate
chunk that only downloads when you actually switch this on.

### AI in the terminal

There is no built-in AI agent. Install whichever CLI agent you prefer and run it
inside the terminal — it brings its own authentication and its own agent loop,
which is less to go wrong than a second implementation living in this app.

The provider settings that remain are used only by `/run` (simulation turns),
not by anything conversational.

### Keeping your API key out of the browser

By default you paste a key into Settings and it lives in your browser's local
storage. That's the quickest way to get going, and it's fine for local use.

If you'd rather the key never touch the browser at all, put it in a `.env` file
instead:

```bash
cp .env.example .env
# edit .env, then:
npm run dev
```

```
ANTHROPIC_API_KEY=sk-ant-...
```

The dev server reads it in Node and attaches it as the request leaves the proxy,
so the key is never sent to the page, never stored in localStorage, and never
visible in dev tools. Settings will show that it's in use and stop asking for
one.

An env key takes precedence over anything typed into Settings. Set only the
provider(s) you actually use — the others keep working from the Settings box.
Restart the dev server after editing `.env`; it's read at startup.

### Serving a build with server-side keys

`npm run serve` runs a small dependency-free Node server that serves `dist/` and
proxies provider calls, applying keys from its own environment:

```bash
npm run build
ANTHROPIC_API_KEY=sk-ant-... PORT=8080 npm run serve
```

Same behaviour as the dev proxy: the key stays on the server, an env key
overrides anything a browser sent, and providers without one fall back to the
user's own key from Settings. The server reports which providers it holds keys
for at `/api/key-status` — names only, never values — so a build made in CI
without keys still shows the right thing once deployed to a host that has them.

### AI provider keys in production

Each user supplies their own API key, stored in their browser's local storage,
and every request is billed to that user's own provider account. The app never
holds a shared key.

In development, provider calls are routed through the Vite dev server's
`/api/*` proxy. A production build has no such proxy, so by default it calls the
vendor hosts **directly from the page** — which means the key is visible in
browser dev tools and reachability depends on each vendor's CORS policy.

For a shared deployment, run a proxy that mirrors those prefixes and point the
build at it:

```bash
VITE_API_PROXY=https://your-proxy.example.com npm run build
```

The proxy must forward:

| Prefix             | Upstream                                   |
| ------------------ | ------------------------------------------ |
| `/api/openai`      | `https://api.openai.com`                   |
| `/api/anthropic`   | `https://api.anthropic.com`                |
| `/api/gemini`      | `https://generativelanguage.googleapis.com` |
| `/api/openrouter`  | `https://openrouter.ai`                    |

See `vite.config.ts` for the dev-server equivalent.

## License
MIT

---

**Backup**: [README.backup.md](README.backup.md)
