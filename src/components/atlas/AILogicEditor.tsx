import React, { useDeferredValue, useMemo, useState } from 'react';
import CodeBuffer, { type MarkedError } from './CodeBuffer';
import { Script } from '@/types';
import { FileCode2, Search, X, GitBranch, Download, Upload, Loader2 } from 'lucide-react';
import type { GitHubSync } from '@/hooks/use-github-sync';
import { SLOT_STATE_LABEL } from '@/services/github/labels';
import type { ScriptSlot } from '@/services/github/scriptSync';
import { diagnoseSyntax } from '@/services/offlineSimulationService';

/** What each standard script is for, in one line. */
const ROLE: Record<string, string> = {
  'Library': 'Shared code for every hook',
  'Input Modifier': "Runs on the player's action",
  'Context Modifier': 'Runs on the text sent to the AI',
  'Output Modifier': "Runs on the AI's reply",
};
import { useLayoutMode } from '@/hooks/use-layout-mode';

// Count case-insensitive occurrences of `needle` in `hay` (non-overlapping).
const countMatches = (hay: string, needle: string): number => {
  if (!needle) return 0;
  const h = hay.toLowerCase();
  const n = needle.toLowerCase();
  let count = 0;
  let from = h.indexOf(n);
  while (from !== -1) {
    count++;
    from = h.indexOf(n, from + n.length);
  }
  return count;
};

interface AILogicEditorProps {
  scripts: Script[];
  setScripts: (scripts: Script[]) => void;
  activeScriptId: string;
  setActiveScriptId: (id: string) => void;
  runtimeErrorsByScriptId?: Record<string, MarkedError[]>;
  /** A "go to line" from a debugger panel, for the active script. */
  jumpRequest?: { scriptId: string; line: number; column?: number; nonce: number } | null;
  /** The user's scripts repo (pull/push). */
  sync?: GitHubSync;
  /** Open Settings → GitHub. */
  onOpenGitHub?: () => void;
}

const AILogicEditor: React.FC<AILogicEditorProps> = ({
  scripts,
  setScripts,
  activeScriptId,
  setActiveScriptId,
  runtimeErrorsByScriptId = {},
  jumpRequest = null,
  sync,
  onOpenGitHub,
}) => {
  const handleCodeChange = (scriptId: string, newCode: string) => {
    setScripts(scripts.map(s => (s.id === scriptId ? { ...s, code: newCode } : s)));
  };

  const activeScript = scripts.find(s => s.id === activeScriptId);

  const { isCompact } = useLayoutMode();
  // Too narrow for explorer + buffer side by side, so they become a master/detail
  // stack: the file list until you pick a file, then the editor.
  const [showExplorer, setShowExplorer] = useState(false);
  const explorerVisible = !isCompact || showExplorer || !activeScript;

  // ── Explorer search ─────────────────────────────────────────────────────────
  // Live query over both file names and file contents. `findRequest` carries the
  // query into the active file's editor find widget so the match is highlighted
  // there too; the nonce forces a re-trigger even for a repeated query.
  const [query, setQuery] = useState('');
  const [findRequest, setFindRequest] = useState<{ query: string; nonce: number } | null>(null);

  const results = useMemo(() => {
    const q = query.trim();
    return scripts.map(script => {
      const nameMatch = q ? script.name.toLowerCase().includes(q.toLowerCase()) : false;
      const contentMatches = q ? countMatches(script.code || '', q) : 0;
      return { script, nameMatch, contentMatches, visible: !q || nameMatch || contentMatches > 0 };
    });
  }, [scripts, query]);

  const visibleResults = results.filter(r => r.visible);

  const openScript = (script: Script, jumpToMatch: boolean) => {
    setActiveScriptId(script.id);
    setShowExplorer(false);
    // If the match is in the body (not just the name), open the file's find
    // widget on the same query so the hit is located inside the editor.
    if (jumpToMatch && query.trim()) {
      setFindRequest({ query: query.trim(), nonce: Date.now() });
    }
  };

  // Which files don't parse, so the list can flag them red the way an IDE marks
  // a broken file. Only a syntax check (not the full lint), and deferred so it
  // never runs in the middle of a keystroke — the Library can be ~300 KB.
  const deferredScripts = useDeferredValue(scripts);
  const errorIds = useMemo(() => {
    const set = new Set<string>();
    deferredScripts.forEach(s => {
      if (s.code && s.code.trim() && diagnoseSyntax(s.code)) set.add(s.id);
    });
    return set;
  }, [deferredScripts]);

  /** Sync state worth showing in the list (not "In sync"/"Not synced"). */
  const syncState = (name: string) => {
    const state = sync?.slots?.[name as ScriptSlot];
    return state && state !== 'same' && state !== 'untracked' ? SLOT_STATE_LABEL[state] : null;
  };

  const runtimeErrorIds = useMemo(() => new Set(Object.keys(runtimeErrorsByScriptId)), [runtimeErrorsByScriptId]);

  return (
    <div className="flex h-full bg-[#020617] text-zinc-300">
      <div
        className={`${explorerVisible ? 'flex' : 'hidden'} ${
          isCompact ? 'w-full' : 'w-60'
        } shrink-0 bg-[#060912] flex-col border-r border-zinc-800/60`}
      >
        <div className="h-11 flex items-center px-4 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-200">Scripts</h2>
        </div>
        <div className="p-2">
          <div className="flex items-center gap-2 bg-black/30 border border-zinc-800 rounded-md px-2.5 py-1.5 focus-within:border-zinc-600 transition-colors">
            <Search size={13} className="text-zinc-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
              placeholder="Search names & code"
              className="bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-full"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-white shrink-0" title="Clear (Esc)">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 px-2 pb-2 overflow-y-auto custom-scrollbar space-y-0.5">
          {visibleResults.length === 0 ? (
            <p className="px-2 py-3 text-xs text-zinc-500">No scripts match “{query.trim()}”.</p>
          ) : (
            visibleResults.map(({ script, nameMatch, contentMatches }) => {
              const active = activeScriptId === script.id;
              const broken = errorIds.has(script.id);
              const ranBad = runtimeErrorIds.has(script.id) && !broken;
              const lines = script.code ? script.code.split('\n').length : 0;
              return (
                <button
                  key={script.id}
                  onClick={() => openScript(script, contentMatches > 0 && !nameMatch)}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${
                    active ? 'bg-white/[0.07] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                  }`}
                >
                  <FileCode2 className={`mt-0.5 h-4 w-4 shrink-0 ${broken ? 'text-red-400' : ranBad ? 'text-amber-400' : active ? 'text-orange-300' : 'text-zinc-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm truncate ${broken ? 'text-red-300' : ''}`}>{script.name}</span>
                    <span className="block text-[11px] text-zinc-500 truncate">
                      {(() => {
                        if (broken) return 'Has a syntax error';
                        if (ranBad) return 'Failed in the last run';
                        const sync = syncState(script.name);
                        if (sync) return <span className={sync.cls}>{sync.text}</span>;
                        return ROLE[script.name] ?? (lines ? `${lines} lines` : 'Empty');
                      })()}
                    </span>
                  </span>
                  {contentMatches > 0 ? (
                    <span className="mt-0.5 text-[11px] font-mono text-zinc-400 tabular-nums bg-zinc-800/70 rounded px-1.5 shrink-0" title={`${contentMatches} match${contentMatches > 1 ? 'es' : ''} in code`}>
                      {contentMatches}
                    </span>
                  ) : (
                    <span className="mt-1 text-[11px] text-zinc-600 tabular-nums shrink-0" title="Lines">{lines || ''}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {sync && (
          <div className="border-t border-zinc-800/60 p-2 space-y-1.5">
            {sync.linked ? (
              <>
                <button
                  onClick={onOpenGitHub}
                  className="w-full flex items-center gap-1.5 text-left text-xs text-zinc-400 hover:text-zinc-200"
                  title="GitHub settings"
                >
                  <GitBranch size={13} className="shrink-0" />
                  <span className="truncate">{sync.config.owner}/{sync.config.repo}</span>
                  <span className="text-zinc-600 shrink-0">· {sync.config.branch}</span>
                </button>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => void sync.pull()}
                    disabled={!!sync.busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-xs text-zinc-200 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50"
                    title="Replace the scripts here with the versions on GitHub"
                  >
                    {sync.busy === 'pull' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Pull
                  </button>
                  <button
                    onClick={() => void sync.push(`Update ${sync.localChanges.join(', ')} (from Atlas)`)}
                    disabled={!!sync.busy || !sync.hasToken || sync.localChanges.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-xs text-white bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40"
                    title={!sync.hasToken ? 'Add a token in Settings → GitHub to push' : sync.localChanges.length ? `Commit ${sync.localChanges.join(', ')} to GitHub` : 'Nothing changed since the last sync'}
                  >
                    {sync.busy === 'push' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Push{sync.localChanges.length ? ` ${sync.localChanges.length}` : ''}
                  </button>
                </div>
                {sync.message && (
                  <p className={`text-[11px] leading-snug ${sync.message.kind === 'error' ? 'text-red-300' : 'text-zinc-500'}`}>
                    {sync.message.text}
                    {sync.message.url && <> <a href={sync.message.url} target="_blank" rel="noopener noreferrer" className="underline">View</a></>}
                  </p>
                )}
              </>
            ) : (
              <button
                onClick={onOpenGitHub}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-500 hover:text-white"
              >
                <GitBranch size={13} /> Link your scripts to GitHub
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className={`${
          explorerVisible && isCompact ? 'hidden' : 'flex'
        } flex-1 flex-col overflow-hidden min-w-0 min-h-0`}
      >
        {activeScript ? (
          <div className="flex-1 relative min-h-0">
            <CodeBuffer
              id={activeScript.id}
              title={activeScript.name}
              subtitle={ROLE[activeScript.name] ?? activeScript.description}
              value={activeScript.code}
              onChange={(newCode) => handleCodeChange(activeScript.id, newCode)}
              color="text-green-400"
              isActive={true}
              findRequest={findRequest}
              runtimeErrors={runtimeErrorsByScriptId[activeScript?.id] ?? []}
              jumpRequest={jumpRequest && jumpRequest.scriptId === activeScript?.id ? jumpRequest : null}
              onShowFiles={isCompact ? () => setShowExplorer(true) : undefined}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-zinc-500">Pick a script on the left to start editing.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AILogicEditor;
