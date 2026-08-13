# Atlas — browser terminal backed by a real Linux shell with Claude Code installed.
#
# Two stages so the runtime image doesn't carry the toolchain: the builder needs
# a C++ compiler (node-pty is a native module) and the full dev dependency tree
# to run `vite build`, neither of which should ship to production.

# ---------------------------------------------------------------- build stage
FROM node:24-bookworm AS build

WORKDIR /app

# python3/make/g++ are node-pty's build requirements. Without them `npm ci`
# silently skips it (it is an optionalDependency) and the terminal degrades to
# pipe mode, where `claude` and every other interactive program refuses to run.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy manifests first so the dependency layer caches independently of source
# edits — otherwise every source change reinstalls the whole tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Reinstall production-only, keeping the compiled node-pty binding. `npm ci
# --omit=dev` rebuilds node_modules from scratch, so this runs after the app
# build rather than before it.
RUN npm ci --omit=dev

# -------------------------------------------------------------- runtime stage
FROM node:24-bookworm-slim AS runtime

# git and ca-certificates are what a coding shell actually needs; procps/less
# make the terminal usable (top, git's pager). curl is here for the healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git ca-certificates procps less curl \
 && rm -rf /var/lib/apt/lists/*

# Claude Code, baked in at image build time. Installing it per session would add
# a minute of npm latency to every cold start and would fail outright whenever
# the sandbox has restricted egress.
RUN npm install -g @anthropic-ai/claude-code \
 && claude --version

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json

# Persistent volume mount point. Declared so the directory exists and is owned
# by the runtime user even when no volume is attached.
RUN mkdir -p /workspace && chown -R node:node /workspace /app

# Never run the shell as root. A user with a real shell is running arbitrary
# code by design, so the blast radius should not include the container itself.
USER node

ENV NODE_ENV=production \
    PORT=8080 \
    ATLAS_WORKSPACE_ROOT=/workspace \
    ATLAS_SHELL=/bin/bash \
    ATLAS_SHELL_ALLOW_REMOTE=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD curl -fsS "http://localhost:${PORT}/" >/dev/null || exit 1

# --experimental-strip-types lets the server import server/*.mts directly, with
# no compile step. Node 24 strips types by default and treats the flag as a
# no-op; the flag keeps `npm run serve` working on Node 22.6+ too.
CMD ["node", "--experimental-strip-types", "server/index.mjs"]
