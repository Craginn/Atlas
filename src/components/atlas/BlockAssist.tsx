import React from 'react';
import { Lightbulb, AlertTriangle, Plus, Crosshair, X, Terminal, ArrowDown, CheckCircle2, MessageSquare } from 'lucide-react';
import type { Suggestion } from '@/services/blocks/guide';
import type { BlockRunResult, HookRunResult, StoryCardChanges } from '@/services/blocks/runBlocks';
import type { Problem } from '@/services/errors/problems';
import type { Delta } from '@/services/stateDiff';
import ProblemCard, { RichText, type GoTo } from './ProblemCard';
import WhyUndefined from './WhyUndefined';
import type { UndefinedNote } from '@/types';

// Side panels for the block canvas: what to add next (Suggestions) and what a
// run did (Run console).

const Panel: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="w-full md:w-96 md:max-w-md shrink-0 h-2/5 md:h-auto border-t md:border-t-0 md:border-l border-zinc-800/50 flex flex-col bg-black/40 min-h-0">
    <div className="h-8 shrink-0 flex items-center gap-2 px-3 border-b border-zinc-800/50">
      {title}
      <button onClick={onClose} aria-label="Close panel" className="ml-auto p-0.5 text-zinc-600 hover:text-white transition-colors">
        <X size={13} />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 text-[11px]">{children}</div>
  </div>
);

// ------------------------------------------------------------------ suggestions

export const SuggestionsPanel: React.FC<{
  suggestions: Suggestion[];
  scriptName: string;
  onAdd: (s: Suggestion) => void;
  onFocus: (blockId: string) => void;
  onClose: () => void;
}> = ({ suggestions, scriptName, onAdd, onFocus, onClose }) => (
  <Panel
    title={<><Lightbulb size={11} className="text-yellow-300" /><span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Suggestions</span></>}
    onClose={onClose}
  >
    <p className="text-zinc-500 leading-snug">
      {scriptName === 'Library'
        ? 'The Library holds shared helpers that every hook can use. It runs before each hook.'
        : `${scriptName} is a hook: AI Dungeon runs it with the text and uses what it gives back.`}
    </p>
    {suggestions.length === 0 ? (
      <p className="flex items-center gap-1.5 text-emerald-300/80"><CheckCircle2 size={13} /> Nothing to suggest — this script has the essentials.</p>
    ) : (
      suggestions.map(s => (
        <div
          key={s.id}
          className={`rounded-lg border p-2.5 ${s.level === 'important' ? 'border-amber-500/40 bg-amber-950/20' : 'border-zinc-700/60 bg-zinc-900/40'}`}
        >
          <div className="flex items-start gap-1.5">
            {s.level === 'important'
              ? <AlertTriangle size={13} className="mt-px shrink-0 text-amber-400" />
              : <Lightbulb size={13} className="mt-px shrink-0 text-yellow-300/80" />}
            <div className="font-semibold text-zinc-100 leading-snug"><RichText text={s.title} /></div>
          </div>
          <p className="mt-1 text-zinc-400 leading-snug"><span className="text-zinc-500">Why: </span><RichText text={s.why} /></p>
          <div className="mt-2 flex gap-2">
            {s.add && (
              <button onClick={() => onAdd(s)} className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 text-[11px] font-semibold">
                <Plus size={11} /> Add it
              </button>
            )}
            {s.focusBlockId && (
              <button onClick={() => onFocus(s.focusBlockId!)} className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-700/40 text-zinc-200 hover:bg-zinc-700/70 text-[11px] font-semibold">
                <Crosshair size={11} /> Show me
              </button>
            )}
          </div>
        </div>
      ))
    )}
  </Panel>
);

// ------------------------------------------------------------------ run console

const show = (v: unknown) => (v === undefined ? '—' : typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v));

const StateChanges: React.FC<{ changes: Delta[] }> = ({ changes }) =>
  changes.length === 0 ? null : (
    <div className="rounded border border-sky-500/30 bg-sky-500/5 p-2 space-y-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-sky-300">Saved values changed ({changes.length})</div>
      {changes.slice(0, 50).map((d, i) => (
        <div key={i} className="font-mono text-[11px] leading-snug break-words">
          <span className="text-sky-200">state.{d.path}</span>{' '}
          {d.type === 'added' ? <span className="text-emerald-300">= {show(d.to)}</span>
            : d.type === 'removed' ? <span className="text-red-300">removed (was {show(d.from)})</span>
            : <><span className="text-zinc-500 line-through">{show(d.from)}</span> <span className="text-emerald-300">→ {show(d.to)}</span></>}
        </div>
      ))}
      {changes.length > 50 && <div className="text-zinc-500">…and {changes.length - 50} more</div>}
    </div>
  );

const CardChanges: React.FC<{ cards: StoryCardChanges; onApply: () => void; applied: boolean }> = ({ cards, onApply, applied }) => (
  <div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2 space-y-1.5">
    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Story Cards</div>
    {(['added', 'updated', 'removed'] as const).map(kind => {
      const list = cards[kind];
      if (!list.length) return null;
      const tint = kind === 'added' ? 'text-emerald-300' : kind === 'removed' ? 'text-red-300' : 'text-amber-300';
      return (
        <div key={kind}>
          <div className={`text-[10px] uppercase tracking-wider ${tint}`}>{kind} · {list.length}</div>
          {list.map(c => (
            <div key={c.id} className="text-zinc-300 leading-snug break-words pl-1.5">
              {c.title || c.keys || '(untitled)'}
              {c.entry && <span className="text-zinc-600"> — {c.entry.slice(0, 60)}{c.entry.length > 60 ? '…' : ''}</span>}
            </div>
          ))}
        </div>
      );
    })}
    <button
      onClick={onApply}
      disabled={applied}
      className="w-full mt-1 px-2 py-1 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
    >
      {applied ? 'Applied to Story Cards' : 'Apply these changes'}
    </button>
  </div>
);

const Logs: React.FC<{ logs: string[]; notes?: UndefinedNote[]; onGoTo?: GoTo }> = ({ logs, notes = [], onGoTo }) =>
  logs.length === 0 ? null : (
    <div className="rounded border border-zinc-800 bg-black/40 p-2 space-y-0.5">
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Log</div>
      {logs.map((l, i) => <div key={i} className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap break-words">{l}</div>)}
      {/* A log that printed undefined: say why. */}
      {notes.map((n, i) => n.explanations.map((why, k) => <WhyUndefined key={`${i}-${k}`} why={why} onGoTo={onGoTo} compact />))}
    </div>
  );

export const RunConsole: React.FC<{
  running: boolean;
  hook: HookRunResult | null;
  selection: BlockRunResult | null;
  selectedCount: number;
  problems: Problem[];
  onGoTo: GoTo;
  onApply: () => void;
  applied: boolean;
  onClose: () => void;
}> = ({ running, hook, selection, selectedCount, problems, onGoTo, onApply, applied, onClose }) => {
  const ms = hook?.ms ?? selection?.ms;
  return (
    <Panel
      title={<>
        <Terminal size={11} className="text-emerald-400" />
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Run console</span>
        {!running && ms !== undefined && <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{ms}ms</span>}
      </>}
      onClose={onClose}
    >
      {running && <p className="text-zinc-500 italic">Running…</p>}

      {!running && !hook && !selection && (
        <div className="space-y-2 text-zinc-500 leading-relaxed">
          <p><b className="text-zinc-300">Run as hook</b> runs this whole script the way AI Dungeon does — Library first, then the hook, with the Director's input as the text — and shows what it changed.</p>
          <p><b className="text-zinc-300">Run selected</b> runs only the blocks you marked with their ▷ badge{selectedCount ? ` (${selectedCount} queued)` : ''}, in click order.</p>
          <p>Nothing is saved either way.</p>
        </div>
      )}

      {!running && (hook || selection) && (
        <>
          {problems.map(p => <ProblemCard key={p.id} problem={p} onGoTo={onGoTo} />)}

          {hook && !hook.error && (
            <>
              <div className="rounded border border-zinc-700/60 bg-zinc-900/40 p-2 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Text in</div>
                <div className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap break-words">{hook.textIn || <i className="text-zinc-600">(empty)</i>}</div>
                <ArrowDown size={11} className="text-zinc-600" />
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Text out {hook.stopped && <span className="text-amber-300 normal-case tracking-normal">— and stopped the AI</span>}
                </div>
                {hook.hook === 'Library' ? (
                  <div className="text-zinc-500 italic">The Library doesn't return text — it defines helpers the hooks use.</div>
                ) : hook.textOut === undefined ? (
                  <div className="text-amber-300/90 leading-snug">Nothing was returned, so AI Dungeon keeps the original text. Add “Return the text” at the end of the modifier.</div>
                ) : hook.textOut === hook.textIn ? (
                  <div className="text-zinc-400 italic">Unchanged.</div>
                ) : (
                  <div className="font-mono text-[11px] text-emerald-200 whitespace-pre-wrap break-words">{hook.textOut}</div>
                )}
              </div>
              {hook.message && (
                <div className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200">
                  <MessageSquare size={12} className="mt-px shrink-0" /> Message to the player: {hook.message}
                </div>
              )}
              <StateChanges changes={hook.stateChanges} />
              {hook.storyCards && <CardChanges cards={hook.storyCards} onApply={onApply} applied={applied} />}
              <Logs logs={hook.logs} notes={hook.undefinedNotes} onGoTo={onGoTo} />
              {!hook.stateChanges.length && !hook.storyCards && !hook.logs.length && !hook.message && hook.textOut === hook.textIn && (
                <p className="text-zinc-500 italic">Ran clean, but nothing changed for this input. Try an input your script reacts to.</p>
              )}
            </>
          )}

          {selection && (
            <>
              <StateChanges changes={selection.stateChanges} />
              {selection.storyCards && <CardChanges cards={selection.storyCards} onApply={onApply} applied={applied} />}
              <Logs logs={selection.logs} notes={selection.undefinedNotes} onGoTo={onGoTo} />
              {!selection.error && selection.logs.length === 0 && !selection.storyCards && !selection.stateChanges.length && (
                selection.inertReason
                  ? <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-300/90 leading-snug">{selection.inertReason}</div>
                  : <p className="text-zinc-600 italic">Ran clean — no output logged.</p>
              )}
              {selection.result != null && (
                <div className="rounded border border-zinc-800 bg-black/40 p-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Returned</div>
                  <pre className="text-emerald-300/90 whitespace-pre-wrap break-words font-mono text-[11px]">
                    {typeof selection.result === 'string' ? selection.result : JSON.stringify(selection.result, null, 2)}
                  </pre>
                </div>
              )}
              <details className="pt-1">
                <summary className="text-[10px] font-black uppercase tracking-widest text-zinc-600 cursor-pointer hover:text-zinc-400">Code that ran</summary>
                <pre className="mt-1 text-zinc-500 whitespace-pre-wrap break-words leading-snug font-mono text-[11px]">{selection.code}</pre>
              </details>
            </>
          )}
          <p className="text-[10px] text-zinc-700 pt-1 border-t border-zinc-800/50 leading-relaxed">
            Test run — nothing was saved; world state is untouched{(hook?.storyCards || selection?.storyCards) && !applied ? ', and story cards change only if you apply them' : ''}.
          </p>
        </>
      )}
    </Panel>
  );
};
