import React, { useEffect, useState } from 'react';
import {
  GitBranch, Download, Upload, RefreshCw, KeyRound, Loader2, CheckCircle2, AlertCircle, Info, ArrowUpRight, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { SCRIPT_SLOTS, parseRepoInput, pathFor, type SyncConfig } from '@/services/github/scriptSync';
import { SLOT_STATE_LABEL } from '@/services/github/labels';
import type { GitHubSync } from '@/hooks/use-github-sync';

// Settings → GitHub: link YOUR scripts to YOUR repository.
//
// Atlas is a bridge for scripts — this syncs the four script files (Library,
// Input, Context, Output) with a folder in any GitHub repo you choose. It is
// not about Atlas's own code.

const inputCls = 'w-full bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60';

const GitHubSyncSettings: React.FC<{ sync: GitHubSync }> = ({ sync }) => {
  const { config } = sync;
  const [repoText, setRepoText] = useState(config.owner ? `${config.owner}/${config.repo}` : '');
  const [draft, setDraft] = useState<SyncConfig>(config);
  const [token, setToken] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  useEffect(() => { setDraft(config); }, [config]);

  const parsed = parseRepoInput(repoText);
  const dirty = JSON.stringify({ ...draft, ...(parsed ?? {}) }) !== JSON.stringify(config);

  const saveRepo = () => {
    if (!parsed) return;
    sync.updateConfig({ ...draft, ...parsed, branch: parsed.branch ?? draft.branch, folder: parsed.folder ?? draft.folder });
    setRepoText(`${parsed.owner}/${parsed.repo}`);
  };

  const busy = sync.busy;
  const Spin = ({ on }: { on: boolean }) => (on ? <Loader2 size={14} className="animate-spin" /> : null);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2"><GitBranch size={18} /> GitHub</h3>
        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
          Keep your AI Dungeon scripts in your own GitHub repository. Pull them into Atlas to test, push your fixes
          back — the Library, Input, Context and Output scripts, nothing else.
        </p>
      </div>

      {/* Repository */}
      <section className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-300">Repository</span>
          <input
            className={`${inputCls} mt-1`}
            value={repoText}
            onChange={e => {
              setRepoText(e.target.value);
              const p = parseRepoInput(e.target.value);
              if (p?.branch || p?.folder) setDraft(d => ({ ...d, ...(p.branch ? { branch: p.branch } : {}), ...(p.folder ? { folder: p.folder } : {}) }));
            }}
            placeholder="your-name/your-scripts  — or paste the GitHub link"
            spellCheck={false}
          />
          {repoText && !parsed && <span className="text-xs text-amber-400">Use owner/repo, or a github.com link.</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-300">Branch</span>
            <input className={`${inputCls} mt-1`} value={draft.branch} onChange={e => setDraft({ ...draft, branch: e.target.value })} spellCheck={false} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-zinc-300">Folder <span className="font-normal text-zinc-500">(empty = top of the repo)</span></span>
            <input className={`${inputCls} mt-1`} value={draft.folder} onChange={e => setDraft({ ...draft, folder: e.target.value })} placeholder="e.g. scripts/my-scenario" spellCheck={false} />
          </label>
        </div>

        <button type="button" onClick={() => setShowFiles(s => !s)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
          {showFiles ? <ChevronDown size={13} /> : <ChevronRight size={13} />} File names
        </button>
        {showFiles && (
          <div className="grid grid-cols-2 gap-2">
            {SCRIPT_SLOTS.map(slot => (
              <label key={slot} className="block">
                <span className="text-xs text-zinc-400">{slot}</span>
                <input
                  className={`${inputCls} mt-0.5 font-mono text-xs`}
                  value={draft.files[slot]}
                  onChange={e => setDraft({ ...draft, files: { ...draft.files, [slot]: e.target.value } })}
                  spellCheck={false}
                />
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={saveRepo}
            disabled={!parsed || !dirty}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
          >
            {sync.linked ? 'Save changes' : 'Link repository'}
          </button>
          {sync.linked && (
            <>
              <button onClick={() => void sync.testConnection()} disabled={!!busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50">
                <Spin on={busy === 'test'} /> Test connection
              </button>
              <a
                href={`https://github.com/${config.owner}/${config.repo}/tree/${encodeURIComponent(config.branch)}/${config.folder}`}
                target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Open on GitHub <ArrowUpRight size={12} />
              </a>
            </>
          )}
        </div>
      </section>

      {/* Token */}
      <section className="space-y-2 rounded-lg border border-zinc-700/60 p-3">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-200">Access token</span>
          <span className={`text-xs ${sync.hasToken ? 'text-emerald-400/80' : 'text-zinc-500'}`}>
            {sync.hasToken ? (sync.tokenStorage === 'encrypted' ? 'Saved (encrypted on this computer)' : 'Saved for this session') : 'None'}
          </span>
          {sync.hasToken && (
            <button onClick={() => void sync.removeToken()} className="ml-auto flex items-center gap-1 text-xs text-zinc-400 hover:text-red-300">
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Needed to <b>push</b>, or to pull from a <b>private</b> repository. Public repositories can be pulled without one.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            className={inputCls}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={sync.hasToken ? 'Paste a new token to replace it' : 'github_pat_…'}
            autoComplete="off"
          />
          <button
            onClick={() => { void sync.setToken(token); setToken(''); }}
            disabled={!token.trim()}
            className="px-3 py-1.5 rounded-md text-sm text-zinc-200 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 shrink-0"
          >
            Save token
          </button>
        </div>
        <button type="button" onClick={() => setShowTokenHelp(s => !s)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
          {showTokenHelp ? <ChevronDown size={13} /> : <ChevronRight size={13} />} How do I get a token?
        </button>
        {showTokenHelp && (
          <ol className="text-xs text-zinc-400 list-decimal list-inside space-y-1 leading-relaxed">
            <li>
              Open{' '}
              <a className="text-purple-300 hover:underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
                GitHub → Settings → Fine-grained tokens → Generate new token
              </a>.
            </li>
            <li>Under <b>Repository access</b>, choose <b>Only select repositories</b> and pick your scripts repo.</li>
            <li>Under <b>Permissions → Repository permissions</b>, set <b>Contents</b> to <b>Read and write</b>.</li>
            <li>Generate it, copy it, paste it above. It's only ever sent to GitHub.</li>
          </ol>
        )}
      </section>

      {/* Sync */}
      {sync.linked && (
        <section className="space-y-3">
          <div className="rounded-lg border border-zinc-700/60 divide-y divide-zinc-800">
            {SCRIPT_SLOTS.map(slot => {
              const state = sync.slots?.[slot] ?? 'untracked';
              const label = SLOT_STATE_LABEL[state];
              return (
                <div key={slot} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="text-zinc-200 w-36 shrink-0">{slot}</span>
                  <span className="font-mono text-xs text-zinc-500 truncate flex-1">{pathFor(config, slot)}</span>
                  <span className={`text-xs shrink-0 ${label.cls}`}>{label.text}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void sync.pull()} disabled={!!busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50">
              {busy === 'pull' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Pull from GitHub
            </button>
            <button onClick={() => void sync.check()} disabled={!!busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50">
              {busy === 'check' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check for changes
            </button>
          </div>

          <div className="flex gap-2">
            <input
              className={inputCls}
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="What did you change? (commit message)"
            />
            <button
              onClick={() => { void sync.push(commitMsg); setCommitMsg(''); }}
              disabled={!!busy || !sync.hasToken || sync.localChanges.length === 0}
              title={!sync.hasToken ? 'Add a token to push' : sync.localChanges.length === 0 ? 'Nothing changed here since the last sync' : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 shrink-0"
            >
              {busy === 'push' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Push{sync.localChanges.length ? ` ${sync.localChanges.length}` : ''}
            </button>
          </div>
        </section>
      )}

      {sync.message && (
        <div className={`flex items-start gap-2 rounded-md p-2.5 text-sm ${
          sync.message.kind === 'error' ? 'bg-red-500/10 text-red-200 border border-red-500/30'
            : sync.message.kind === 'ok' ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
            : 'bg-zinc-800/60 text-zinc-300 border border-zinc-700'
        }`}>
          {sync.message.kind === 'error' ? <AlertCircle size={15} className="mt-0.5 shrink-0" />
            : sync.message.kind === 'ok' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            : <Info size={15} className="mt-0.5 shrink-0" />}
          <span className="leading-snug">
            {sync.message.text}
            {sync.message.url && (
              <> <a href={sync.message.url} target="_blank" rel="noopener noreferrer" className="underline">View the commit</a></>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default GitHubSyncSettings;
