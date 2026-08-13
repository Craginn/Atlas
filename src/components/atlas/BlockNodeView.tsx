import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Play } from 'lucide-react';
import { BlockNode, BLOCK_META } from '@/services/blocks/types';
import { FIELDS_FOR, SLOTS_FOR } from '@/services/blocks/palette';

// One box, rendered recursively. A block's nested slots render more boxes, which
// is what lets blocks accept other blocks (and raw code) inside them.

/**
 * Tailwind can't build class names at runtime, so accents are enumerated.
 *
 * `bar` is a gradient rather than a flat fill so the rail reads as depth on the
 * dark canvas; `rail` is the matching (much dimmer) tint for the nesting guide,
 * which is what ties a child visually to the parent it lives in.
 */
const ACCENT: Record<
  string,
  { bar: string; chip: string; ring: string; rail: string; glow: string }
> = {
  sky:     { bar: 'bg-gradient-to-b from-sky-400 to-sky-600',         chip: 'text-sky-200 bg-sky-500/15',         ring: 'border-sky-500/30',   rail: 'border-sky-500/25',   glow: 'shadow-sky-950/40' },
  violet:  { bar: 'bg-gradient-to-b from-violet-400 to-violet-600',   chip: 'text-violet-200 bg-violet-500/15',   ring: 'border-violet-500/30',rail: 'border-violet-500/25',glow: 'shadow-violet-950/40' },
  rose:    { bar: 'bg-gradient-to-b from-rose-400 to-rose-600',       chip: 'text-rose-200 bg-rose-500/15',       ring: 'border-rose-500/30',  rail: 'border-rose-500/25',  glow: 'shadow-rose-950/40' },
  amber:   { bar: 'bg-gradient-to-b from-amber-400 to-amber-600',     chip: 'text-amber-200 bg-amber-500/15',     ring: 'border-amber-500/30', rail: 'border-amber-500/25', glow: 'shadow-amber-950/40' },
  emerald: { bar: 'bg-gradient-to-b from-emerald-400 to-emerald-600', chip: 'text-emerald-200 bg-emerald-500/15', ring: 'border-emerald-500/30',rail:'border-emerald-500/25',glow: 'shadow-emerald-950/40' },
  orange:  { bar: 'bg-gradient-to-b from-orange-400 to-orange-600',   chip: 'text-orange-200 bg-orange-500/15',   ring: 'border-orange-500/30',rail: 'border-orange-500/25',glow: 'shadow-orange-950/40' },
  red:     { bar: 'bg-gradient-to-b from-red-400 to-red-600',         chip: 'text-red-200 bg-red-500/15',         ring: 'border-red-500/30',   rail: 'border-red-500/25',   glow: 'shadow-red-950/40' },
  blue:    { bar: 'bg-gradient-to-b from-blue-400 to-blue-600',       chip: 'text-blue-200 bg-blue-500/15',       ring: 'border-blue-500/30',  rail: 'border-blue-500/25',  glow: 'shadow-blue-950/40' },
  cyan:    { bar: 'bg-gradient-to-b from-cyan-400 to-cyan-600',       chip: 'text-cyan-200 bg-cyan-500/15',       ring: 'border-cyan-500/30',  rail: 'border-cyan-500/25',  glow: 'shadow-cyan-950/40' },
  zinc:    { bar: 'bg-gradient-to-b from-zinc-500 to-zinc-700',       chip: 'text-zinc-200 bg-zinc-600/20',       ring: 'border-zinc-700/60',  rail: 'border-zinc-700/50',  glow: 'shadow-black/40' },
};

/**
 * Size tokens for the two layouts.
 *
 * Compact exists because the desktop sizes are 9–12px text with sub-20px hit
 * areas — fine with a cursor, unusable with a thumb. Everything here that is a
 * tap target clears ~44px in compact; the desktop column is unchanged from
 * before so existing screens keep their density.
 */
const SIZE = {
  desktop: {
    pad: 'px-2 py-1.5', slotPad: 'px-2 pb-2', gap: 'gap-2',
    label: 'text-[10px]', field: 'text-[11px]', hint: 'text-[9px]',
    input: 'px-1.5 py-0.5', tap: '', icon: 12, chevron: 13,
    runBtn: 'w-5 h-5', slotIndent: 'pl-2', childGap: 'space-y-1.5',
  },
  compact: {
    pad: 'px-3 py-2.5', slotPad: 'px-3 pb-3', gap: 'gap-2.5',
    label: 'text-[12px]', field: 'text-[14px]', hint: 'text-[11px]',
    input: 'px-2.5 py-2', tap: 'min-w-[44px] min-h-[44px] justify-center', icon: 18, chevron: 20,
    runBtn: 'w-9 h-9', slotIndent: 'pl-3', childGap: 'space-y-2.5',
  },
} as const;

export interface BlockNodeViewProps {
  block: BlockNode;
  /** Replace this block in the tree (identity-based, so nesting works). */
  onChange: (next: BlockNode) => void;
  onDelete: () => void;
  /** Opens the palette targeted at a specific slot of this block. */
  onRequestAdd: (blockId: string, slot: string) => void;
  depth: number;
  /**
   * Block ids in scratch-run order. Passed whole rather than as a per-block
   * index so nested blocks can find their own position — any block can join the
   * order, not just roots.
   */
  runOrder?: string[];
  onToggleRun?: (blockId: string) => void;
  /**
   * Names of functions declared anywhere in the current script, offered by the
   * Call block's picker. Without this a user who defines a function has no
   * discoverable way to invoke it.
   */
  functionNames?: string[];
  /**
   * Touch-sized layout. Set by the canvas from the resolved layout mode and
   * passed down the tree so a nested block matches its parent.
   */
  compact?: boolean;
}

const BlockNodeView: React.FC<BlockNodeViewProps> = ({
  block, onChange, onDelete, onRequestAdd, depth, runOrder = [], onToggleRun,
  functionNames = [], compact = false,
}) => {
  const s = compact ? SIZE.compact : SIZE.desktop;
  const runIndex = runOrder.indexOf(block.id) + 1;
  const meta = BLOCK_META[block.kind];
  const accent = ACCENT[meta.color] ?? ACCENT.zinc;
  const fields = FIELDS_FOR[block.kind] ?? [];
  const slots = SLOTS_FOR[block.kind] ?? [];
  const collapsed = block.collapsed ?? false;

  const setField = (key: string, value: string) =>
    onChange({ ...block, fields: { ...block.fields, [key]: value } });

  const setSlot = (key: string, children: BlockNode[]) =>
    onChange({ ...block, slots: { ...block.slots, [key]: children } });

  // A raw block is an escape hatch: show the code, let them edit it directly.
  const isRaw = block.kind === 'raw';
  const isCall = block.kind === 'call';

  // Offer every declared function, plus whatever's already selected — a callee
  // typed by hand (or left over from a renamed function) must not vanish from
  // its own dropdown.
  const callee = block.fields.callee ?? '';
  const calleeOptions = [...new Set([...functionNames, callee].filter(Boolean))];

  return (
    <div
      className={`rounded-xl border bg-zinc-900/70 ${accent.ring} overflow-hidden
        shadow-lg ${accent.glow} transition-colors`}
    >
      <div className="flex items-stretch">
        <div className={`${compact ? 'w-1.5' : 'w-1'} shrink-0 ${accent.bar}`} />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className={`flex items-center ${s.gap} ${s.pad}`}>
            {slots.length > 0 && (
              <button
                onClick={() => onChange({ ...block, collapsed: !collapsed })}
                className={`text-zinc-500 hover:text-white transition-colors shrink-0 flex items-center ${s.tap}`}
                aria-label={collapsed ? 'Expand block' : 'Collapse block'}
              >
                {collapsed ? <ChevronRight size={s.chevron} /> : <ChevronDown size={s.chevron} />}
              </button>
            )}
            {/* The grip is a drag affordance for the canvas only — in the compact
                stacked layout there is nothing to drag, so it would be a lie. */}
            {!compact && <GripVertical size={12} className="text-zinc-700 shrink-0" />}
            {onToggleRun && (
              <button
                onClick={() => onToggleRun(block.id)}
                title={runIndex ? `Step ${runIndex} of the scratch run — click to remove` : 'Add to the scratch run'}
                aria-label={runIndex ? `Remove from run order (currently step ${runIndex})` : 'Add to run order'}
                aria-pressed={runIndex > 0}
                className={`shrink-0 ${s.runBtn} rounded-md flex items-center justify-center ${s.label} font-bold
                  font-mono transition-colors ${
                  runIndex
                    ? 'bg-emerald-500 text-black'
                    : 'border border-dashed border-zinc-700 text-zinc-600 hover:border-emerald-500/60 hover:text-emerald-400'
                }`}
              >
                {runIndex || <Play size={compact ? 14 : 9} />}
              </button>
            )}
            <span className={`${s.hint} font-black uppercase tracking-wider px-2 py-1 rounded-md ${accent.chip} shrink-0`}>
              {meta.label}
            </span>

            {/* Inline expression fields — text, not more boxes (see types.ts).
                Compact drops them out of the header entirely (below) so they get
                the full row width instead of competing with the chrome. */}
            {!compact && (
              <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                {isCall && (
                  <>
                    <select
                      value={callee}
                      onChange={e => setField('callee', e.target.value)}
                      className="bg-black/40 border border-zinc-800 focus:border-zinc-600 rounded px-1 py-0.5
                        font-mono text-[11px] text-zinc-200 outline-none max-w-[9rem]"
                    >
                      <option value="">choose…</option>
                      {calleeOptions.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <span className="text-zinc-600 text-[11px] font-mono">(</span>
                    <input
                      value={block.fields.args ?? ''}
                      onChange={e => setField('args', e.target.value)}
                      placeholder="arguments"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      className="bg-black/40 border border-zinc-800 focus:border-zinc-600 rounded px-1.5 py-0.5
                        font-mono text-[11px] text-zinc-200 outline-none flex-1 min-w-0"
                    />
                    <span className="text-zinc-600 text-[11px] font-mono">)</span>
                  </>
                )}
                {!isRaw && !isCall && fields.map(f => (
                  <label key={f.key} className="flex items-center gap-1 min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-600 shrink-0">
                      {f.label}
                    </span>
                    <input
                      value={block.fields[f.key] ?? ''}
                      onChange={e => setField(f.key, e.target.value)}
                      spellCheck={false}
                      // These are code, not prose. A phone keyboard otherwise
                      // capitalizes the first letter of the field, silently
                      // turning `console.log` into `Console.log` and `text` into
                      // `Text` — undefined identifiers that only fail at runtime.
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      className={`bg-black/40 border border-zinc-800 focus:border-zinc-600 rounded px-1.5 py-0.5
                        font-mono text-[11px] text-zinc-200 outline-none min-w-0 ${f.wide ? 'flex-1' : 'w-24'}`}
                    />
                  </label>
                ))}
              </div>
            )}
            {compact && <div className="flex-1" />}

            <button
              onClick={onDelete}
              className={`text-zinc-700 hover:text-red-400 transition-colors shrink-0 flex items-center ${s.tap}`}
              aria-label="Delete block"
            >
              <Trash2 size={s.icon} />
            </button>
          </div>

          {/* Compact field rows: one stacked, full-width control per field. */}
          {compact && (isCall || (!isRaw && fields.length > 0)) && (
            <div className={`${s.slotPad} space-y-2`}>
              {isCall && (
                <>
                  <label className="block">
                    <span className={`${s.hint} uppercase tracking-wider text-zinc-500 block mb-1`}>Function</span>
                    <select
                      value={callee}
                      onChange={e => setField('callee', e.target.value)}
                      className={`w-full bg-black/40 border border-zinc-800 focus:border-zinc-600 rounded-lg
                        ${s.input} font-mono ${s.field} text-zinc-200 outline-none`}
                    >
                      <option value="">choose…</option>
                      {calleeOptions.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={`${s.hint} uppercase tracking-wider text-zinc-500 block mb-1`}>Arguments</span>
                    <input
                      value={block.fields.args ?? ''}
                      onChange={e => setField('args', e.target.value)}
                      placeholder="arguments"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      className={`w-full bg-black/40 border border-zinc-800 focus:border-zinc-600 rounded-lg
                        ${s.input} font-mono ${s.field} text-zinc-200 outline-none`}
                    />
                  </label>
                </>
              )}
              {!isCall && fields.map(f => (
                <label key={f.key} className="block">
                  <span className={`${s.hint} uppercase tracking-wider text-zinc-500 block mb-1`}>
                    {f.label}
                  </span>
                  <input
                    value={block.fields[f.key] ?? ''}
                    onChange={e => setField(f.key, e.target.value)}
                    spellCheck={false}
                    // Same reason as the desktop fields: this is code, and a
                    // phone keyboard will otherwise capitalize each field.
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    className={`w-full bg-black/40 border border-zinc-800 focus:border-zinc-600 rounded-lg
                      ${s.input} font-mono ${s.field} text-zinc-200 outline-none`}
                  />
                </label>
              ))}
            </div>
          )}

          {isCall && calleeOptions.length === 0 && (
            <div className={`${s.slotPad} ${s.label} text-zinc-600 italic leading-snug`}>
              No functions defined yet — add a Function block, name it, then pick it here.
            </div>
          )}

          {isRaw && (
            <div className={s.slotPad}>
              <textarea
                value={block.fields.source ?? ''}
                onChange={e => setField('source', e.target.value)}
                spellCheck={false}
                // Same reason as the inline fields: this is source, and a mobile
                // keyboard will capitalize the start of every line it thinks is
                // a sentence.
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                rows={Math.min(14, (block.fields.source ?? '').split('\n').length || 1)}
                className={`w-full bg-black/50 border border-zinc-800 focus:border-zinc-600 rounded-lg
                  ${s.input} font-mono ${s.field} text-zinc-300 outline-none resize-y whitespace-pre`}
              />
            </div>
          )}

          {/* Nested slots — this is the "boxes accept code nesting" part */}
          {!collapsed && slots.map(slot => {
            const children = block.slots[slot.key] ?? [];
            // try/catch hides the branches the user hasn't enabled.
            if (block.kind === 'try' && slot.key === 'catch' && block.fields.hasCatch !== 'true') return null;
            if (block.kind === 'try' && slot.key === 'finally' && block.fields.hasFinally !== 'true') return null;
            // Don't show an empty Else until there's something in it.
            if (block.kind === 'if' && slot.key === 'else' && children.length === 0) {
              return (
                <div key={slot.key} className={s.slotPad}>
                  <button
                    onClick={() => onRequestAdd(block.id, 'else')}
                    className={`${s.label} text-zinc-600 hover:text-zinc-300 transition-colors flex items-center ${s.tap}`}
                  >
                    + add Else
                  </button>
                </div>
              );
            }

            return (
              <div key={slot.key} className={s.slotPad}>
                <div className={`${s.hint} font-black uppercase tracking-widest text-zinc-500 mb-1.5 pl-1`}>
                  {slot.label}
                </div>
                {/* Solid, accent-tinted rail rather than a dashed grey one: at
                    three levels deep the dashed lines all looked alike, so
                    depth was only readable by counting indents. */}
                <div className={`${s.childGap} ${s.slotIndent} border-l-2 ${accent.rail} rounded-bl`}>
                  {children.map((child, i) => (
                    <BlockNodeView
                      key={child.id}
                      block={child}
                      depth={depth + 1}
                      compact={compact}
                      onChange={next => {
                        const copy = [...children];
                        copy[i] = next;
                        setSlot(slot.key, copy);
                      }}
                      onDelete={() => setSlot(slot.key, children.filter((_, j) => j !== i))}
                      onRequestAdd={onRequestAdd}
                      onToggleRun={onToggleRun}
                      runOrder={runOrder}
                      functionNames={functionNames}
                    />
                  ))}
                  <button
                    onClick={() => onRequestAdd(block.id, slot.key)}
                    className={`flex items-center gap-1.5 ${s.label} text-zinc-500 hover:text-zinc-200
                      transition-colors ${compact ? 'min-h-[44px] w-full' : 'py-0.5'}`}
                  >
                    <Plus size={compact ? 16 : 10} /> add step
                  </button>
                </div>
              </div>
            );
          })}

          {collapsed && (
            <div className={`${s.slotPad} ${s.label} text-zinc-500 italic`}>
              {countSteps(block)} step(s) hidden
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function countSteps(block: BlockNode): number {
  return Object.values(block.slots).reduce((n, list) => n + list.length, 0);
}

export default BlockNodeView;
