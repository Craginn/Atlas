import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, ArrowRightToLine } from 'lucide-react';

// One turn, shown as one execution.
//
// The trace tab previously flattened every hook's logs into a single stream and
// then regrouped them by log *type*, so the three hooks were interleaved with no
// attribution and the Library's per-hook boot lines repeated three times with
// nothing to tie them to. Reading it meant reconstructing the pipeline by eye.
//
// This renders what actually happened, in fire order, one section per hook.

/** A hook's slice of the run, as recorded in scriptingService's heimdallLogs. */
export interface TraceEntry {
  scriptName: string;
  logs?: unknown[];
  stateChanged?: boolean;
}

/**
 * Lines that repeat identically for every hook and carry no per-hook meaning.
 * The Library really does run before each hook (AID concatenates it), and that
 * fact is worth stating once per section — but as a quiet subtitle, not as two
 * more log lines competing with the script's own output.
 */
const isLibraryBoilerplate = (line: string) =>
  /^\[DEBUG\] Library concatenated and executed before the .+ hook\.$/.test(line) ||
  line === 'Library loaded successfully.';

/** The `[DEBUG] Modified Text: …` line is the hook's result, not a log line. */
const RESULT_PREFIX = '[DEBUG] Modified Text: ';

const isErrorLine = (line: string) =>
  /\[DEBUG\] EXECUTION ERROR|Worker Error|ERROR:/.test(line);

const toLine = (log: unknown): string =>
  typeof log === 'object' && log !== null ? JSON.stringify(log, null, 2) : String(log);

const HookSection: React.FC<{ entry: TraceEntry; index: number }> = ({ entry, index }) => {
  const [collapsed, setCollapsed] = useState(false);

  const all = (entry.logs ?? []).map(toLine);
  const ranLibrary = all.some(isLibraryBoilerplate);
  const result = all.find(l => l.startsWith(RESULT_PREFIX))?.slice(RESULT_PREFIX.length);
  const body = all.filter(l => !isLibraryBoilerplate(l) && !l.startsWith(RESULT_PREFIX));
  const failed = all.some(isErrorLine);

  return (
    <div className={`rounded-lg border ${failed ? 'border-red-500/40 bg-red-950/20' : 'border-zinc-800/60 bg-zinc-900/30'}`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-zinc-800/30 transition-colors rounded-lg"
      >
        {collapsed
          ? <ChevronRight size={12} className="text-zinc-500 shrink-0" />
          : <ChevronDown size={12} className="text-zinc-500 shrink-0" />}
        <span className="text-[9px] font-mono text-zinc-600 shrink-0">{index + 1}</span>
        <span className={`text-[10px] font-black uppercase tracking-widest ${failed ? 'text-red-400' : 'text-blue-300/80'}`}>
          {entry.scriptName}
        </span>
        {failed && <AlertTriangle size={11} className="text-red-400 shrink-0" />}
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {entry.stateChanged && (
            <span className="text-[9px] font-mono text-emerald-400/70 uppercase">state changed</span>
          )}
          <span className="text-[9px] font-mono text-zinc-600">{body.length} line{body.length === 1 ? '' : 's'}</span>
        </span>
      </button>

      {!collapsed && (
        <div className="px-2.5 pb-2.5 space-y-2">
          {ranLibrary && (
            <p className="text-[9px] font-mono text-zinc-600 italic">
              Library ran first, in this hook's scope
            </p>
          )}

          {body.length === 0 ? (
            <p className="text-[10px] font-mono text-zinc-600 italic">(no output)</p>
          ) : (
            <div className="space-y-1">
              {body.map((line, i) => (
                <pre
                  key={i}
                  className={`whitespace-pre-wrap break-words font-mono text-[11px] leading-snug ${
                    isErrorLine(line) ? 'text-red-300' : 'text-zinc-400'
                  }`}
                >
                  {line}
                </pre>
              ))}
            </div>
          )}

          {result !== undefined && (
            // What this hook handed to the next stage — the thing you actually
            // trace when text seems to vanish between hooks.
            <div className="flex items-start gap-1.5 pt-1.5 border-t border-zinc-800/50">
              <ArrowRightToLine size={11} className="text-emerald-500/70 shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-emerald-300/80 min-w-0">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ExecutionTrace: React.FC<{ trace: TraceEntry[]; className?: string }> = ({ trace, className = '' }) => {
  if (trace.length === 0) {
    return (
      <div className={`flex items-center justify-center p-6 text-center ${className}`}>
        <p className="text-xs italic text-zinc-600">No execution yet — run the Director to see the pipeline.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto custom-scrollbar p-2.5 space-y-2 ${className}`}>
      <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
        Pipeline · {trace.length} hook{trace.length === 1 ? '' : 's'} in fire order
      </p>
      {trace.map((entry, i) => (
        <HookSection key={`${entry.scriptName}-${i}`} entry={entry} index={i} />
      ))}
    </div>
  );
};

export default ExecutionTrace;
