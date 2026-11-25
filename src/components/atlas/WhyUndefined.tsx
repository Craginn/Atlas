import React from 'react';
import { HelpCircle, Check, X, CornerDownRight, ArrowUpRight, Lightbulb, MinusCircle } from 'lucide-react';
import type { Triangulation, TraceStep } from '@/services/errors/triangulate';
import { RichText, type GoTo } from './ProblemCard';

// "Why is it undefined?" — the traced answer, shown wherever an undefined value
// is reported (error cards, Code Logs). Three parts:
//   1. the chain, checked step by step against the real values at that moment
//   2. the reason, in words
//   3. where the missing value is created, and why that hasn't happened yet

const STEP_ICON: Record<TraceStep['status'], React.ReactNode> = {
  ok: <Check size={12} className="text-emerald-400 shrink-0 mt-0.5" />,
  missing: <X size={12} className="text-red-400 shrink-0 mt-0.5" />,
  null: <MinusCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />,
  unknown: <HelpCircle size={12} className="text-zinc-500 shrink-0 mt-0.5" />,
  from: <CornerDownRight size={12} className="text-sky-300 shrink-0 mt-0.5" />,
};

const WhyUndefined: React.FC<{ why: Triangulation; onGoTo?: GoTo; compact?: boolean }> = ({ why, onGoTo, compact }) => (
  <div className="mt-2 rounded-md border border-sky-500/25 bg-sky-950/20 p-2.5 space-y-2 text-[12px] font-sans">
    <div className="flex items-center gap-1.5 text-sky-200 font-semibold">
      <HelpCircle size={13} /> Why is <code className="px-1 rounded bg-black/40 font-mono text-[11px]">{why.target}</code> undefined?
    </div>

    {why.steps.length > 0 && (
      <ol className="space-y-0.5 font-mono text-[11px]">
        {why.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-1.5">
            {STEP_ICON[s.status]}
            <span className="min-w-0">
              <span className={s.status === 'missing' ? 'text-red-200' : s.status === 'from' ? 'text-sky-200' : 'text-zinc-200'}>{s.expr}</span>
              {s.detail && <span className="text-zinc-500 font-sans"> — <RichText text={s.detail} /></span>}
            </span>
          </li>
        ))}
      </ol>
    )}

    <p className="text-zinc-200 leading-snug"><RichText text={why.reason} /></p>

    {why.whereSet.length > 0 && (
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Where it's set</div>
        {why.whereSet.map((w, i) => (
          <div key={i} className="rounded bg-black/30 px-2 py-1.5 space-y-0.5">
            <div className="flex items-center gap-2 min-w-0">
              {onGoTo ? (
                <button
                  onClick={() => onGoTo({ script: w.script, line: w.line, column: w.column })}
                  className="shrink-0 inline-flex items-center gap-1 font-mono text-[11px] text-sky-200 hover:text-white"
                  title="Open this line in the JS Code Editor"
                >
                  {w.script} · line {w.line} <ArrowUpRight size={10} />
                </button>
              ) : (
                <span className="shrink-0 font-mono text-[11px] text-sky-200">{w.script} · line {w.line}</span>
              )}
              <code className="truncate font-mono text-[11px] text-zinc-400">{w.sourceLine}</code>
            </div>
            {!compact && <p className="text-zinc-400 leading-snug"><RichText text={w.why.charAt(0).toUpperCase() + w.why.slice(1)} /></p>}
          </div>
        ))}
      </div>
    )}

    {why.suggestion && (
      <p className="flex items-start gap-1.5 text-zinc-300 leading-snug">
        <Lightbulb size={12} className="mt-0.5 shrink-0 text-yellow-300" />
        <span>Create it before it's used: <code className="px-1 rounded bg-black/40 font-mono text-[11px] text-emerald-200">{why.suggestion}</code></span>
      </p>
    )}
  </div>
);

export default WhyUndefined;
