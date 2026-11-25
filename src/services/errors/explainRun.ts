// Turn a hook run's raw runtime snapshots into "why is it undefined?"
// explanations. Used by the main pipeline (scriptingService) and the Block
// Canvas runners, so both say the same thing.

import type { ExecutionError, UndefinedNote } from '@/types';
import type { CaughtInWorker, UndefinedLogInWorker } from '../offlineSimulationService';
import { triangulate, type Triangulation } from './triangulate';

const UNDEFINED_KIND = /undefined|null|not a function|not iterable/;

export interface RunEvidence {
  /** Every script that was part of the run, by name (Library + hook, or the selection). */
  scripts: { name: string; code: string }[];
  /** The hook that ran. */
  hook: string;
  error?: ExecutionError | null;
  caught?: CaughtInWorker[];
  undefinedLogs?: UndefinedLogInWorker[];
}

export interface ExplainedRun {
  /** The error with `triangulation` added and the bulky snapshot removed. */
  error: ExecutionError | null;
  /** One explanation per caught error (or undefined), same order as `caught`. */
  caught: (Triangulation | undefined)[];
  undefinedNotes: UndefinedNote[];
}

const safely = <T,>(f: () => T): T | undefined => {
  try {
    return f();
  } catch {
    // An explanation is a bonus; never let it break the run report.
    return undefined;
  }
};

export function explainRun(ev: RunEvidence): ExplainedRun {
  let error: ExecutionError | null = ev.error ?? null;
  if (error) {
    const { snapshot, ...rest } = error;
    const line = Number(error.line);
    const triangulation = line > 0 && UNDEFINED_KIND.test(error.message)
      ? safely(() => triangulate({
          scripts: ev.scripts, hook: ev.hook, script: error!.script ?? ev.hook,
          line, column: error!.column, message: error!.message, snapshot,
        })) ?? undefined
      : undefined;
    error = { ...rest, ...(triangulation ? { triangulation } : {}) };
  }

  const caught = (ev.caught ?? []).map(c =>
    c.line && UNDEFINED_KIND.test(c.message)
      ? safely(() => triangulate({
          scripts: ev.scripts, hook: ev.hook, script: c.script, line: c.line!, column: c.column ?? undefined,
          message: c.message.replace(/^\w*Error: /, ''), snapshot: c.snapshot,
        })) ?? undefined
      : undefined);

  const undefinedNotes: UndefinedNote[] = (ev.undefinedLogs ?? []).map(u => ({
    script: u.script,
    line: u.line,
    sourceLine: u.sourceLine,
    explanations: u.args
      .map(argIndex => safely(() => triangulate({
        scripts: ev.scripts, hook: ev.hook, script: u.script, line: u.line, argIndex, snapshot: u.snapshot,
      })))
      .filter((t): t is Triangulation => Boolean(t)),
  }));

  return { error, caught, undefinedNotes };
}
