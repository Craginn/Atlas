import React, { useState, useEffect, useRef } from 'react';
import { WorldState, ScriptStateTrace, HistoryEntry } from '@/types';
import { Database, Code, GitCommit, ArrowRight, Plus, Minus, FileJson, Hash, Archive, Info, Upload, ChevronDown, ChevronRight, History } from 'lucide-react';
import EditorDefault from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import '@/styles/prism-custom-theme.css';

// Normalize the default export: under some bundler interop paths the CJS default
// arrives as a namespace object ({ default: Editor }) rather than the component,
// which triggers React's "Element type is invalid" crash. Unwrap defensively.
const Editor = ((EditorDefault as unknown as { default?: typeof EditorDefault })?.default
  ?? EditorDefault) as typeof EditorDefault;

interface Delta {
  path: string;
  from: any;
  to: any;
  type: 'modified' | 'added' | 'removed';
  scriptId?: string;
  scriptName?: string;
}

const isPlainObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Deep-diff guard: state is user-authored and may be deeply nested or, once
// structured-cloned through the worker, wider than is useful to walk.
const MAX_DEPTH = 10;

// An added/removed container arrives whole (there is nothing on the other side
// to walk against), so it's emitted as a single delta and rendered as one box —
// the whole object/array pretty-printed by ValueRenderer, rather than split into
// a box per leaf field. `depth`/`MAX_DEPTH` are kept for signature parity with
// diff() and to leave room for a future depth cap.
const explode = (v: any, path: string, type: 'added' | 'removed', _depth: number): Delta[] => {
  return [type === 'added'
    ? { path, from: undefined, to: v, type }
    : { path, from: v, to: undefined, type }];
};

// The documented AID memory limit: 16 MB in bytes.
export const MEMORY_LIMIT_BYTES = 16 * 1024 * 1024; // 16777216 bytes

// Estimates the memory usage of a JavaScript value by measuring its JSON
// representation. This is a practical approximation: JSON.stringify captures
// the serialized size that would be stored/transmitted, which correlates well
// with actual heap usage for typical state objects. Returns bytes.
export const estimateMemoryUsage = (value: any): number => {
  try {
    const json = JSON.stringify(value);
    // Each character in the JSON string represents one byte (UTF-8 ASCII),
    // plus overhead for the JavaScript string representation (~2 bytes/char).
    // We use a conservative estimate of 2 bytes per character for UTF-16.
    return json.length * 2;
  } catch {
    // Circular reference or other serialization error — return 0 as fallback.
    return 0;
  }
};

// Calculates memory usage percentage relative to the 16MB AID limit.
// Returns a value between 0 and 100+.
export const calculateMemoryPercentage = (value: any): number => {
  const usage = estimateMemoryUsage(value);
  return (usage / MEMORY_LIMIT_BYTES) * 100;
};

// Formats memory usage for display (e.g., "2.45 MB", "156 KB").
export const formatMemoryUsage = (bytes: number): string => {
  if (bytes >= MEMORY_LIMIT_BYTES) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${bytes} B`;
  }
};

// Diffs any two values without knowledge of their shape, emitting dotted paths
// (`stats.hp`, `party.0.name`). State has no fixed schema — scripts invent keys.
export const diff = (a: any, b: any, path = '', depth = 0): Delta[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];

  if (depth < MAX_DEPTH && isPlainObject(a) && isPlainObject(b)) {
    return Object.keys({ ...a, ...b }).flatMap(k => {
      const next = path ? `${path}.${k}` : k;
      if (!(k in a)) return explode(b[k], next, 'added', depth + 1);
      if (!(k in b)) return explode(a[k], next, 'removed', depth + 1);
      return diff(a[k], b[k], next, depth + 1);
    });
  }

  if (depth < MAX_DEPTH && Array.isArray(a) && Array.isArray(b)) {
    return Array.from({ length: Math.max(a.length, b.length) }).flatMap((_, i) => {
      const next = `${path}.${i}`;
      if (i >= a.length) return explode(b[i], next, 'added', depth + 1);
      if (i >= b.length) return explode(a[i], next, 'removed', depth + 1);
      return diff(a[i], b[i], next, depth + 1);
    });
  }

  return [{ path: path || '(root)', from: a, to: b, type: 'modified' }];
};

const ValueRenderer = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return <span className="text-zinc-600 italic">null</span>;
  if (typeof value === 'object') return (
    <pre className="text-zinc-500 text-opacity-80 whitespace-pre-wrap break-all font-mono">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
  return <span className="text-zinc-300 break-all">{JSON.stringify(value)}</span>;
};

const DeltaItem: React.FC<{ delta: Delta; showPrevious?: boolean }> = ({ delta, showPrevious = false }) => {
  // Icon reflects the value's type, since paths are arbitrary and carry no
  // schema meaning we could key an icon off.
  const v = delta.to ?? delta.from;
  const icon = Array.isArray(v) ? <Archive size={12} />
    : isPlainObject(v) ? <FileJson size={12} />
    : typeof v === 'number' ? <Hash size={12} />
    : <Info size={12} />;

  return (
    <div className="flex items-start space-x-4 p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-lg text-[11px] font-mono">
      <div className="mt-0.5 p-1 rounded-md bg-blue-500/10 text-blue-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0 flex flex-col space-y-1">
        <span className="text-blue-300/60 font-black tracking-wider break-all">{delta.path}</span>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* A modified value normally shows only what it became — the previous
              value is noise once a run succeeded. When the run failed it is the
              opposite: seeing what a key was before the throw is the point, so
              the struck-through original comes back. */}
          {delta.type === 'modified' && <>
            {showPrevious && <>
              <ArrowRight size={10} className="text-zinc-600 shrink-0" />
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md line-through min-w-0 break-all"><ValueRenderer value={delta.from} /></span>
            </>}
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md min-w-0 break-all"><ValueRenderer value={delta.to} /></span>
          </>}
          {delta.type === 'added' && <>
            <Plus size={10} className="text-emerald-500 shrink-0" />
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md min-w-0 break-all"><ValueRenderer value={delta.to} /></span>
          </>}
          {delta.type === 'removed' && <>
            <Minus size={10} className="text-red-500 shrink-0" />
            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md min-w-0 break-all"><ValueRenderer value={delta.from} /></span>
          </>}
        </div>
      </div>
    </div>
  );
};

const DeltaView: React.FC<{
  oldState: WorldState | null;
  newState: WorldState;
  stateTrace?: ScriptStateTrace[];
  /** The run threw — keep the pre-change values visible for debugging. */
  hasError?: boolean;
}> = ({ oldState, newState, stateTrace, hasError = false }) => {
  // Empty set = every box expanded, which is the default.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Prefer per-script attribution when the last run produced a trace; otherwise
  // fall back to a single anonymous diff (manual edits, remote-only runs).
  const traced = (stateTrace ?? []).filter(t => t.stateChanged);
  const groups = traced.length > 0
    ? traced.map(t => ({
        key: t.scriptId,
        label: t.scriptName,
        deltas: diff(t.before, t.after).map(d => ({ ...d, scriptId: t.scriptId, scriptName: t.scriptName })),
      })).filter(g => g.deltas.length > 0)
    : (() => {
        const deltas = diff(oldState ?? {}, newState);
        return deltas.length > 0 ? [{ key: '__manual__', label: '', deltas }] : [];
      })();

  // Within a hook's box, changes are grouped per top-level state key (PS, MS,
  // memory, …) so each sub-state gets its own box. Insertion order — which is
  // diff order, which is key order in the state — is preserved.
  const bySubState = (deltas: Delta[]): [string, Delta[]][] => {
    const m = new Map<string, Delta[]>();
    for (const d of deltas) {
      const top = d.path.split('.')[0] || '(root)';
      const list = m.get(top);
      if (list) list.push(d); else m.set(top, [d]);
    }
    return [...m.entries()];
  };

  const total = groups.reduce((n, g) => n + g.deltas.length, 0);
  const allCollapsed = groups.length > 0 && groups.every(g => collapsed.has(g.key));
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(groups.map(g => g.key)));

  if (total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black/40 text-zinc-600 space-y-4">
        <Info size={32} />
        <div className="max-w-xs">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            {!oldState ? 'Awaiting State Change' : 'No State Changes Detected'}
          </h3>
          <p className="text-xs italic mt-1">{!oldState ? 'No previous state to compare.' : ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 custom-scrollbar bg-black/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-mono text-zinc-500/50 uppercase">Showing {total} change(s):</p>
        <button
          onClick={toggleAll}
          className="text-[9px] font-mono uppercase text-zinc-500/50 hover:text-zinc-300 transition-colors shrink-0"
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.key);
        return (
          // Each hook (Input / Context / Output) is its own section box; every
          // state change within it renders as a nested sub-box (DeltaItem).
          <div key={group.key} className="rounded-xl border border-zinc-700/40 bg-black/20 p-3 space-y-3 min-w-0">
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center gap-2 min-w-0 text-left hover:bg-zinc-800/30 rounded-md transition-colors"
            >
              {isCollapsed
                ? <ChevronRight size={12} className="text-zinc-500 shrink-0" />
                : <ChevronDown size={12} className="text-zinc-500 shrink-0" />}
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300/80 text-[9px] font-black uppercase tracking-widest break-all">
                {group.label || 'State'}
              </span>
              <span className="text-[9px] font-mono text-zinc-600 shrink-0">{group.deltas.length} change(s)</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-2 min-w-0">
                {bySubState(group.deltas).map(([topKey, deltas]) => {
                  const subKey = `${group.key}:${topKey}`;
                  const subCollapsed = collapsed.has(subKey);
                  return (
                    <div key={subKey} className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 p-2 space-y-2 min-w-0">
                      <button
                        onClick={() => toggleGroup(subKey)}
                        className="w-full flex items-center gap-2 min-w-0 text-left hover:bg-zinc-800/30 rounded-md transition-colors"
                      >
                        {subCollapsed
                          ? <ChevronRight size={10} className="text-zinc-600 shrink-0" />
                          : <ChevronDown size={10} className="text-zinc-600 shrink-0" />}
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-300/90 text-[9px] font-black tracking-widest break-all">
                          {topKey}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-600 shrink-0">{deltas.length} change(s)</span>
                      </button>
                      {!subCollapsed && (
                        <div className="space-y-2 min-w-0">
                          {deltas.map((delta, i) => (
                            <DeltaItem key={`${subKey}-${i}`} delta={delta} showPrevious={hasError} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Per-type styling for a history entry's badge. `start` is the scenario opening,
// `continue` the AI's output, the rest are the player's Do/Say/Story actions.
const ENTRY_STYLE: Record<HistoryEntry['type'], { label: string; cls: string }> = {
  start: { label: 'START', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  continue: { label: 'AI', cls: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  do: { label: 'DO', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  say: { label: 'SAY', cls: 'text-violet-300 bg-violet-500/10 border-violet-500/30' },
  story: { label: 'STORY', cls: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
};

/**
 * The History tab: the narrative text, out of the state JSON and grouped by the
 * turn each entry was created on. Turns render newest-first so the latest is on
 * top without scrolling; entries within a turn keep story order (action, then
 * the output it produced).
 */
const HistoryView: React.FC<{ history: HistoryEntry[] }> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8 bg-black/40">
        <div className="space-y-2">
          <History size={28} className="mx-auto text-zinc-700" />
          <p className="text-[11px] text-zinc-500 font-mono">No history yet.</p>
          <p className="text-[10px] text-zinc-600">Run a turn and the narrative lands here, pinned to its turn.</p>
        </div>
      </div>
    );
  }

  // Group into turns, preserving order. Entries predating turn stamping fall under
  // turn 0, shown as "—" rather than a wrong number.
  const groups: { turn: number; entries: HistoryEntry[] }[] = [];
  for (const entry of history) {
    const turn = entry.turn ?? 0;
    const last = groups[groups.length - 1];
    if (last && last.turn === turn) last.entries.push(entry);
    else groups.push({ turn, entries: [entry] });
  }
  groups.reverse();

  return (
    <div className="flex-1 overflow-auto bg-black/40 p-3 space-y-3 font-sans">
      {groups.map(({ turn, entries }) => (
        <div key={turn} className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800/60">
            <Hash size={11} className="text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {turn === 0 ? 'Turn —' : `Turn ${turn}`}
            </span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {entries.map((entry, i) => {
              const style = ENTRY_STYLE[entry.type] ?? ENTRY_STYLE.do;
              return (
                <div key={i} className="flex items-start space-x-2.5 px-3 py-2">
                  <span className={`shrink-0 mt-0.5 text-[8px] font-black uppercase tracking-wider border rounded px-1.5 py-0.5 ${style.cls}`}>
                    {style.label}
                  </span>
                  <pre className="flex-1 min-w-0 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-300 font-mono">
                    {entry.text}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

interface EditorProps {
  worldState: WorldState;
  setWorldState: (ws: WorldState) => void;
  previousWorldState: WorldState | null;
  stateTrace?: ScriptStateTrace[];
  /** Set when the last run threw; widens the Delta view back to before → after. */
  hasError?: boolean;
  /**
   * AID's `history`, kept beside the state rather than inside it. Rendered in its
   * own tab so the growing narrative text has a home separate from the state JSON.
   */
  history?: HistoryEntry[];
}

const StateEditor: React.FC<EditorProps> = ({ worldState, setWorldState, previousWorldState, stateTrace, hasError, history = [] }) => {
  const [localText, setLocalText] = useState(JSON.stringify(worldState, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [activeTab, setActiveTab] = useState<'raw' | 'delta' | 'history'>('raw');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentString = JSON.stringify(worldState, null, 2);
    if (localText !== currentString) {
      setLocalText(currentString);
      setIsValid(true);
    }
  }, [worldState]);

  const handleStateChange = (newVal: string) => {
    setLocalText(newVal);
    try {
      const parsed = JSON.parse(newVal);
      setWorldState(parsed);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  // Upload a JSON file to populate/replace WorldState. Accepts any valid JSON
  // object — WorldState's index signature allows arbitrary custom keys.
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Uploaded JSON must be an object.');
        }
        setWorldState(parsed);
        setUploadError(null);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Invalid JSON file.');
      }
    };
    reader.onerror = () => setUploadError('Failed to read file.');
    reader.readAsText(file);
    // Reset so re-uploading the same file re-triggers onChange.
    event.target.value = '';
  };

  const TabButton: React.FC<{ id: 'raw' | 'delta' | 'history'; icon: React.ElementType; label: string }> = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${
        activeTab === id
          ? 'text-blue-400 border-blue-400 bg-blue-500/5'
          : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/20'
      }`}
    >
      <Icon size={12} />
      <span>{label}</span>
    </button>
  );

  const lineCount = localText.split('\n').length;

  // Calculate current memory usage and percentage of 16MB limit.
  const memoryUsageBytes = estimateMemoryUsage(worldState);
  const memoryUsageFormatted = formatMemoryUsage(memoryUsageBytes);
  const memoryPercentage = calculateMemoryPercentage(worldState).toFixed(2);

  // Keep the line-number gutter locked to the editor's vertical scroll. The gutter
  // and the code live in separate scroll boxes, so without this the numbers stay
  // put while the code moves — they must track 1:1.
  const gutterRef = useRef<HTMLDivElement>(null);
  const handleRawScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-r border-zinc-800/50 overflow-hidden font-sans select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center space-x-2">
          <Database size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Project State</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2" title="Memory usage: JSON serialized size vs 16MB AID limit">
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Memory:</span>
            <span className={`text-[9px] font-mono font-black ${
              parseFloat(memoryPercentage) >= 90 ? 'text-red-400' : 
              parseFloat(memoryPercentage) >= 70 ? 'text-amber-400' : 
              'text-emerald-400'
            }`}>
              {memoryUsageFormatted} ({memoryPercentage}%)
            </span>
            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden" title="Visual memory gauge">
              <div 
                className={`h-full transition-all duration-300 ${
                  parseFloat(memoryPercentage) >= 90 ? 'bg-red-500' : 
                  parseFloat(memoryPercentage) >= 70 ? 'bg-amber-500' : 
                  'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, parseFloat(memoryPercentage))}%` }}
              />
            </div>
          </div>
          {!isValid && <span className="text-[9px] text-red-400 font-mono">Invalid JSON</span>}
          {uploadError && <span className="text-[9px] text-red-400 font-mono">{uploadError}</span>}
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".json,application/json" />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload a JSON file to replace the world state"
            className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <Upload size={11} />
            <span>Upload JSON</span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-zinc-800 bg-black/20">
        <TabButton id="raw" icon={Code} label="Raw State" />
        <TabButton id="delta" icon={GitCommit} label="State Deltas" />
        <TabButton id="history" icon={History} label={`History${history.length ? ` (${history.length})` : ''}`} />
      </div>

      {activeTab === 'raw' ? (
        <div className="flex-1 relative overflow-hidden flex bg-black/40">
          <div
            ref={gutterRef}
            className="w-10 shrink-0 bg-zinc-900/30 text-right pr-2 pt-2.5 text-white text-sm font-mono select-none overflow-hidden"
          >
            {Array.from({ length: lineCount }, (_, i) => <div key={i} className="leading-5 h-5">{i + 1}</div>)}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }} onScroll={handleRawScroll}>
            <Editor
              value={localText}
              onValueChange={handleStateChange}
              highlight={code => (Prism.languages.json ? Prism.highlight(code, Prism.languages.json, 'json') : code)}
              padding={10}
              className="text-sm font-mono leading-5 focus:outline-none min-h-full"
              style={{ fontFamily: '"Fira Code", monospace' }}
            />
          </div>
        </div>
      ) : activeTab === 'delta' ? (
        <DeltaView oldState={previousWorldState} newState={worldState} stateTrace={stateTrace} hasError={hasError} />
      ) : (
        <HistoryView history={history} />
      )}
    </div>
  );
};

export default StateEditor;
