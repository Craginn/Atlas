import React, { useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, Search, Play, FileCode2, ChevronDown, ChevronRight } from 'lucide-react';
import ProblemCard, { type GoTo } from './ProblemCard';
import type { Problem } from '@/services/errors/problems';

// The debugger. Two sources, one presentation:
//
//   Last run    — what stopped the engine, and errors scripts caught and logged.
//   Code check  — the static check of every script, live as you edit.
//
// Every finding is explained in plain language and located (script, line,
// column); "go to line" opens it in the JS Code Editor with the cursor on it.

interface SentinelProps {
  runProblems: Problem[];
  checkProblems: Problem[];
  onGoTo: GoTo;
  /** Whether any turn has been run yet (for the empty state). */
  hasRun: boolean;
}

type Filter = 'all' | 'error' | 'warning';

const matches = (p: Problem, q: string) => {
  if (!q) return true;
  const hay = `${p.script} ${p.message} ${p.explanation.title} ${p.sourceLine ?? ''}`.toLowerCase();
  return hay.includes(q.toLowerCase());
};

const ScriptGroup: React.FC<{ script: string; problems: Problem[]; onGoTo: GoTo }> = ({ script, problems, onGoTo }) => {
  const [open, setOpen] = useState(true);
  const errors = problems.filter(p => p.severity === 'error').length;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        {open ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
        <FileCode2 size={13} className="text-slate-400" />
        <span className="text-[12px] font-bold text-slate-200">{script}</span>
        {errors > 0 && <span className="text-[10px] px-1.5 rounded bg-red-500/15 text-red-300">{errors} error{errors > 1 ? 's' : ''}</span>}
        {problems.length - errors > 0 && (
          <span className="text-[10px] px-1.5 rounded bg-amber-500/15 text-amber-300">
            {problems.length - errors} warning{problems.length - errors > 1 ? 's' : ''}
          </span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {problems.map(p => <ProblemCard key={p.id} problem={p} onGoTo={onGoTo} compact={p.source === 'check' && p.severity === 'warning'} />)}
        </div>
      )}
    </div>
  );
};

const Sentinel: React.FC<SentinelProps> = ({ runProblems, checkProblems, onGoTo, hasRun }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visibleChecks = useMemo(
    () => checkProblems.filter(p => (filter === 'all' || p.severity === filter) && matches(p, query)),
    [checkProblems, filter, query],
  );
  const byScript = useMemo(() => {
    const m = new Map<string, Problem[]>();
    for (const p of [...visibleChecks].sort((a, b) => a.line - b.line || (a.column ?? 0) - (b.column ?? 0))) {
      const list = m.get(p.script);
      if (list) list.push(p); else m.set(p.script, [p]);
    }
    // Scripts with errors first.
    return [...m.entries()].sort((a, b) =>
      Number(b[1].some(p => p.severity === 'error')) - Number(a[1].some(p => p.severity === 'error')));
  }, [visibleChecks]);

  const errorCount = checkProblems.filter(p => p.severity === 'error').length + runProblems.filter(p => p.severity === 'error').length;
  const warningCount = checkProblems.length + runProblems.length - errorCount;
  const status = errorCount ? 'error' : warningCount ? 'warning' : 'healthy';

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 overflow-hidden font-sans">
      <div className="h-12 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck size={16} className="text-red-500" />
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sentinel Debugger</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          status === 'healthy' ? 'text-green-400 border-green-500/30 bg-green-500/5'
            : status === 'warning' ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
            : 'text-red-400 border-red-500/30 bg-red-500/5'
        }`}>
          {status === 'healthy' ? 'No problems' : `${errorCount} error${errorCount === 1 ? '' : 's'} · ${warningCount} warning${warningCount === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* ── Last run ─────────────────────────────────────────────────────── */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <Play size={12} /> Last run
          </h2>
          {!hasRun ? (
            <p className="text-xs text-slate-600 italic">No turn has been run yet. Run one from the Simulation Engine.</p>
          ) : runProblems.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-green-400/80">
              <CheckCircle2 size={14} /> The last turn ran without errors.
            </p>
          ) : (
            <div className="space-y-2">
              {runProblems.map(p => <ProblemCard key={p.id} problem={p} onGoTo={onGoTo} />)}
            </div>
          )}
        </section>

        {/* ── Code check ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 mr-auto">
              <Search size={12} /> Code check
              <span className="normal-case tracking-normal font-normal text-slate-600">— updates as you edit</span>
            </h2>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter findings…"
                className="pl-6 pr-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-600/60"
              />
            </div>
            {(['all', 'error', 'warning'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border ${
                  filter === f ? 'border-sky-500/50 text-sky-300 bg-sky-500/10' : 'border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'all' ? 'All' : f === 'error' ? 'Errors' : 'Warnings'}
              </button>
            ))}
          </div>

          {checkProblems.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-green-400/80">
              <CheckCircle2 size={14} /> Every script parses, and nothing risky was found.
            </p>
          ) : byScript.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No findings match the filter.</p>
          ) : (
            byScript.map(([script, list]) => <ScriptGroup key={script} script={script} problems={list} onGoTo={onGoTo} />)
          )}
        </section>
      </div>
    </div>
  );
};

export default Sentinel;
