import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILES, SyncError, checkStatus, gitBlobSha, parseRepoInput, pullScripts, pushScripts, type SyncConfig,
} from './scriptSync';

/**
 * A tiny in-memory GitHub: one branch, a flat map of path → content, and the
 * handful of endpoints the sync uses. Commits are numbered.
 */
function fakeGitHub(files: Record<string, string>, { token = 'tok', branch = 'main' } = {}) {
  let head = 'c1';
  const commits: Record<string, Record<string, string>> = { c1: { ...files } };
  const blobs: Record<string, string> = {};
  const trees: Record<string, Record<string, string>> = {};
  const calls: string[] = [];
  let n = 1;

  const blobShaSync = async (c: string) => { const s = await gitBlobSha(c); blobs[s] = c; return s; };

  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const method = (init.method ?? 'GET').toUpperCase();
    const p = decodeURIComponent(u.pathname);
    calls.push(`${method} ${p}`);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    if (method !== 'GET' && auth !== `Bearer ${token}`) return json(401, { message: 'Bad credentials' });
    let m: RegExpMatchArray | null;
    if (p === '/repos/me/scripts') return json(200, { full_name: 'me/scripts', private: false, default_branch: branch, permissions: { push: auth === `Bearer ${token}` } });
    if (p === `/repos/me/scripts/git/ref/heads/${branch}`) return json(200, { object: { sha: head } });
    if ((m = p.match(/^\/repos\/me\/scripts\/contents\/?(.*)$/))) {
      const folder = m[1];
      const ref = u.searchParams.get('ref')!;
      const snapshot = commits[ref];
      const entries = await Promise.all(Object.entries(snapshot)
        .filter(([path]) => (folder ? path.startsWith(folder + '/') : !path.includes('/')))
        .map(async ([path, content]) => ({ name: path.split('/').pop(), path, sha: await blobShaSync(content), type: 'file' })));
      return entries.length ? json(200, entries) : json(404, { message: 'Not Found' });
    }
    if ((m = p.match(/^\/repos\/me\/scripts\/git\/blobs\/(\w+)$/))) {
      const content = blobs[m[1]];
      return json(200, { content: btoa(String.fromCharCode(...new TextEncoder().encode(content))), encoding: 'base64' });
    }
    if ((m = p.match(/^\/repos\/me\/scripts\/git\/commits\/(\w+)$/))) return json(200, { tree: { sha: `tree-${m[1]}` } });
    if (p === '/repos/me/scripts/git/trees' && method === 'POST') {
      const body = JSON.parse(String(init.body));
      const base = commits[body.base_tree.replace('tree-', '')];
      const next = { ...base };
      for (const e of body.tree) next[e.path] = e.content;
      const id = `t${++n}`;
      trees[id] = next;
      return json(201, { sha: id, tree: [] });
    }
    if (p === '/repos/me/scripts/git/commits' && method === 'POST') {
      const body = JSON.parse(String(init.body));
      const id = `c${++n}`;
      commits[id] = trees[body.tree];
      return json(201, { sha: id, html_url: `https://github.com/me/scripts/commit/${id}` });
    }
    if (p === `/repos/me/scripts/git/refs/heads/${branch}` && method === 'PATCH') {
      head = JSON.parse(String(init.body)).sha;
      return json(200, {});
    }
    return json(404, { message: 'Not Found' });
  }) as unknown as typeof fetch;

  return {
    fetchImpl, calls,
    current: () => commits[head],
    /** Someone else commits directly on GitHub. */
    commitDirectly: (path: string, content: string) => { const id = `c${++n}`; commits[id] = { ...commits[head], [path]: content }; head = id; },
  };
}

const cfg: SyncConfig = { owner: 'me', repo: 'scripts', branch: 'main', folder: 'aid', files: { ...DEFAULT_FILES } };

describe('parseRepoInput', () => {
  it('reads owner/repo and full GitHub links, including branch and folder', () => {
    expect(parseRepoInput('me/scripts')).toEqual({ owner: 'me', repo: 'scripts' });
    expect(parseRepoInput('https://github.com/me/scripts.git')).toEqual({ owner: 'me', repo: 'scripts' });
    expect(parseRepoInput('https://github.com/me/scripts/tree/dev/my%20game/aid')).toEqual({ owner: 'me', repo: 'scripts', branch: 'dev', folder: 'my game/aid' });
    expect(parseRepoInput('not a repo')).toBeNull();
  });
});

describe('gitBlobSha', () => {
  it("matches git's hash", async () => {
    // `printf 'hello\n' | git hash-object --stdin`
    expect(await gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });
});

describe('pull and push', () => {
  const start = { 'aid/Library.js': 'const lib = 1;\n', 'aid/Input.js': 'const modifier = (text) => ({ text });\nmodifier(text);\n', 'README.md': '# hi' };

  it('pulls the four slots from the folder, reporting missing files (no token needed)', async () => {
    const gh = fakeGitHub(start);
    const r = await pullScripts(cfg, { fetchImpl: gh.fetchImpl });
    expect(r.code).toEqual({ 'Library': start['aid/Library.js'], 'Input Modifier': start['aid/Input.js'] });
    expect(r.missing).toEqual(['Context Modifier', 'Output Modifier']);
    expect(r.baseline.commit).toBe('c1');
  });

  it('pushes only what changed here, in one commit, and tracks status', async () => {
    const gh = fakeGitHub(start);
    const { code, baseline } = await pullScripts(cfg, { fetchImpl: gh.fetchImpl });
    const local = { ...code, 'Library': 'const lib = 2;\n', 'Output Modifier': 'const modifier = (text) => ({ text });\nmodifier(text);\n' };

    const before = await checkStatus(cfg, local, baseline, { fetchImpl: gh.fetchImpl });
    expect(before.slots).toMatchObject({ 'Library': 'local', 'Input Modifier': 'same', 'Output Modifier': 'new' });

    const pushed = await pushScripts(cfg, local, baseline, 'Update scripts', { token: 'tok', fetchImpl: gh.fetchImpl });
    expect(pushed.pushed).toEqual(['Library', 'Output Modifier']);
    expect(gh.calls.filter(c => c === 'POST /repos/me/scripts/git/commits')).toHaveLength(1);
    expect(gh.current()['aid/Library.js']).toBe('const lib = 2;\n');
    expect(gh.current()['aid/Output.js']).toContain('modifier');
    expect(gh.current()['README.md']).toBe('# hi'); // other files untouched

    const after = await checkStatus(cfg, local, pushed.baseline, { fetchImpl: gh.fetchImpl });
    expect(Object.values(after.slots).every(s => s === 'same')).toBe(true);
  });

  it('refuses to overwrite a file someone changed on GitHub since the pull', async () => {
    const gh = fakeGitHub(start);
    const { code, baseline } = await pullScripts(cfg, { fetchImpl: gh.fetchImpl });
    gh.commitDirectly('aid/Library.js', 'const lib = "theirs";\n');
    const local = { ...code, 'Library': 'const lib = "mine";\n' };

    const status = await checkStatus(cfg, local, baseline, { fetchImpl: gh.fetchImpl });
    expect(status.slots['Library']).toBe('both');
    await expect(pushScripts(cfg, local, baseline, 'x', { token: 'tok', fetchImpl: gh.fetchImpl }))
      .rejects.toMatchObject({ kind: 'conflict', message: expect.stringMatching(/Library changed on GitHub/) });
    expect(gh.current()['aid/Library.js']).toBe('const lib = "theirs";\n');
  });

  it('pushes on top of unrelated remote changes', async () => {
    const gh = fakeGitHub(start);
    const { code, baseline } = await pullScripts(cfg, { fetchImpl: gh.fetchImpl });
    gh.commitDirectly('aid/Input.js', 'changed elsewhere\n');
    const pushed = await pushScripts(cfg, { ...code, 'Library': 'const lib = 3;\n' }, baseline, 'x', { token: 'tok', fetchImpl: gh.fetchImpl });
    expect(pushed.pushed).toEqual(['Library']);
    expect(gh.current()['aid/Input.js']).toBe('changed elsewhere\n'); // kept
  });

  it('explains missing tokens and bad tokens plainly', async () => {
    const gh = fakeGitHub(start);
    const { code, baseline } = await pullScripts(cfg, { fetchImpl: gh.fetchImpl });
    const local = { ...code, 'Library': 'x' };
    await expect(pushScripts(cfg, local, baseline, 'x', { fetchImpl: gh.fetchImpl })).rejects.toBeInstanceOf(SyncError);
    await expect(pushScripts(cfg, local, baseline, 'x', { token: 'wrong', fetchImpl: gh.fetchImpl }))
      .rejects.toMatchObject({ kind: 'auth', message: expect.stringMatching(/rejected the token/) });
    await expect(pullScripts({ ...cfg, repo: 'nope' }, { fetchImpl: gh.fetchImpl }))
      .rejects.toMatchObject({ kind: 'notFound', message: expect.stringMatching(/private repository needs a token/) });
  });
});
