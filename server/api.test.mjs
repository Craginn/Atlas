// @vitest-environment node
// End-to-end tests for the REST API: a real HTTP server on an ephemeral port,
// a throwaway data directory, exercised through fetch with the same requests
// a local client would make.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApiServer } from './api.mjs';

let server;
let base;
let dataRoot;

beforeAll(async () => {
  dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-api-'));
  server = createApiServer({ dataRoot });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dataRoot, { recursive: true, force: true });
});

const get = (url) => fetch(base + url);
const json = async (url, opts) => (await fetch(base + url, opts)).json();

describe('health and status', () => {
  it('reports health', async () => {
    const res = await json('/api/health');
    expect(res.ok).toBe(true);
    expect(typeof res.projects).toBe('number');
  });

  it('answers key-status like the dev server', async () => {
    const res = await json('/api/key-status');
    expect(res).toEqual({ shell: false });
  });
});

describe('project lifecycle', () => {
  it('creates a project with seeded defaults, lists, renames, and deletes it', async () => {
    const created = await json('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project', worldState: { hp: 20 } }),
    });
    expect(created.name).toBe('Test Project');
    expect(created.id).toBeTruthy();

    const full = await json(`/api/projects/${created.id}`);
    expect(full.meta.id).toBe(created.id);
    expect(full.worldState).toEqual({ hp: 20 });
    expect(full.scripts).toEqual([]);
    expect(full.knowledge.authorsNote).toBe('');

    const listed = await get('/api/projects');
    const found = (await listed.json()).find((p) => p.id === created.id);
    expect(found.name).toBe('Test Project');

    const renamed = await json(`/api/projects/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });
    expect(renamed.name).toBe('Renamed');

    const del = await fetch(`${base}/api/projects/${created.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);
    const gone = await fetch(`${base}/api/projects/${created.id}`);
    expect(gone.status).toBe(404);
  });

  it('rejects a project without a name', async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/);
  });
});

describe('scripts collection', () => {
  let projectId;

  beforeAll(async () => {
    const created = await json('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Scripts Project' }),
    });
    projectId = created.id;
  });

  it('creates, reads, updates, and deletes a script', async () => {
    const script = await json(`/api/projects/${projectId}/scripts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'lib.js', code: 'return 1;' }),
    });
    expect(script.name).toBe('lib.js');
    expect(script.active).toBe(true);
    expect(script.lastModified).toBeTruthy();

    const updated = await json(`/api/projects/${projectId}/scripts/${script.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'return 2;', active: false }),
    });
    expect(updated.code).toBe('return 2;');
    expect(updated.active).toBe(false);
    expect(updated.name).toBe('lib.js');

    const one = await json(`/api/projects/${projectId}/scripts/${script.id}`);
    expect(one.id).toBe(script.id);

    const del = await fetch(`${base}/api/projects/${projectId}/scripts/${script.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);
    const missing = await fetch(`${base}/api/projects/${projectId}/scripts/${script.id}`);
    expect(missing.status).toBe(404);
  });

  it('rejects a script without a name', async () => {
    const res = await fetch(`${base}/api/projects/${projectId}/scripts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'no name' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('singletons and history', () => {
  let projectId;

  beforeAll(async () => {
    const created = await json('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Singletons Project' }),
    });
    projectId = created.id;
  });

  it('replaces world state and settings', async () => {
    const ws = await json(`/api/projects/${projectId}/world-state`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hp: 100, name: 'Marcus' }),
    });
    expect(ws.hp).toBe(100);

    const readBack = await json(`/api/projects/${projectId}/world-state`);
    expect(readBack).toEqual({ hp: 100, name: 'Marcus' });

    await json(`/api/projects/${projectId}/settings`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });
    const settings = await json(`/api/projects/${projectId}/settings`);
    expect(settings).toEqual({ theme: 'dark' });
  });

  it('appends history entries, removes one by index, and clears the rest', async () => {
    await json(`/api/projects/${projectId}/history`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'begin', type: 'start', rawText: 'begin' }),
    });
    const second = await json(`/api/projects/${projectId}/history`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'draw sword' }),
    });
    // Defaults: type 'story', rawText mirrors text.
    expect(second.type).toBe('story');
    expect(second.rawText).toBe('draw sword');

    let entries = await json(`/api/projects/${projectId}/history`);
    expect(entries).toHaveLength(2);

    const del = await fetch(`${base}/api/projects/${projectId}/history/0`, { method: 'DELETE' });
    expect(del.status).toBe(204);
    entries = await json(`/api/projects/${projectId}/history`);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe('draw sword');

    const badIndex = await fetch(`${base}/api/projects/${projectId}/history/9`, { method: 'DELETE' });
    expect(badIndex.status).toBe(404);

    const clear = await fetch(`${base}/api/projects/${projectId}/history`, { method: 'DELETE' });
    expect(clear.status).toBe(204);
    entries = await json(`/api/projects/${projectId}/history`);
    expect(entries).toHaveLength(0);
  });
});

describe('story cards, reports, export/import', () => {
  let projectId;

  beforeAll(async () => {
    const created = await json('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Export Project' }),
    });
    projectId = created.id;
  });

  it('creates a story card with validated defaults', async () => {
    const card = await json(`/api/projects/${projectId}/story-cards`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Marcus', keywords: ['dawnbringer'] }),
    });
    expect(card.type).toBe('Custom');
    expect(card.keywords).toEqual(['dawnbringer']);
  });

  it('stores a sentinel report', async () => {
    const report = await json(`/api/projects/${projectId}/sentinel-reports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'healthy', errors: [], suggestions: [] }),
    });
    expect(report.status).toBe('healthy');
    expect(report.createdAt).toBeTruthy();
    const reports = await json(`/api/projects/${projectId}/sentinel-reports`);
    expect(reports).toHaveLength(1);
  });

  it('exports a snapshot and re-imports it as a new project', async () => {
    const snapshot = await json(`/api/projects/${projectId}/export`);
    expect(snapshot.meta.id).toBe(projectId);
    expect(snapshot.storyCards).toHaveLength(1);

    const imported = await json('/api/projects/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ snapshot }),
    });
    expect(imported.id).not.toBe(projectId);

    const importedFull = await json(`/api/projects/${imported.id}`);
    expect(importedFull.storyCards).toHaveLength(1);
    expect(importedFull.storyCards[0].title).toBe('Marcus');
  });
});

describe('error handling', () => {
  it('returns 404 JSON for unknown projects and routes', async () => {
    const missing = await fetch(`${base}/api/projects/nope`);
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toMatch(/No project/);

    const unrouted = await fetch(`${base}/api/nothing-here`);
    expect(unrouted.status).toBe(404);
  });

  it('returns 400 for invalid JSON bodies', async () => {
    const res = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json at all',
    });
    expect(res.status).toBe(400);
  });
});
