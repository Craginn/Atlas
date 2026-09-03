# Base44 Dev Environment — AI Atlas

## What this is
A Vite + React 18 + TypeScript single-page app ("AI Atlas") — an interactive
storytelling/world-building IDE for AI Dungeon-style narrative simulations.
**Offline-only**: no database, no backend API, no external services, no secrets.

## How it runs here
- `docker-compose.base44.yml` — single `web` service on `node:22-bookworm-slim`.
- Source is bind-mounted at `/app`; `node_modules` lives in a named volume.
- Dev command: `npm install && npm run dev -- --host 0.0.0.0`
- Vite dev server on container port 5173, mapped to host port **3000**.
- Live reload is active — frontend edits appear in the preview without restart.

## History: --legacy-peer-deps (no longer needed)
This project previously required `--legacy-peer-deps` because an unused
devDependency, `@vitejs/plugin-react-swc@3.11.0`, declares a peer range of
`vite@^4||^5||^6||^7` while the project pins `vite@^8`. That dependency has
been removed (`vite.config.ts` uses `@vitejs/plugin-react` instead), so
plain `npm install` resolves cleanly. Do not re-add `@vitejs/plugin-react-swc`
at a version older than 4.x; if SWC is ever wanted, `@vitejs/plugin-react-swc@^4`
declares `vite@^8` support.

## Vite config change for the preview
`vite.config.ts` has `server.allowedHosts: true` so the preview's external
hostname (served through a proxy that changes per environment) is accepted.
Without it Vite blocks the request with "Blocked request from ... not allowed."

## No secrets
The `.env.example` lists optional AI provider keys (OPENAI, ANTHROPIC, etc.),
but the app runs fully offline — it never calls an AI provider. No secrets are
needed to boot or use the app.

## Verifying it works
```bash
docker compose -f docker-compose.base44.yml ps          # should show "healthy"
curl -sf http://localhost:3000/                         # should return the HTML
curl -sf -H "Host: external-preview.example.com" http://localhost:3000/  # external host
```

## Useful commands
```bash
docker compose -f docker-compose.base44.yml logs -f web  # tail dev server
docker compose -f docker-compose.base44.yml restart web # after compose/config changes
```
