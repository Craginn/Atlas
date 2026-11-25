import React, { useDeferredValue, useMemo, useState } from 'react';
import { Search, Eye, EyeOff, AlertOctagon, X } from 'lucide-react';
import { BLOCK_META, type BlockKind, type BlockNode } from '@/services/blocks/types';
import { describeBlock } from '@/services/blocks/guide';
import { generateCode } from '@/services/blocks/generate';

// The outline: every top-level block of the script as one searchable row.
//
// Large scripts (a Library can have hundreds of top-level blocks) are not all
// drawn on the canvas at once — that is what made big scripts slow and
// overwhelming. The outline lists them cheaply (one line each); clicking a row
// opens just that block on the canvas.

type KindFilter = 'all' | 'functions' | 'logic' | 'actions' | 'data' | 'code';

const KIND_GROUP: Record<BlockKind, Exclude<KindFilter, 'all'>> = {
  function: 'functions', call: 'actions', return: 'actions', expression: 'actions', throw: 'actions',
  if: 'logic', switch: 'logic', case: 'logic', for: 'logic', forIn: 'logic', while: 'logic', doWhile: 'logic',
  try: 'logic', break: 'logic', continue: 'logic', block: 'logic', empty: 'code',
  var: 'data', raw: 'code',
};

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'functions', label: 'Functions' },
  { id: 'logic', label: 'Logic' },
  { id: 'actions', label: 'Actions' },
  { id: 'data', label: 'Values' },
  { id: 'code', label: 'Code' },
];

type Sort = 'order' | 'name' | 'size';

/** The label a row is known by: a function's name, a value's name, else the description. */
const nameOf = (b: BlockNode) =>
  b.kind === 'function' ? b.fields.name || 'function'
    : b.kind === 'var' ? (b.fields.declarations ?? '').split('=')[0].trim()
    : describeBlock(b);

const sizeOf = (b: BlockNode): number => 1 + Object.values(b.slots).reduce((n, l) => n + l.reduce((m, c) => m + sizeOf(c), 0), 0);

interface Props {
  roots: BlockNode[];
  /** 'all' or the ids currently drawn on the canvas. */
  shown: 'all' | Set<string>;
  onOpen: (id: string) => void;
  onHide: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  /** Roots that contain a located problem. */
  problemRoots: Set<string>;
}

const BlockOutline: React.FC<Props> = ({ roots, shown, onOpen, onHide, onShowAll, onHideAll, problemRoots }) => {
  const [queryInput, setQueryInput] = useState('');
  const query = useDeferredValue(queryInput.trim().toLowerCase());
  const [filter, setFilter] = useState<KindFilter>('all');
  const [sort, setSort] = useState<Sort>('order');

  // Search text per root: its description, name and its code. Built once per
  // program change, not per keystroke.
  const index = useMemo(
    () => new Map(roots.map(r => [r.id, `${nameOf(r)}\n${describeBlock(r)}\n${generateCode({ roots: [r] })}`.toLowerCase()])),
    [roots],
  );

  const rows = useMemo(() => {
    let list = roots.map((r, order) => ({ r, order }));
    if (filter !== 'all') list = list.filter(({ r }) => KIND_GROUP[r.kind] === filter);
    if (query) list = list.filter(({ r }) => index.get(r.id)?.includes(query));
    if (sort === 'name') list = [...list].sort((a, b) => nameOf(a.r).localeCompare(nameOf(b.r)));
    if (sort === 'size') list = [...list].sort((a, b) => sizeOf(b.r) - sizeOf(a.r));
    return list;
  }, [roots, filter, query, sort, index]);

  const isShown = (id: string) => shown === 'all' || shown.has(id);
  const shownCount = shown === 'all' ? roots.length : shown.size;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-2 pt-2 pb-1.5 space-y-1.5 border-b border-zinc-800/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Outline</span>
          <span className="text-[10px] font-mono text-zinc-600">{shownCount}/{roots.length} on canvas</span>
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder="Find a block…"
            className="w-full pl-6 pr-6 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-cyan-500/50"
          />
          {queryInput && (
            <button onClick={() => setQueryInput('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white" aria-label="Clear search">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                filter === f.id ? 'border-cyan-500/50 text-cyan-200 bg-cyan-500/10' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as Sort)}
            className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-zinc-300 outline-none"
            aria-label="Sort blocks"
          >
            <option value="order">Script order</option>
            <option value="name">Name A–Z</option>
            <option value="size">Biggest first</option>
          </select>
          <button onClick={onShowAll} className="text-zinc-500 hover:text-zinc-200 uppercase tracking-wider">Show all</button>
          <button onClick={onHideAll} className="text-zinc-500 hover:text-zinc-200 uppercase tracking-wider">Clear</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {rows.length === 0 && <p className="text-[11px] text-zinc-600 italic px-2 py-3">No blocks match.</p>}
        {rows.map(({ r, order }) => {
          const meta = BLOCK_META[r.kind];
          const on = isShown(r.id);
          return (
            <div
              key={r.id}
              className={`group flex items-start gap-1.5 px-1.5 py-1 rounded cursor-pointer ${on ? 'bg-cyan-500/5' : 'hover:bg-zinc-800/40'}`}
              onClick={() => onOpen(r.id)}
              title={describeBlock(r)}
            >
              <span className="text-[10px] font-mono text-zinc-600 w-6 shrink-0 text-right pt-0.5">{r.loc ? r.loc.start : order + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 shrink-0">{meta.label.toLowerCase()}</span>
                  {problemRoots.has(r.id) && <AlertOctagon size={10} className="text-red-400 shrink-0" />}
                </div>
                <div className={`text-[11px] truncate ${on ? 'text-cyan-100' : 'text-zinc-300'}`}>{nameOf(r)}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); if (on) onHide(r.id); else onOpen(r.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white shrink-0 pt-0.5"
                aria-label={on ? 'Remove from canvas' : 'Show on canvas'}
                title={on ? 'Remove from canvas (the block stays in the script)' : 'Show on canvas'}
              >
                {on ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BlockOutline;
