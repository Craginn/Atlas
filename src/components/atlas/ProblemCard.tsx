import React, { useState } from 'react';
import { AlertOctagon, AlertTriangle, ArrowUpRight, CornerDownRight, Lightbulb } from 'lucide-react';
import type { Problem } from '@/services/errors/problems';
import type { ScriptLocation } from '@/types';

// One problem, explained and located, the same everywhere it appears
// (Heimdall's banner, the Sentinel debugger, the block canvas console).

export type GoTo = (loc: { script: string; line: number; column?: number }) => void;

/** Render `backtick` spans as code. */
export const RichText: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <span className={className}>
    {text.split(/(`[^`]+`)/g).map((part, i) =>
      part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
        <code key={i} className="px-1 py-px rounded bg-black/40 font-mono text-[0.95em] text-zinc-100">{part.slice(1, -1)}</code>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </span>
);

const SOURCE_LABEL: Record<Problem['source'], string> = {
  run: 'Stopped the run',
  caught: 'Caught & logged',
  check: 'Found by check',
};

/** The failing line with a caret under the column. */
export const SourceLine: React.FC<{ line: number; text?: string; column?: number }> = ({ line, text, column }) => {
  if (!text?.trim()) return null;
  // Shown without its indentation; the column counts the indentation, so the
  // caret shifts back by the same amount. (A stale, already-trimmed line has
  // no indentation to subtract — the caret is then approximate.)
  const indent = text.length - text.trimStart().length;
  const shown = text.trim();
  const caret = column ? Math.max(0, Math.min(shown.length, column - 1 - indent)) : -1;
  return (
    <pre className="mt-1.5 px-2 py-1 rounded bg-black/50 border border-white/5 text-[11px] leading-5 font-mono text-zinc-200 overflow-x-auto">
      <span className="text-zinc-600 select-none mr-2">{String(line).padStart(4)} |</span>
      {shown}
      {caret >= 0 && (
        <>
          {'\n'}
          <span className="select-none text-zinc-600 mr-2">{'     |'}</span>
          <span className="text-red-400">{' '.repeat(caret)}^</span>
        </>
      )}
    </pre>
  );
};

const LocationButton: React.FC<{ loc: ScriptLocation | { script: string; line: number; column?: number }; onGoTo?: GoTo; tone: string }> = ({ loc, onGoTo, tone }) => {
  const label = `${loc.script} · line ${loc.line}${loc.column ? ` · col ${loc.column}` : ''}`;
  if (!onGoTo || !loc.line) return <span className={`font-mono text-[11px] ${tone}`}>{loc.line ? label : loc.script}</span>;
  return (
    <button
      onClick={() => onGoTo({ script: loc.script, line: loc.line, column: loc.column })}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[11px] hover:bg-white/10 transition-colors ${tone}`}
      title="Open this line in the JS Code Editor"
    >
      {label} <ArrowUpRight size={10} />
    </button>
  );
};

const ProblemCard: React.FC<{ problem: Problem; onGoTo?: GoTo; compact?: boolean }> = ({ problem: p, onGoTo, compact }) => {
  const [raw, setRaw] = useState(false);
  const isError = p.severity === 'error';
  const tone = isError ? 'border-red-500/40 text-red-200' : 'border-amber-500/40 text-amber-200';
  const box = isError ? 'border-red-500/30 bg-red-950/25' : 'border-amber-500/30 bg-amber-950/20';
  const Icon = isError ? AlertOctagon : AlertTriangle;

  return (
    <div className={`rounded-lg border ${box} p-2.5 text-[11px] font-sans`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={`mt-0.5 shrink-0 ${isError ? 'text-red-400' : 'text-amber-400'}`} />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold leading-snug ${isError ? 'text-red-100' : 'text-amber-100'}`}>
            <RichText text={p.explanation.title} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <LocationButton loc={p} onGoTo={onGoTo} tone={tone} />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">{SOURCE_LABEL[p.source]}</span>
            {p.hook && p.hook !== p.script && (
              <span className="text-[10px] text-zinc-500">while running {p.hook}</span>
            )}
            {p.stale && (
              <span className="text-[10px] px-1 rounded bg-zinc-700/50 text-zinc-300" title="The script changed since this run — the line may have moved. Run again to refresh.">
                edited since run
              </span>
            )}
          </div>
          <SourceLine line={p.line} text={p.sourceLine} column={p.column} />
          {!compact && p.explanation.explanation && (
            <p className="mt-1.5 text-zinc-300 leading-snug"><RichText text={p.explanation.explanation} /></p>
          )}
          {p.explanation.fix && (
            <p className="mt-1.5 flex items-start gap-1.5 text-zinc-200 leading-snug">
              <Lightbulb size={12} className="mt-0.5 shrink-0 text-yellow-300" />
              <RichText text={p.explanation.fix} />
            </p>
          )}
          {p.calledFrom && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-zinc-400">
              <CornerDownRight size={11} />
              <span>Reached from</span>
              <LocationButton loc={p.calledFrom} onGoTo={onGoTo} tone="border-zinc-600 text-zinc-300" />
              {p.calledFrom.sourceLine && <code className="font-mono text-[11px] text-zinc-500 truncate">{p.calledFrom.sourceLine}</code>}
            </div>
          )}
          {p.message !== p.explanation.title && (
            <button onClick={() => setRaw(r => !r)} className="mt-1.5 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
              {raw ? 'Hide' : 'Show'} original message
            </button>
          )}
          {raw && <pre className="mt-1 text-[11px] font-mono text-zinc-400 whitespace-pre-wrap break-words">{p.message}</pre>}
        </div>
      </div>
    </div>
  );
};

export default ProblemCard;
