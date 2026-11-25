import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Script } from '@/types';
import {
  DEFAULT_FILES, SCRIPT_SLOTS, SyncError, checkAccess, checkStatus, compareWithBaseline, isConfigured,
  pullScripts, pushScripts, type ScriptSlot, type SlotState, type SyncBaseline, type SyncConfig,
} from '@/services/github/scriptSync';
import { clearToken, getToken, saveToken, tokenStorage, type TokenStorage } from '@/services/github/tokenStore';

// App-wide state for linking the user's scripts to their own GitHub repo.
// The repo settings and the last-sync baseline are remembered between runs;
// the token is kept separately (encrypted — see tokenStore).

const CONFIG_KEY = 'atlas.github.config';
const BASELINE_KEY = 'atlas.github.baseline';

export const EMPTY_CONFIG: SyncConfig = { owner: '', repo: '', branch: 'main', folder: '', files: { ...DEFAULT_FILES } };

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
};

const identity = (c: SyncConfig) => `${c.owner}/${c.repo}@${c.branch}:${c.folder}:${SCRIPT_SLOTS.map(s => c.files[s]).join(',')}`;

export interface SyncMessage {
  kind: 'ok' | 'error' | 'info';
  text: string;
  url?: string;
}

export type GitHubSync = ReturnType<typeof useGitHubSync>;

export function useGitHubSync(scripts: Script[], setScripts: React.Dispatch<React.SetStateAction<Script[]>>) {
  const [config, setConfig] = useState<SyncConfig>(() => load(CONFIG_KEY, EMPTY_CONFIG));
  const [baseline, setBaseline] = useState<(SyncBaseline & { identity: string }) | null>(() => load(BASELINE_KEY, null as never));
  const [hasToken, setHasToken] = useState(false);
  const [storage, setStorage] = useState<TokenStorage>('session');
  const [busy, setBusy] = useState<null | 'pull' | 'push' | 'check' | 'test'>(null);
  const [message, setMessage] = useState<SyncMessage | null>(null);
  /** Per-slot state including remote changes, from the last "Check". */
  const [remoteSlots, setRemoteSlots] = useState<Record<ScriptSlot, SlotState> | null>(null);
  const [localSlots, setLocalSlots] = useState<Record<ScriptSlot, SlotState> | null>(null);

  const linked = isConfigured(config);
  // A baseline only describes the repo/branch/folder it was taken from.
  const activeBaseline = baseline && baseline.identity === identity(config) ? baseline : null;

  useEffect(() => { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch { /* ignore */ } }, [config]);
  useEffect(() => { try { localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline)); } catch { /* ignore */ } }, [baseline]);
  useEffect(() => {
    void getToken().then(t => setHasToken(Boolean(t)));
    void tokenStorage().then(setStorage);
  }, []);

  /** Code per slot, from the scripts named after the slots. */
  const localCode = useCallback((list: Script[]) => {
    const out: Partial<Record<ScriptSlot, string>> = {};
    for (const slot of SCRIPT_SLOTS) {
      const s = list.find(x => x.name === slot);
      if (s) out[slot] = s.code ?? '';
    }
    return out;
  }, []);

  // "Changed here" for each slot, recomputed (off the keystroke path) as you edit.
  const deferredScripts = useDeferredValue(scripts);
  useEffect(() => {
    if (!linked || !activeBaseline) { setLocalSlots(null); return; }
    let cancelled = false;
    void compareWithBaseline(localCode(deferredScripts), activeBaseline).then(s => { if (!cancelled) setLocalSlots(s); });
    return () => { cancelled = true; };
  }, [deferredScripts, activeBaseline, linked, localCode]);

  /** Merge: local knowledge always, plus remote knowledge from the last check. */
  const slots = useMemo(() => {
    if (!localSlots) return null;
    if (!remoteSlots) return localSlots;
    const merged = { ...localSlots };
    for (const slot of SCRIPT_SLOTS) {
      const r = remoteSlots[slot];
      const l = localSlots[slot];
      if (r === 'remote' || r === 'both') merged[slot] = l === 'local' || l === 'both' ? 'both' : 'remote';
    }
    return merged;
  }, [localSlots, remoteSlots]);

  const localChanges = useMemo(
    () => (slots ? SCRIPT_SLOTS.filter(s => slots[s] === 'local' || slots[s] === 'new' || slots[s] === 'both') : []),
    [slots],
  );

  const fail = (e: unknown) => setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });

  const updateConfig = useCallback((next: SyncConfig) => {
    setConfig(next);
    setRemoteSlots(null);
    setMessage(null);
  }, []);

  const setToken = useCallback(async (token: string) => {
    if (!token.trim()) return;
    const where = await saveToken(token);
    setHasToken(true);
    setStorage(where);
    setMessage({
      kind: 'ok',
      text: where === 'encrypted' ? 'Token saved, encrypted on this computer.' : 'Token kept for this session only (this browser has no secure storage).',
    });
  }, []);

  const removeToken = useCallback(async () => {
    await clearToken();
    setHasToken(false);
    setMessage({ kind: 'info', text: 'Token removed.' });
  }, []);

  const testConnection = useCallback(async () => {
    if (!linked) return;
    setBusy('test');
    try {
      const token = (await getToken()) ?? undefined;
      const r = await checkAccess(config, { token });
      setMessage({
        kind: 'ok',
        text: `Connected to ${r.fullName}${r.private ? ' (private)' : ''}. ${r.canPush ? 'You can pull and push.' : token ? 'This token can read but not push.' : 'You can pull; add a token to push.'}`,
      });
    } catch (e) { fail(e); } finally { setBusy(null); }
  }, [config, linked]);

  const pull = useCallback(async () => {
    if (!linked) return;
    const unpushed = localChanges;
    if (unpushed.length && !window.confirm(
      `Pulling replaces ${unpushed.join(', ')} with the versions on GitHub, and you have changes there that aren't pushed. Pull anyway?`,
    )) return;
    setBusy('pull');
    try {
      const token = (await getToken()) ?? undefined;
      const r = await pullScripts(config, { token });
      setScripts(prev => prev.map(s => {
        const code = r.code[s.name as ScriptSlot];
        return code !== undefined && code !== s.code ? { ...s, code } : s;
      }));
      setBaseline({ ...r.baseline, identity: identity(config) });
      setRemoteSlots(null);
      const got = Object.keys(r.code);
      setMessage({
        kind: 'ok',
        text: `Pulled ${got.length ? got.join(', ') : 'nothing'} from ${config.owner}/${config.repo}@${config.branch}.` +
          (r.missing.length ? ` Not in the repo yet: ${r.missing.join(', ')}.` : ''),
      });
    } catch (e) { fail(e); } finally { setBusy(null); }
  }, [config, linked, localChanges, setScripts]);

  const check = useCallback(async () => {
    if (!linked) return;
    setBusy('check');
    try {
      const token = (await getToken()) ?? undefined;
      const r = await checkStatus(config, localCode(scripts), activeBaseline, { token });
      setRemoteSlots(r.slots);
      const remote = SCRIPT_SLOTS.filter(s => r.slots[s] === 'remote' || r.slots[s] === 'both');
      setMessage({
        kind: 'info',
        text: !activeBaseline
          ? 'Not synced yet — Pull to link these scripts to the repo.'
          : remote.length ? `Changed on GitHub: ${remote.join(', ')}. Pull to get them.` : 'Nothing new on GitHub.',
      });
    } catch (e) { fail(e); } finally { setBusy(null); }
  }, [config, linked, scripts, activeBaseline, localCode]);

  const push = useCallback(async (commitMessage: string) => {
    if (!linked) return;
    setBusy('push');
    try {
      const token = (await getToken()) ?? undefined;
      const r = await pushScripts(config, localCode(scripts), activeBaseline, commitMessage.trim() || 'Update AI Dungeon scripts from Atlas', { token });
      setBaseline({ ...r.baseline, identity: identity(config) });
      setRemoteSlots(null);
      setMessage({ kind: 'ok', text: `Pushed ${r.pushed.join(', ')} in one commit.`, url: r.url });
    } catch (e) {
      if (e instanceof SyncError && e.kind === 'conflict') setRemoteSlots(null);
      fail(e);
    } finally { setBusy(null); }
  }, [config, linked, scripts, activeBaseline, localCode]);

  return {
    config, updateConfig, linked, baseline: activeBaseline, slots, localChanges,
    hasToken, tokenStorage: storage, setToken, removeToken,
    busy, message, clearMessage: () => setMessage(null),
    testConnection, pull, push, check,
  };
}
