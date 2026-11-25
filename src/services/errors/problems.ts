// One model for "something is wrong in a script", whatever found it:
//
//   run     — the last turn threw (the engine stopped)
//   caught  — the last turn caught an error and console.error'd it
//   check   — the static checker (syntax errors, risky patterns)
//
// Every problem is located in the script the editor shows (the Library when
// that is where the bad line is) and carries a plain-language explanation, so
// every panel can say the same thing and offer the same "go to line".

import type { CaughtScriptError, ExecutionError, Script, ScriptLocation } from '@/types';
import { validateScriptSyntax } from '../offlineSimulationService';
import { declaredNames, explainError, type Explanation } from './explain';

export type ProblemSource = 'run' | 'caught' | 'check';

export interface Problem {
  id: string;
  source: ProblemSource;
  severity: 'error' | 'warning';
  /** Script name, as in the editor. */
  script: string;
  scriptId?: string;
  /** 1-based; 0 when the location is unknown. */
  line: number;
  column?: number;
  sourceLine?: string;
  /** The raw message (engine or checker). */
  message: string;
  explanation: Explanation;
  /** The hook that was running, for run/caught problems. */
  hook?: string;
  /** For a Library failure: the hook line that called into the Library. */
  calledFrom?: ScriptLocation;
  /** The script was edited since the run, so the line may have moved. */
  stale?: boolean;
}

const knownNamesOf = (scripts: Script[]) => scripts.flatMap(s => declaredNames(s.code ?? ''));

/** The line as it is in the script now — untrimmed, so a column still lines up with it. */
const lineText = (scripts: Script[], script: string, line: number) =>
  line > 0 ? (scripts.find(s => s.name === script)?.code ?? '').split('\n')[line - 1] : undefined;

/**
 * Problems from the last run. `ranCode` is each script's code at the time of the
 * run (by id), so a problem in a script edited since is flagged stale rather
 * than pointing at a line that may now hold something else.
 */
export function problemsFromRun(
  run: { executionError?: ExecutionError | null; scriptErrors?: CaughtScriptError[] } | null | undefined,
  scripts: Script[],
  ranCode?: Record<string, string>,
): Problem[] {
  if (!run) return [];
  const known = knownNamesOf(scripts);
  const out: Problem[] = [];
  const isStale = (scriptId?: string) =>
    !!(ranCode && scriptId && scripts.find(s => s.id === scriptId)?.code !== ranCode[scriptId]);

  const e = run.executionError;
  if (e) {
    const script = e.script ?? e.hook;
    const scriptId = scripts.find(s => s.name === script)?.id;
    const line = Number(e.line) || 0;
    const sourceLine = (!isStale(scriptId) && lineText(scripts, script, line)) || e.sourceLine;
    out.push({
      id: 'run',
      source: 'run',
      severity: 'error',
      script, scriptId, line,
      column: e.column,
      sourceLine,
      message: e.message,
      explanation: explainError(e.message, { sourceLine, column: e.column, knownNames: known }),
      hook: e.hook,
      calledFrom: e.calledFrom,
      stale: isStale(scriptId),
    });
  }

  (run.scriptErrors ?? []).forEach((c, i) => {
    const script = c.script ?? c.hook;
    const scriptId = scripts.find(s => s.name === script)?.id ?? c.scriptId;
    const line = Number(c.line) || 0;
    const sourceLine = (!isStale(scriptId) && lineText(scripts, script, line)) || c.sourceLine;
    // console.error('label:', e.message) → explain the engine part when present.
    const engine = c.message.replace(/^(?:Error|TypeError|ReferenceError|RangeError|SyntaxError): /, '');
    out.push({
      id: `caught-${i}`,
      source: 'caught',
      severity: 'warning',
      script, scriptId, line,
      column: c.column,
      sourceLine,
      message: c.message,
      explanation: explainError(engine, { sourceLine, column: c.column, knownNames: known }),
      hook: c.hook,
      stale: isStale(scriptId),
    });
  });
  return out;
}

/** Static check of every script. Hooks know the Library's names so they aren't flagged as typos. */
export function problemsFromChecks(scripts: Script[]): Problem[] {
  const library = scripts.find(s => s.name === 'Library');
  const libraryNames = library ? declaredNames(library.code ?? '') : [];
  const known = knownNamesOf(scripts);
  const out: Problem[] = [];
  for (const s of scripts) {
    if (!s.code?.trim()) continue;
    const isHook = s.name !== 'Library';
    const result = validateScriptSyntax(s.code, isHook, undefined, isHook ? libraryNames : []);
    for (const v of [...result.errors, ...result.warnings]) {
      const sourceLine = v.codeSnippet;
      out.push({
        id: `check-${s.id}-${v.line}-${v.column}-${v.type}`,
        source: 'check',
        severity: v.severity,
        script: s.name,
        scriptId: s.id,
        line: v.line,
        column: v.column || undefined,
        sourceLine,
        message: v.message,
        explanation: v.severity === 'error'
          ? explainError(v.message, { sourceLine, column: v.column, knownNames: known })
          : { title: v.message, explanation: '' },
      });
    }
  }
  return out;
}

/** "Library, line 4, col 7" */
export const describeLocation = (p: { script: string; line: number; column?: number }) =>
  p.line > 0 ? `${p.script}, line ${p.line}${p.column ? `, col ${p.column}` : ''}` : p.script;
