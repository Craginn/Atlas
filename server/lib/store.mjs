// File-backed persistence for the REST API. Deliberately dependency-free and
// human-inspectable: one JSON file per artifact collection under
// <dataRoot>/projects/<projectId>/. Writes are atomic (temp file + rename) so
// a crash mid-write can never corrupt an artifact. All operations are
// synchronous — this is a local, single-user server.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Array collections inside a project: full REST CRUD on items.
export const COLLECTIONS = ['scripts', 'story-cards', 'history', 'sentinel-reports'];
// Single JSON objects inside a project: read/replace only.
export const SINGLETONS = ['world-state', 'knowledge', 'settings'];

// Map collection file names to the keys used in seeds/snapshots.
const SEED_KEYS = {
  scripts: 'scripts',
  'story-cards': 'storyCards',
  history: 'history',
  'sentinel-reports': 'sentinelReports',
};

// Matches the app's KnowledgeBase shape so a fresh project opens with sensible
// values instead of nulls everywhere.
const DEFAULT_KNOWLEDGE = {
  aiInstructions: '',
  plotEssentials: '',
  storyCards: [],
  storySummary: '',
  memoryBank: '',
  recentHistory: '',
  authorsNote: '',
};

export function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function createStore(dataRoot) {
  const root = dataRoot
    ? path.resolve(dataRoot)
    : process.env.ATLAS_DATA_ROOT
      ? path.resolve(process.env.ATLAS_DATA_ROOT)
      : path.resolve(__dirname, '..', 'data');
  const projectsDir = path.join(root, 'projects');

  // IDs come off the URL, so restrict them to safe filename characters before
  // they are ever joined into a path.
  function validId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
  }

  function projectDir(id) {
    if (!validId(id)) throw new Error(`Invalid project id '${id}'.`);
    return path.join(projectsDir, id);
  }

  function metaPath(id) {
    return path.join(projectDir(id), 'meta.json');
  }

  /** Returns the project's meta, or null when it does not exist. */
  function readMeta(id) {
    if (!validId(id)) return null;
    return readJson(metaPath(id), null);
  }

  function touch(id) {
    const meta = readJson(metaPath(id), null);
    if (!meta) return;
    meta.updatedAt = nowIso();
    writeJsonAtomic(metaPath(id), meta);
  }

  const store = {
    root,

    listProjects() {
      if (!fs.existsSync(projectsDir)) return [];
      return fs
        .readdirSync(projectsDir)
        .map((id) => readMeta(id))
        .filter(Boolean)
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    },

    exists(id) {
      return readMeta(id) !== null;
    },

    getMeta(id) {
      return readMeta(id);
    },

    /** Create a project; `seed` may carry initial artifacts (see SEED_KEYS). */
    createProject(seed = {}) {
      const id = newId();
      const dir = projectDir(id);
      fs.mkdirSync(dir, { recursive: true });
      const meta = {
        id,
        name: seed.name || 'Untitled Project',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      writeJsonAtomic(path.join(dir, 'meta.json'), meta);
      writeJsonAtomic(path.join(dir, 'world-state.json'), seed.worldState ?? {});
      writeJsonAtomic(path.join(dir, 'knowledge.json'), seed.knowledge ?? { ...DEFAULT_KNOWLEDGE });
      writeJsonAtomic(path.join(dir, 'settings.json'), seed.settings ?? {});
      for (const collection of COLLECTIONS) {
        const seedKey = SEED_KEYS[collection];
        const items = Array.isArray(seed[seedKey]) ? seed[seedKey] : [];
        writeJsonAtomic(path.join(dir, `${collection}.json`), items);
      }
      return meta;
    },

    /** Rename a project (the only mutable meta field). */
    updateMeta(id, patch = {}) {
      const meta = readMeta(id);
      if (!meta) return null;
      if (typeof patch.name === 'string' && patch.name.trim()) {
        meta.name = patch.name.trim();
      }
      meta.updatedAt = nowIso();
      writeJsonAtomic(metaPath(id), meta);
      return meta;
    },

    deleteProject(id) {
      if (!readMeta(id)) return false;
      fs.rmSync(projectDir(id), { recursive: true, force: true });
      return true;
    },

    readCollection(id, collection) {
      return readJson(path.join(projectDir(id), `${collection}.json`), []);
    },

    writeCollection(id, collection, items) {
      writeJsonAtomic(path.join(projectDir(id), `${collection}.json`), items);
      touch(id);
    },

    readSingleton(id, singleton) {
      return readJson(path.join(projectDir(id), `${singleton}.json`), {});
    },

    writeSingleton(id, singleton, value) {
      writeJsonAtomic(path.join(projectDir(id), `${singleton}.json`), value);
      touch(id);
    },

    /** Full project snapshot in the same shape the API serves and imports. */
    exportSnapshot(id) {
      const meta = readMeta(id);
      if (!meta) return null;
      const snapshot = {
        meta,
        worldState: store.readSingleton(id, 'world-state'),
        knowledge: store.readSingleton(id, 'knowledge'),
        settings: store.readSingleton(id, 'settings'),
      };
      for (const collection of COLLECTIONS) {
        snapshot[SEED_KEYS[collection]] = store.readCollection(id, collection);
      }
      return snapshot;
    },

    /** Create a new project from a snapshot (fresh id; meta timestamps are new). */
    importSnapshot(snapshot, nameOverride) {
      return store.createProject({
        name: nameOverride || snapshot?.meta?.name || 'Imported Project',
        worldState: snapshot?.worldState,
        knowledge: snapshot?.knowledge,
        settings: snapshot?.settings,
        scripts: snapshot?.scripts,
        storyCards: snapshot?.storyCards,
        history: snapshot?.history,
        sentinelReports: snapshot?.sentinelReports,
      });
    },
  };

  return store;
}
