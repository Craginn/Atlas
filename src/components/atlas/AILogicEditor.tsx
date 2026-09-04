import React, { useMemo, useState } from 'react';
import CodeBuffer from './CodeBuffer';
import { Script } from '@/types';
import { FileJson, ChevronLeft, Search, X } from 'lucide-react';
import { validateScriptSyntax } from '@/services/offlineSimulationService';
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
  runtimeErrorsByScriptId?: Record<string, { line: number; message: string }[]>;
}

const AILogicEditor: React.FC<AILogicEditorProps> = ({
  scripts,
  setScripts,
  activeScriptId,
  setActiveScriptId,
  runtimeErrorsByScriptId = {}
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

  // Which files currently have validation errors, so the explorer can flag them
  // red the way an IDE marks a broken file.
  const errorIds = useMemo(() => {
    const set = new Set<string>();
    scripts.forEach(s => {
      if (s.code && s.code.trim() && !validateScriptSyntax(s.code, s.name !== 'Library').valid) {
        set.add(s.id);
      }
    });
    return set;
  }, [scripts]);

  const runtimeErrorIds = useMemo(() => new Set(Object.keys(runtimeErrorsByScriptId)), [runtimeErrorsByScriptId]);

  return (
    <div className="flex h-full bg-[#1e1e1e] text-zinc-300">
      <div
        className={`${explorerVisible ? 'flex' : 'hidden'} ${
          isCompact ? 'w-full' : 'w-56'
        } shrink-0 bg-[#1e1e1e] flex-col border-r border-zinc-800/50`}
      >
        <div className="h-10 flex items-center px-4 border-b border-zinc-800/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Code Explorer</h2>
        </div>
        <div className="px-2 pt-2 pb-1">
          <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 focus-within:border-orange-500/50 transition-colors">
            <Search size={12} className="text-zinc-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
              placeholder="Search files & code"
              className="bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-full font-mono"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-white shrink-0" title="Clear (Esc)">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 py-1 overflow-y-auto custom-scrollbar">
          {visibleResults.length === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-600 italic">No files match “{query.trim()}”.</p>
          ) : (
            visibleResults.map(({ script, nameMatch, contentMatches }) => (
              <button
                key={script.id}
                onClick={() => openScript(script, contentMatches > 0 && !nameMatch)}
                className={`w-full flex items-center px-4 py-1.5 text-sm text-left relative transition-colors ${
                  activeScriptId === script.id
                    ? 'text-white bg-zinc-700/30'
                    : 'text-zinc-400 hover:bg-zinc-700/20'
                }`}
              >
                {activeScriptId === script.id && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-orange-500" />
                )}
                <FileJson className={`mr-2.5 h-4 w-4 shrink-0 ${errorIds.has(script.id) ? 'text-red-500' : 'text-orange-400'}`} />
                <span className={`truncate ${errorIds.has(script.id) ? 'text-red-400' : ''}`}>{script.name}</span>
                {contentMatches > 0 && (
                  <span className="ml-auto text-[10px] font-mono text-zinc-500 tabular-nums bg-zinc-800/60 rounded px-1.5 py-0.5 shrink-0" title={`${contentMatches} match${contentMatches > 1 ? 'es' : ''} in code`}>
                    {contentMatches}
                  </span>
                )}
                {errorIds.has(script.id) && contentMatches === 0 && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                )}
                {runtimeErrorIds.has(script.id) && !errorIds.has(script.id) && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
      <div
        className={`${
          explorerVisible && isCompact ? 'hidden' : 'flex'
        } flex-1 flex-col overflow-hidden min-w-0 min-h-0`}
      >
        {activeScript ? (
          <>
            <div className="h-10 flex-shrink-0 bg-[#1e1e1e] border-b border-zinc-800/50 px-4 flex items-center gap-2 min-w-0">
              {isCompact && (
                <button
                  onClick={() => setShowExplorer(true)}
                  className="flex items-center gap-1 -ml-2 px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors shrink-0"
                >
                  <ChevronLeft size={14} />
                  <span>Files</span>
                </button>
              )}
              <span className="font-mono text-xs text-zinc-500 italic truncate">{activeScript.description}</span>
            </div>
            <div className="flex-1 relative min-h-0">
              <CodeBuffer
                id={activeScript.id}
                title={activeScript.name}
                value={activeScript.code}
                onChange={(newCode) => handleCodeChange(activeScript.id, newCode)}
                color="text-green-400"
                isActive={true}
                findRequest={findRequest}
                runtimeErrors={runtimeErrorsByScriptId[activeScript?.id] ?? []}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-zinc-500">Select a file to edit or create one.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AILogicEditor;
