// GitHub sync for the user's AI Dungeon scripts.
//
// Atlas is a bridge for scripts: any user links *their own* repository (owner,
// repo, branch, folder) and pulls/pushes the four script files that fill
// Atlas's slots — Library, Input, Context, Output. Nothing about Atlas's own
// code is involved.
//
// Change tracking uses git's own blob hash (sha1 of "blob <bytes>\0<content>"):
// the hash GitHub reports for each file is compared with the hash of the code
// in Atlas, so "changed here" and "changed on GitHub" are both known exactly,
// without keeping copies of the files.
//
// Pushing writes every changed file in ONE commit (git data API) and refuses
// to overwrite a file that changed on GitHub since the last pull.

export const SCRIPT_SLOTS = ['Library', 'Input Modifier', 'Context Modifier', 'Output Modifier'] as const;
export type ScriptSlot = (typeof SCRIPT_SLOTS)[number];

export const DEFAULT_FILES: Record<ScriptSlot, string> = {
  'Library': 'Library.js',
  'Input Modifier': 'Input.js',
  'Context Modifier': 'Context.js',
  'Output Modifier': 'Output.js',
};

export interface SyncConfig {
  owner: string;
  repo: string;
  branch: string;
  /** Folder inside the repo holding the scripts ('' = repo root). */
  folder: string;
  /** File name per slot. */
  files: Record<ScriptSlot, string>;
}

/** What Atlas knows about the remote after the last pull/push. */
export interface SyncBaseline {
  /** Commit the baseline was taken at. */
  commit: string;
  /** Blob sha per slot at that commit (absent = file didn't exist). */
  shas: Partial<Record<ScriptSlot, string>>;
  at: number;
}

export class SyncError extends Error {
  constructor(message: string, readonly kind: 'auth' | 'notFound' | 'conflict' | 'rateLimit' | 'network' | 'other' = 'other') {
    super(message);
  }
}

// ------------------------------------------------------------------ config

/**
 * Read a repository from what a user pastes: "owner/repo", or any GitHub URL —
 * including /tree/<branch>/<folder> links, which fill in branch and folder.
 */
export function parseRepoInput(input: string): Partial<Pick<SyncConfig, 'owner' | 'repo' | 'branch' | 'folder'>> | null {
  const s = input.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  const url = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)(?:\/tree\/([^/\s]+)(?:\/(.+))?)?$/i);
  if (url) {
    return { owner: url[1], repo: url[2], ...(url[3] ? { branch: url[3] } : {}), ...(url[4] ? { folder: decodeURIComponent(url[4]) } : {}) };
  }
  const short = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return short ? { owner: short[1], repo: short[2] } : null;
}

export const pathFor = (cfg: SyncConfig, slot: ScriptSlot) =>
  [cfg.folder.replace(/^\/+|\/+$/g, ''), cfg.files[slot]].filter(Boolean).join('/');

export const isConfigured = (cfg: SyncConfig | null | undefined): cfg is SyncConfig =>
  Boolean(cfg && cfg.owner && cfg.repo && cfg.branch);

// ------------------------------------------------------------------ hashing

const utf8 = (s: string) => new TextEncoder().encode(s);

/** git's blob hash for `content` — equals the sha GitHub reports for that file. */
export async function gitBlobSha(content: string): Promise<string> {
  const body = utf8(content);
  const header = utf8(`blob ${body.length}\0`);
  const bytes = new Uint8Array(header.length + body.length);
  bytes.set(header);
  bytes.set(body, header.length);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const decodeBase64Utf8 = (b64: string) => {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

// ------------------------------------------------------------------ API

export interface ApiOptions {
  token?: string;
  fetchImpl?: typeof fetch;
}

async function api<T>(path: string, opts: ApiOptions, init: RequestInit = {}): Promise<T> {
  const f = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new SyncError("Couldn't reach GitHub — check your internet connection.", 'network');
  }
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  let detail = '';
  try { detail = ((await res.json()) as { message?: string }).message ?? ''; } catch { /* no body */ }
  if (res.status === 401) throw new SyncError('GitHub rejected the token. Check it is correct and not expired.', 'auth');
  if (res.status === 403 && /rate limit/i.test(detail)) {
    throw new SyncError(
      opts.token ? 'GitHub rate limit reached. Try again in a few minutes.' : 'GitHub rate limit reached (60 requests an hour without a token). Add a token, or try again later.',
      'rateLimit',
    );
  }
  if (res.status === 403) throw new SyncError("The token doesn't have permission for this. It needs Contents: read and write on this repository.", 'auth');
  if (res.status === 404) {
    throw new SyncError(
      opts.token
        ? 'Not found — check the repository, branch and folder, and that the token can access this repository.'
        : 'Not found — check the repository, branch and folder. A private repository needs a token.',
      'notFound',
    );
  }
  if (res.status === 409 || res.status === 422) throw new SyncError(`GitHub refused the change: ${detail || res.status}.`, 'conflict');
  throw new SyncError(`GitHub answered ${res.status}${detail ? `: ${detail}` : ''}.`);
}

const repoPath = (cfg: SyncConfig) => `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;

/** Can we see the repo, and could this token push to it? */
export async function checkAccess(cfg: SyncConfig, opts: ApiOptions = {}) {
  const repo = await api<{ full_name: string; private: boolean; default_branch: string; permissions?: { push?: boolean } }>(repoPath(cfg), opts);
  return { fullName: repo.full_name, private: repo.private, defaultBranch: repo.default_branch, canPush: Boolean(repo.permissions?.push) };
}

/** The commit at the tip of the branch. */
async function branchHead(cfg: SyncConfig, opts: ApiOptions): Promise<string> {
  const ref = await api<{ object: { sha: string } }>(`${repoPath(cfg)}/git/ref/heads/${encodeURIComponent(cfg.branch)}`, opts);
  return ref.object.sha;
}

/** Blob sha of each slot's file at `commit` (absent when the file doesn't exist there). */
async function remoteShas(cfg: SyncConfig, commit: string, opts: ApiOptions): Promise<Partial<Record<ScriptSlot, string>>> {
  const folder = cfg.folder.replace(/^\/+|\/+$/g, '');
  let listing: { name: string; path: string; sha: string; type: string }[];
  try {
    listing = await api(`${repoPath(cfg)}/contents/${folder.split('/').map(encodeURIComponent).join('/')}?ref=${commit}`, opts);
  } catch (e) {
    if (e instanceof SyncError && e.kind === 'notFound') return {}; // folder doesn't exist yet
    throw e;
  }
  const byName = new Map((Array.isArray(listing) ? listing : []).filter(x => x.type === 'file').map(x => [x.name, x.sha]));
  const out: Partial<Record<ScriptSlot, string>> = {};
  for (const slot of SCRIPT_SLOTS) {
    const sha = byName.get(cfg.files[slot]);
    if (sha) out[slot] = sha;
  }
  return out;
}

export interface PullResult {
  /** Code per slot that exists on GitHub. */
  code: Partial<Record<ScriptSlot, string>>;
  /** Slots whose file isn't in the repo. */
  missing: ScriptSlot[];
  baseline: SyncBaseline;
}

/** Download the script files from the branch. */
export async function pullScripts(cfg: SyncConfig, opts: ApiOptions = {}): Promise<PullResult> {
  const commit = await branchHead(cfg, opts);
  const shas = await remoteShas(cfg, commit, opts);
  const code: Partial<Record<ScriptSlot, string>> = {};
  const missing: ScriptSlot[] = [];
  for (const slot of SCRIPT_SLOTS) {
    const sha = shas[slot];
    if (!sha) { missing.push(slot); continue; }
    // By blob sha: exact content at that commit, no size limit below 100 MB.
    const blob = await api<{ content: string; encoding: string }>(`${repoPath(cfg)}/git/blobs/${sha}`, opts);
    code[slot] = blob.encoding === 'base64' ? decodeBase64Utf8(blob.content) : blob.content;
  }
  return { code, missing, baseline: { commit, shas, at: Date.now() } };
}

export type SlotState = 'same' | 'local' | 'remote' | 'both' | 'new' | 'untracked';

export interface SyncStatus {
  /** Per slot: same / changed here / changed on GitHub / both / only here (new) / not linked yet. */
  slots: Record<ScriptSlot, SlotState>;
  remoteCommit: string;
}

/**
 * Compare Atlas's scripts with the baseline and (when `remote` is given) with
 * the branch tip. `local` is the current code per slot.
 */
export async function compareWithBaseline(
  local: Partial<Record<ScriptSlot, string>>,
  baseline: SyncBaseline | null,
  remote?: Partial<Record<ScriptSlot, string>>,
): Promise<Record<ScriptSlot, SlotState>> {
  const out = {} as Record<ScriptSlot, SlotState>;
  for (const slot of SCRIPT_SLOTS) {
    const code = local[slot] ?? '';
    const base = baseline?.shas[slot];
    const localSha = code ? await gitBlobSha(code) : undefined;
    const remoteSha = remote ? remote[slot] : base;
    if (!baseline) { out[slot] = 'untracked'; continue; }
    if (!base) { out[slot] = localSha ? (remoteSha ? 'both' : 'new') : 'same'; continue; }
    const localChanged = localSha !== base;
    const remoteChanged = remoteSha !== base;
    out[slot] = localChanged && remoteChanged ? 'both' : localChanged ? 'local' : remoteChanged ? 'remote' : 'same';
  }
  return out;
}

/** Look at the branch tip and say what changed where. */
export async function checkStatus(
  cfg: SyncConfig, local: Partial<Record<ScriptSlot, string>>, baseline: SyncBaseline | null, opts: ApiOptions = {},
): Promise<SyncStatus> {
  const commit = await branchHead(cfg, opts);
  const remote = await remoteShas(cfg, commit, opts);
  return { slots: await compareWithBaseline(local, baseline, remote), remoteCommit: commit };
}

export interface PushResult {
  commit: string;
  url: string;
  pushed: ScriptSlot[];
  baseline: SyncBaseline;
}

/**
 * Commit every script that changed since the baseline, in one commit. Refuses
 * when a file being pushed also changed on GitHub (pull first), so nobody's
 * work is overwritten. Needs a token with Contents: write.
 */
export async function pushScripts(
  cfg: SyncConfig,
  local: Partial<Record<ScriptSlot, string>>,
  baseline: SyncBaseline | null,
  message: string,
  opts: ApiOptions,
): Promise<PushResult> {
  if (!opts.token) throw new SyncError('Pushing needs a GitHub token with Contents: write on this repository.', 'auth');
  const head = await branchHead(cfg, opts);
  const remote = await remoteShas(cfg, head, opts);

  const changes: { slot: ScriptSlot; content: string }[] = [];
  const conflicts: ScriptSlot[] = [];
  for (const slot of SCRIPT_SLOTS) {
    const code = local[slot];
    if (code === undefined) continue;
    const localSha = await gitBlobSha(code);
    if (localSha === remote[slot]) continue; // already identical on GitHub
    const base = baseline?.shas[slot];
    if (localSha === base) continue; // unchanged here; remote differs → that's theirs, not ours to push
    if (!code.trim() && !remote[slot]) continue; // empty slot, nothing on GitHub
    if (remote[slot] && remote[slot] !== base) conflicts.push(slot);
    else changes.push({ slot, content: code });
  }
  if (conflicts.length) {
    throw new SyncError(
      `${conflicts.join(', ')} changed on GitHub since your last pull. Pull first to get those changes, then push again.`,
      'conflict',
    );
  }
  if (!changes.length) throw new SyncError('Nothing to push — your scripts match GitHub.', 'other');

  const commit = await api<{ tree: { sha: string } }>(`${repoPath(cfg)}/git/commits/${head}`, opts);
  const tree = await api<{ sha: string; tree: { path: string; sha: string }[] }>(`${repoPath(cfg)}/git/trees`, opts, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: commit.tree.sha,
      tree: changes.map(c => ({ path: pathFor(cfg, c.slot), mode: '100644', type: 'blob', content: c.content })),
    }),
  });
  const created = await api<{ sha: string; html_url: string }>(`${repoPath(cfg)}/git/commits`, opts, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
  });
  // Not forced: if someone pushed in the meantime, GitHub refuses rather than losing their commit.
  await api(`${repoPath(cfg)}/git/refs/heads/${encodeURIComponent(cfg.branch)}`, opts, {
    method: 'PATCH',
    body: JSON.stringify({ sha: created.sha, force: false }),
  });

  const shas = { ...remote };
  for (const c of changes) shas[c.slot] = await gitBlobSha(c.content);
  return {
    commit: created.sha,
    url: created.html_url || `https://github.com/${cfg.owner}/${cfg.repo}/commit/${created.sha}`,
    pushed: changes.map(c => c.slot),
    baseline: { commit: created.sha, shas, at: Date.now() },
  };
}
