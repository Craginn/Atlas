// REST API for the app's artifacts. Mounted under /api/ by server/index.mjs
// (same origin as the built frontend) and usable standalone via createApi().
// The server is deliberately thin: it stores and returns data — it never
// interprets or executes any of it. The scripting engine stays client-side by
// design; this is the persistence layer only.
//
// Endpoints (JSON in/out):
//   GET    /api/health
//   GET    /api/key-status
//   GET    /api/projects                       list project summaries
//   POST   /api/projects                       {name, ...optional seed artifacts}
//   POST   /api/projects/import                {snapshot} | snapshot
//   GET    /api/projects/:id                    full project (meta + all artifacts)
//   PUT    /api/projects/:id                    {name} rename
//   DELETE /api/projects/:id
//   GET/PUT  /api/projects/:id/world-state      singleton: read/replace
//   GET/PUT  /api/projects/:id/knowledge        singleton: read/replace
//   GET/PUT  /api/projects/:id/settings         singleton: read/replace
//   GET/POST          /api/projects/:id/scripts[/:scriptId]
//   PUT/DELETE        /api/projects/:id/scripts/:scriptId
//   GET/POST          /api/projects/:id/story-cards[/:cardId]
//   PUT/DELETE        /api/projects/:id/story-cards/:cardId
//   GET/POST/DELETE   /api/projects/:id/history   (DELETE clears; :index removes one)
//   GET/POST          /api/projects/:id/sentinel-reports[/:reportId]
//   DELETE            /api/projects/:id/sentinel-reports[/:reportId]
//   GET    /api/projects/:id/export             full snapshot download

import http from 'node:http';
import { createRouter } from './lib/router.mjs';
import { newId, COLLECTIONS, createStore } from './lib/store.mjs';
import { HttpError, allowCrossOrigin, readJsonBody, sendJson } from './lib/http.mjs';

// Allowed values mirror the app's StoryCard and HistoryEntry types.
const STORY_CARD_TYPES = ['Character', 'Location', 'Faction', 'Class', 'Custom', 'Race'];
const HISTORY_TYPES = ['start', 'continue', 'do', 'say', 'story'];

function nowIso() {
  return new Date().toISOString();
}

// ── validation helpers ─────────────────────────────────────────────────────

function requireObject(body, what = 'Request body') {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, `${what} must be a JSON object.`);
  }
  return body;
}

function str(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function requireString(body, key) {
  const value = body?.[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `'${key}' is required and must be a non-empty string.`);
  }
  return value;
}

// ── per-collection create/patch logic ───────────────────────────────────────

const createScript = (body) => ({
  id: newId(),
  name: requireString(body, 'name'),
  trigger: str(body.trigger),
  description: str(body.description),
  code: str(body.code),
  active: body.active !== false,
  lastModified: nowIso(),
});

const patchScript = (existing, body) => ({
  ...existing,
  ...(body.name !== undefined ? { name: requireString(body, 'name') } : {}),
  ...(body.trigger !== undefined ? { trigger: str(body.trigger) } : {}),
  ...(body.description !== undefined ? { description: str(body.description) } : {}),
  ...(body.code !== undefined ? { code: str(body.code) } : {}),
  ...(body.active !== undefined ? { active: body.active !== false } : {}),
  lastModified: nowIso(),
});

const createStoryCard = (body) => ({
  id: newId(),
  title: requireString(body, 'title'),
  content: str(body.content),
  keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : [],
  type: STORY_CARD_TYPES.includes(body.type) ? body.type : 'Custom',
  notes: str(body.notes),
});

const patchStoryCard = (existing, body) => ({
  ...existing,
  ...(body.title !== undefined ? { title: requireString(body, 'title') } : {}),
  ...(body.content !== undefined ? { content: str(body.content) } : {}),
  ...(body.keywords !== undefined ? { keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : [] } : {}),
  ...(body.type !== undefined ? { type: STORY_CARD_TYPES.includes(body.type) ? body.type : existing.type } : {}),
  ...(body.notes !== undefined ? { notes: str(body.notes) } : {}),
});

// History entries keep the exact shape the app's `history` global expects.
// AID's entries carry no id, so deletion is index-based.
const createHistoryEntry = (body) => {
  const text = requireString(body, 'text');
  const type = HISTORY_TYPES.includes(body.type) ? body.type : 'story';
  return {
    text,
    type,
    rawText: typeof body.rawText === 'string' ? body.rawText : text,
    ...(typeof body.turn === 'number' ? { turn: body.turn } : {}),
  };
};

// Sentinel reports are stored as-given, tagged with id + timestamp.
const createSentinelReport = (body) => ({
  ...requireObject(body, 'Report'),
  id: newId(),
  createdAt: nowIso(),
});

const COLLECTION_ROUTES = {
  scripts: { param: 'scriptId', create: createScript, patch: patchScript },
  'story-cards': { param: 'cardId', create: createStoryCard, patch: patchStoryCard },
  'sentinel-reports': { param: 'reportId', create: createSentinelReport, patch: (existing, body) => ({ ...existing, ...requireObject(body) }) },
  // history is index-addressed and append-only; registered separately below.
};

function registerCollection(router, store, name) {
  const { param, create, patch } = COLLECTION_ROUTES[name];
  const base = `/api/projects/:id/${name}`;

  const guard = (id) => {
    if (!store.exists(id)) throw new HttpError(404, `No project with id '${id}'.`);
  };

  router.get(base, (req, res, { id }) => {
    guard(id);
    sendJson(res, 200, store.readCollection(id, name));
  });

  router.post(base, async (req, res, { id }) => {
    guard(id);
    const body = requireObject(await readJsonBody(req));
    const item = create(body);
    const items = store.readCollection(id, name);
    items.push(item);
    store.writeCollection(id, name, items);
    sendJson(res, 201, item);
  });

  router.get(`${base}/:${param}`, (req, res, { id, [param]: itemId }) => {
    guard(id);
    const item = store.readCollection(id, name).find((i) => i.id === itemId);
    if (!item) throw new HttpError(404, `No ${name} item with id '${itemId}'.`);
    sendJson(res, 200, item);
  });

  router.put(`${base}/:${param}`, async (req, res, { id, [param]: itemId }) => {
    guard(id);
    const body = requireObject(await readJsonBody(req));
    const items = store.readCollection(id, name);
    const index = items.findIndex((i) => i.id === itemId);
    if (index === -1) throw new HttpError(404, `No ${name} item with id '${itemId}'.`);
    items[index] = patch(items[index], body);
    store.writeCollection(id, name, items);
    sendJson(res, 200, items[index]);
  });

  router.delete(`${base}/:${param}`, (req, res, { id, [param]: itemId }) => {
    guard(id);
    const items = store.readCollection(id, name);
    const remaining = items.filter((i) => i.id !== itemId);
    if (remaining.length === items.length) {
      throw new HttpError(404, `No ${name} item with id '${itemId}'.`);
    }
    store.writeCollection(id, name, remaining);
    sendJson(res, 204, null);
  });
}

// ── API assembly ────────────────────────────────────────────────────────────

export function createApi({ dataRoot } = {}) {
  const store = createStore(dataRoot);
  const router = createRouter();
  return finish(store, router);
}

function finish(store, router) {
  const guard = (id) => {
    if (!store.exists(id)) throw new HttpError(404, `No project with id '${id}'.`);
  };

  router.get('/api/health', (_req, res) => {
    sendJson(res, 200, {
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      projects: store.listProjects().length,
    });
  });

  // Whether the interactive terminal is reachable here. The client reads only
  // this flag; the path is kept as /api/key-status so the dev server and this
  // server answer alike.
  router.get('/api/key-status', (_req, res) => {
    sendJson(res, 200, { shell: Boolean(process.env.ATLAS_SHELL_TOKEN) });
  });

  // ── projects ──────────────────────────────────────────────────────────

  router.get('/api/projects', (_req, res) => {
    sendJson(res, 200, store.listProjects());
  });

  router.post('/api/projects/import', async (req, res) => {
    const body = requireObject(await readJsonBody(req));
    // Accept either {snapshot: {...}} or the snapshot itself.
    const snapshot = body.snapshot ?? body;
    requireObject(snapshot, 'Snapshot');
    const meta = store.importSnapshot(snapshot, body.name);
    sendJson(res, 201, meta);
  });

  router.post('/api/projects', async (req, res) => {
    const body = requireObject(await readJsonBody(req));
    const name = requireString(body, 'name');
    const meta = store.createProject({ ...body, name });
    sendJson(res, 201, meta);
  });

  router.get('/api/projects/:id', (req, res, { id }) => {
    guard(id);
    const snapshot = store.exportSnapshot(id);
    sendJson(res, 200, snapshot);
  });

  router.put('/api/projects/:id', async (req, res, { id }) => {
    guard(id);
    const body = requireObject(await readJsonBody(req));
    const meta = store.updateMeta(id, body);
    sendJson(res, 200, meta);
  });

  router.delete('/api/projects/:id', (req, res, { id }) => {
    guard(id);
    store.deleteProject(id);
    sendJson(res, 204, null);
  });

  router.get('/api/projects/:id/export', (req, res, { id }) => {
    guard(id);
    sendJson(res, 200, store.exportSnapshot(id));
  });

  // ── singleton artifacts ───────────────────────────────────────────────

  for (const singleton of ['world-state', 'knowledge', 'settings']) {
    const route = `/api/projects/:id/${singleton}`;
    router.get(route, (req, res, { id }) => {
      guard(id);
      sendJson(res, 200, store.readSingleton(id, singleton));
    });
    router.put(route, async (req, res, { id }) => {
      guard(id);
      const body = requireObject(await readJsonBody(req));
      store.writeSingleton(id, singleton, body);
      sendJson(res, 200, body);
    });
  }

  // ── item collections ──────────────────────────────────────────────────

  for (const name of COLLECTIONS) {
    if (name === 'history') continue;
    registerCollection(router, store, name);
  }

  // History: append-only entries, index-based removal (AID entries have no id).
  router.get('/api/projects/:id/history', (req, res, { id }) => {
    guard(id);
    sendJson(res, 200, store.readCollection(id, 'history'));
  });

  router.post('/api/projects/:id/history', async (req, res, { id }) => {
    guard(id);
    const body = requireObject(await readJsonBody(req));
    const entries = store.readCollection(id, 'history');
    entries.push(createHistoryEntry(body));
    store.writeCollection(id, 'history', entries);
    sendJson(res, 201, entries[entries.length - 1]);
  });

  router.delete('/api/projects/:id/history', (req, res, { id }) => {
    guard(id);
    store.writeCollection(id, 'history', []);
    sendJson(res, 204, null);
  });

  router.delete('/api/projects/:id/history/:index', (req, res, { id, index }) => {
    guard(id);
    const entries = store.readCollection(id, 'history');
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= entries.length) {
      throw new HttpError(404, `No history entry at index '${index}'.`);
    }
    entries.splice(i, 1);
    store.writeCollection(id, 'history', entries);
    sendJson(res, 204, null);
  });

  return {
    store,

    /** Handle one API request; always responds (404/400/500 as JSON errors). */
    async handle(req, res) {
      allowCrossOrigin(res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      try {
        const matched = await router.handle(req, res);
        if (!matched) {
          throw new HttpError(404, `No route for ${req.method} ${req.url.split('?')[0]}.`);
        }
      } catch (err) {
        const status = err instanceof HttpError ? err.status : 500;
        if (status === 500) console.error(err);
        if (!res.headersSent) sendJson(res, status, { error: err.message || 'Internal server error.' });
      }
    },
  };
}

// Convenience for tests and embedding: a bare http server serving only the API.
export function createApiServer({ dataRoot } = {}) {
  const api = createApi({ dataRoot });
  const server = http.createServer((req, res) => {
    void api.handle(req, res);
  });
  server.api = api;
  return server;
}
