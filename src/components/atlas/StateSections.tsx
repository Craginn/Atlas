import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, Search, X, Pencil, Check, Copy, ArrowDownUp, Sparkles, ChevronsDownUp,
  ChevronsUpDown, Filter,
} from 'lucide-react';
import JsonEditor from './JsonEditor';
import {
  ancestorsOf, buildSections, relativePath, searchSection, sortSections,
  type ChangeLike, type SortMode, type StateSection,
} from '@/services/stateSections';

// The State Editor's "Sections" tab: every top-level state key in its own
// scrollable box, with search, sorting, and a jump list of the keys the last
// turn changed.
//
// Rendering budget: boxes use `content-visibility: auto` (off-screen boxes are
// not laid out), trees expand one level by default and page children 100 at a
// time, search is deferred and capped per section, and a box can be edited on
// its own instead of re-rendering the whole state as one document.

const PAGE = 100;
const MAX_STRING_PREVIEW = 300;

interface Props {
  state: Record<string, unknown>;
  setState: (next: Record<string, unknown>) => void;
  /** Changes made by the last turn (full dotted paths). */
  changes: ChangeLike[];
  /** Where `changes` came from, for the label. */
  changeSource: 'turn' | 'edit' | null;
}

const fmtBytes = (b: number) => (b >= 1024 * 1024 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);

const preview = (v: unknown): string => {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
};

/** Highlight occurrences of the query inside a string. */
const Marked: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  for (let at = lower.indexOf(ql); at !== -1 && parts.length < 40; at = lower.indexOf(ql, i)) {
    if (at > i) parts.push(text.slice(i, at));
    parts.push(<mark key={at} className="bg-yellow-400/30 text-yellow-100 rounded-sm">{text.slice(at, at + q.length)}</mark>);
    i = at + q.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
};

const VALUE_CLASS: Record<string, string> = {
  string: 'text-[#ffab70]',
  number: 'text-[#f78c6c]',
  boolean: 'text-[#ff9e64]',
  null: 'text-zinc-500 italic',
  undefined: 'text-zinc-600 italic',
};

interface TreeCtx {
  query: string;
  hits: Set<string>;
  open: Set<string>; // ancestors of hits + changes: auto-expanded
  changed: Map<string, ChangeLike>;
  expandAll: number; // bumps to force-expand; negative bumps to force-collapse
}

/** One node of the lazy JSON tree. Children render only while expanded, paged. */
const TreeNode: React.FC<{ name: string; value: unknown; path: string; depth: number; ctx: TreeCtx }> = memo(
  ({ name, value, path, depth, ctx }) => {
    const isContainer = value !== null && typeof value === 'object';
    const auto = depth === 0 || ctx.open.has(path);
    const [override, setOverride] = useState<boolean | null>(null);
    const [shown, setShown] = useState(PAGE);
    const [fullString, setFullString] = useState(false);

    // Expand/collapse-all from the toolbar resets per-node choices.
    useEffect(() => {
      if (ctx.expandAll === 0) return;
      setOverride(ctx.expandAll > 0 ? depth < 3 : depth === 0 ? true : false);
    }, [ctx.expandAll, depth]);

    const expanded = override ?? auto;
    const change = ctx.changed.get(path);
    const hit = ctx.hits.has(path);
    const changeCls = change
      ? change.type === 'added'
        ? 'bg-emerald-500/10 border-l-2 border-emerald-400/70'
        : change.type === 'removed'
          ? 'bg-red-500/10 border-l-2 border-red-400/70'
          : 'bg-amber-500/10 border-l-2 border-amber-400/70'
      : 'border-l-2 border-transparent';
    const changeTitle = change
      ? change.type === 'modified'
        ? `Changed last turn — was ${preview(change.from).slice(0, 200)}`
        : change.type === 'added' ? 'Added last turn' : 'Removed last turn'
      : undefined;

    const label = name && (
      <span className={`shrink-0 ${hit ? 'text-yellow-200' : 'text-[#f07178]'}`}>
        <Marked text={name} query={ctx.query} />
        <span className="text-zinc-600">: </span>
      </span>
    );

    if (!isContainer) {
      const kind = value === undefined ? 'undefined' : value === null ? 'null' : typeof value;
      let shownText = preview(value);
      const long = typeof value === 'string' && shownText.length > MAX_STRING_PREVIEW;
      if (long && !fullString) shownText = `${shownText.slice(0, MAX_STRING_PREVIEW)}…`;
      return (
        <div className={`flex items-start pl-1 pr-2 py-px rounded-sm ${changeCls}`} title={changeTitle} data-path={path}>
          {label}
          <span className={`${VALUE_CLASS[kind] ?? 'text-zinc-300'} break-all whitespace-pre-wrap`}>
            <Marked text={shownText} query={ctx.query} />
          </span>
          {long && (
            <button onClick={() => setFullString(f => !f)} className="ml-2 shrink-0 text-[9px] text-blue-400 hover:text-blue-300">
              {fullString ? 'less' : 'more'}
            </button>
          )}
        </div>
      );
    }

    const isArray = Array.isArray(value);
    const entries: [string, unknown][] = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v])
      : Object.entries(value as Record<string, unknown>);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';

    return (
      <div data-path={path}>
        {depth > 0 && (
          <button
            onClick={() => setOverride(!expanded)}
            className={`w-full flex items-center text-left pl-0 pr-2 py-px rounded-sm hover:bg-zinc-800/40 ${changeCls}`}
            title={changeTitle}
          >
            {expanded ? <ChevronDown size={10} className="text-zinc-500 shrink-0" /> : <ChevronRight size={10} className="text-zinc-500 shrink-0" />}
            {label}
            <span className="text-zinc-500">{open}</span>
            {!expanded && (
              <span className="text-zinc-600 mx-1">{entries.length} {isArray ? 'items' : 'keys'}</span>
            )}
            {!expanded && <span className="text-zinc-500">{close}</span>}
          </button>
        )}
        {expanded && (
          <div className={depth > 0 ? 'ml-3 pl-2 border-l border-zinc-800/70' : ''}>
            {entries.length === 0 && <div className="text-zinc-600 italic pl-1">empty {isArray ? 'array' : 'object'}</div>}
            {entries.slice(0, shown).map(([k, v]) => (
              <TreeNode key={k} name={k} value={v} path={path ? `${path}.${k}` : k} depth={depth + 1} ctx={ctx} />
            ))}
            {entries.length > shown && (
              <button
                onClick={() => setShown(s => s + PAGE)}
                className="pl-1 py-0.5 text-[10px] text-blue-400 hover:text-blue-300"
              >
                Show {Math.min(PAGE, entries.length - shown)} more of {entries.length - shown} remaining…
              </button>
            )}
          </div>
        )}
        {expanded && depth > 0 && <div className="text-zinc-500 pl-3">{close}</div>}
      </div>
    );
  },
);
TreeNode.displayName = 'TreeNode';

const KIND_BADGE: Record<string, (s: StateSection) => string> = {
  object: s => `{${s.count}}`,
  array: s => `[${s.count}]`,
  string: s => `"${s.count}"`,
  number: () => 'num',
  boolean: () => 'bool',
  null: () => 'null',
  other: () => '—',
};

interface BoxProps {
  section: StateSection;
  query: string;
  hits: string[];
  truncated: boolean;
  collapsed: boolean;
  flashing: boolean;
  expandAll: number;
  onToggle: (key: string) => void;
  onApply: (key: string, value: unknown) => void;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
}

const SectionBox: React.FC<BoxProps> = memo(({
  section, query, hits, truncated, collapsed, flashing, expandAll, onToggle, onApply, registerRef,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ctx = useMemo<TreeCtx>(() => {
    const changed = new Map(section.changes.map(c => [relativePath(c.path), c]));
    const rel = [...changed.keys()];
    return {
      query,
      hits: new Set(hits),
      open: ancestorsOf([...hits, ...rel]),
      changed,
      expandAll,
    };
  }, [section.changes, hits, query, expandAll]);

  const startEdit = () => {
    setDraft(JSON.stringify(section.value, null, 2) ?? '');
    setError(null);
    setEditing(true);
  };
  const apply = () => {
    try {
      onApply(section.key, JSON.parse(draft));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const changedCount = section.changes.length;

  return (
    <div
      ref={el => registerRef(section.key, el)}
      className={`rounded-xl border bg-black/20 min-w-0 transition-shadow duration-500 ${
        flashing ? 'ring-2 ring-amber-400/80 border-amber-400/60'
          : changedCount ? 'border-amber-500/30' : 'border-zinc-700/40'
      }`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 120px' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 min-w-0">
        <button onClick={() => onToggle(section.key)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {collapsed ? <ChevronRight size={12} className="text-zinc-500 shrink-0" /> : <ChevronDown size={12} className="text-zinc-500 shrink-0" />}
          <span className="font-mono text-[12px] font-bold text-zinc-100 truncate">
            <Marked text={section.key} query={query} />
          </span>
          <span className="text-[9px] font-mono text-zinc-500 shrink-0">{KIND_BADGE[section.kind](section)}</span>
          <span className="text-[9px] font-mono text-zinc-600 shrink-0">{fmtBytes(section.bytes)}</span>
          {changedCount > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 shrink-0"
              title={section.changes.map(c => `${c.type}: ${c.path}`).join('\n')}
            >
              ● {section.removed ? 'removed' : `${changedCount} changed`}
            </span>
          )}
          {query && hits.length > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-200 shrink-0">
              {hits.length}{truncated ? '+' : ''} match{hits.length === 1 ? '' : 'es'}
            </span>
          )}
        </button>
        {!section.removed && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(section.value, null, 2) ?? '')}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
              title="Copy this section as JSON"
            >
              <Copy size={11} />
            </button>
            <button
              onClick={editing ? () => setEditing(false) : startEdit}
              className={`p-1 rounded hover:bg-zinc-800/50 ${editing ? 'text-blue-300' : 'text-zinc-500 hover:text-zinc-200'}`}
              title={editing ? 'Cancel editing' : 'Edit this section as JSON'}
            >
              {editing ? <X size={11} /> : <Pencil size={11} />}
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-zinc-800/60">
          {section.removed ? (
            <div className="px-3 py-2 text-[11px] font-mono text-red-300/80">
              Removed last turn. Previous value:
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all text-red-200/60">
                {JSON.stringify(section.changes[0]?.from, null, 2)}
              </pre>
            </div>
          ) : editing ? (
            <div className="flex flex-col">
              <div className="h-72 min-h-0 overflow-hidden">
                <JsonEditor value={draft} onChange={setDraft} height="18rem" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border-t border-zinc-800/60">
                <button
                  onClick={apply}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest"
                >
                  <Check size={11} /> Apply
                </button>
                <button onClick={() => setEditing(false)} className="text-[10px] text-zinc-400 hover:text-zinc-200 uppercase tracking-widest">
                  Cancel
                </button>
                {error && <span className="text-[10px] font-mono text-red-400 truncate">{error}</span>}
              </div>
            </div>
          ) : (
            <div className="max-h-[22rem] overflow-auto custom-scrollbar px-2 py-1.5 text-[11px] leading-5 font-mono">
              <TreeNode name="" value={section.value} path="" depth={0} ctx={ctx} />
            </div>
          )}
        </div>
      )}
    </div>
  );
});
SectionBox.displayName = 'SectionBox';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'state', label: 'State order' },
  { id: 'changed', label: 'Changed first' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'size', label: 'Largest first' },
];

const StateSections: React.FC<Props> = ({ state, setState, changes, changeSource }) => {
  const [queryInput, setQueryInput] = useState('');
  // Typing stays responsive: the search over every section runs at low priority.
  const query = useDeferredValue(queryInput);
  const [sort, setSort] = useState<SortMode>('state');
  const [changedOnly, setChangedOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(0);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const cursor = useRef(-1);

  const sections = useMemo(() => buildSections(state, changes), [state, changes]);
  const searches = useMemo(() => {
    const m = new Map<string, ReturnType<typeof searchSection>>();
    if (!query.trim()) return m;
    for (const s of sections) m.set(s.key, searchSection(s.key, s.value, query));
    return m;
  }, [sections, query]);

  const changedSections = useMemo(() => sections.filter(s => s.changes.length > 0), [sections]);

  const visible = useMemo(() => {
    let list = sortSections(sections, sort);
    if (changedOnly) list = list.filter(s => s.changes.length > 0);
    if (query.trim()) list = list.filter(s => (searches.get(s.key)?.hits.length ?? 0) > 0);
    return list;
  }, [sections, sort, changedOnly, query, searches]);

  const totalHits = useMemo(
    () => [...searches.values()].reduce((n, r) => n + r.hits.length, 0),
    [searches],
  );

  const registerRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) refs.current.set(key, el); else refs.current.delete(key);
  }, []);

  const toggle = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const apply = useCallback((key: string, value: unknown) => {
    setState({ ...state, [key]: value });
  }, [state, setState]);

  /** Scroll a section into view, open it, and flash its border. */
  const jumpTo = useCallback((key: string) => {
    setCollapsed(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    // If filters hide it, clear them so the jump lands.
    if (!visible.some(s => s.key === key)) {
      setChangedOnly(false);
      setQueryInput('');
    }
    requestAnimationFrame(() => {
      refs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    setFlash(key);
  }, [visible]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(id);
  }, [flash]);

  const nextChange = () => {
    if (!changedSections.length) return;
    cursor.current = (cursor.current + 1) % changedSections.length;
    jumpTo(changedSections[cursor.current].key);
  };

  const allCollapsed = visible.length > 0 && visible.every(s => collapsed.has(s.key));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black/40 select-text">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-zinc-800/60">
        <div className="relative flex-1 min-w-[12rem]">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder="Search keys and values…"
            className="w-full pl-7 pr-7 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60"
          />
          {queryInput && (
            <button onClick={() => setQueryInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200">
              <X size={12} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-1 text-[10px] text-zinc-400">
          <ArrowDownUp size={11} />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
            className="bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-[10px] text-zinc-300 focus:outline-none"
          >
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <button
          onClick={() => setChangedOnly(v => !v)}
          disabled={!changedSections.length}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border disabled:opacity-40 ${
            changedOnly ? 'border-amber-400/60 text-amber-300 bg-amber-500/10' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Show only sections changed last turn"
        >
          <Filter size={10} /> Changed only
        </button>
        <button
          onClick={() => {
            setCollapsed(allCollapsed ? new Set() : new Set(visible.map(s => s.key)));
            setExpandAll(n => (allCollapsed ? Math.abs(n) + 1 : -(Math.abs(n) + 1)));
          }}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-200"
        >
          {allCollapsed ? <ChevronsUpDown size={11} /> : <ChevronsDownUp size={11} />}
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>

      {/* Last-turn jump list */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-zinc-800/60 overflow-x-auto whitespace-nowrap custom-scrollbar">
        <Sparkles size={11} className="text-amber-400 shrink-0" />
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 shrink-0">
          {changeSource === 'edit' ? 'Changed since last edit' : 'Updated last turn'}
        </span>
        {changedSections.length === 0 ? (
          <span className="text-[10px] font-mono text-zinc-600 italic">nothing yet — run a turn</span>
        ) : (
          <>
            {changedSections.map(s => (
              <button
                key={s.key}
                onClick={() => jumpTo(s.key)}
                className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px] font-mono hover:bg-amber-500/20"
                title={s.changes.map(c => `${c.type}: ${c.path}`).join('\n')}
              >
                {s.key} <span className="text-amber-400/70">·{s.changes.length}</span>
              </button>
            ))}
            <button
              onClick={nextChange}
              className="shrink-0 ml-1 text-[10px] uppercase tracking-widest text-amber-300/80 hover:text-amber-200"
              title="Jump to the next changed section"
            >
              Next ↓
            </button>
          </>
        )}
      </div>

      {query.trim() && (
        <div className="px-4 py-1 text-[10px] font-mono text-zinc-500 border-b border-zinc-800/40">
          {totalHits} match{totalHits === 1 ? '' : 'es'} in {visible.length} section{visible.length === 1 ? '' : 's'}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 custom-scrollbar">
        {sections.length === 0 && (
          <div className="text-center text-[11px] text-zinc-500 font-mono py-10">
            State is empty. Run a turn, or add keys in the Raw State tab.
          </div>
        )}
        {sections.length > 0 && visible.length === 0 && (
          <div className="text-center text-[11px] text-zinc-500 font-mono py-10">No sections match.</div>
        )}
        {visible.map(s => {
          const r = searches.get(s.key);
          return (
            <SectionBox
              key={s.key}
              section={s}
              query={query}
              hits={r?.hits ?? EMPTY}
              truncated={r?.truncated ?? false}
              collapsed={collapsed.has(s.key)}
              flashing={flash === s.key}
              expandAll={expandAll}
              onToggle={toggle}
              onApply={apply}
              registerRef={registerRef}
            />
          );
        })}
      </div>
    </div>
  );
};

const EMPTY: string[] = [];

export default StateSections;
