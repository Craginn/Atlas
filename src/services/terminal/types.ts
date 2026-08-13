import { Script, WorldState, KnowledgeBase } from '@/types';

// The command layer shared by the in-app terminal and the standalone CLI.
//
// Nothing here may import React or touch the DOM: the same registry runs inside
// a component and inside a Node process. Each front-end supplies a
// `CommandContext` describing how to read and write the workspace, so the
// commands themselves never know whether state lives in React, localStorage, or
// a JSON file on disk.

/** One line of terminal output. `kind` drives colour, not meaning. */
export interface OutputLine {
  kind: 'out' | 'err' | 'info' | 'input';
  text: string;
}

export interface CommandResult {
  lines: OutputLine[];
  /** Set when the command wants the session to end (CLI only; ignored in-app). */
  exit?: boolean;
}

/**
 * Everything a command may read or change.
 *
 * The setters are async so a file-backed front-end can await a write; the React
 * front-end resolves immediately.
 */
export interface CommandContext {
  getScripts(): Script[];
  setScripts(next: Script[]): Promise<void> | void;

  getWorldState(): WorldState;
  setWorldState(next: WorldState): Promise<void> | void;

  getKnowledgeBase(): KnowledgeBase;
  setKnowledgeBase(next: KnowledgeBase): Promise<void> | void;

  /**
   * Run one simulation turn. Injected rather than imported so the CLI can pick
   * the offline engine without pulling the browser-oriented service in.
   */
  runSimulation(input: string): Promise<{ output: string; reasoning?: string }>;

  /**
   * Run a shell command, streaming output as it arrives.
   *
   * Absent when no shell is reachable (a browser with the bridge disabled), in
   * which case the terminal explains how to get one instead of failing.
   */
  runShell?(
    command: string,
    onChunk: (line: OutputLine) => void,
    signal?: AbortSignal,
  ): Promise<{ exitCode: number }>;

  /**
   * Run a command into its own output panel rather than the terminal stream.
   *
   * Only the app supplies this; the CLI has no panel, so `/task` there falls
   * back to running inline. Resolves once the command finishes, returning the
   * summary line for the terminal — the output itself lives in the panel.
   */
  runTask?(command: string): Promise<OutputLine[]>;
}

export interface Command {
  name: string;
  /** Extra names that dispatch here, e.g. `ls` for `scripts`. */
  aliases?: string[];
  /** One-line summary for `/help`. */
  summary: string;
  /** Argument shape shown in `/help <name>`, e.g. '<name> [--active]'. */
  usage?: string;
  /** Longer text for `/help <name>`. */
  details?: string;
  run(
    args: string[],
    ctx: CommandContext,
    opts?: CommandRunOptions,
  ): Promise<CommandResult> | CommandResult;
}

export interface CommandRunOptions {
  /**
   * Emit a line before the command finishes. Long-running commands (`/sh`
   * especially) are unusable if their output only appears at the end, so lines
   * sent here are displayed immediately and must not be repeated in the result.
   */
  onLine?: (line: OutputLine) => void;
}

/** Convenience builders — commands return these constantly. */
export const out = (text: string): OutputLine => ({ kind: 'out', text });
export const err = (text: string): OutputLine => ({ kind: 'err', text });
export const info = (text: string): OutputLine => ({ kind: 'info', text });
export const ok = (...lines: OutputLine[]): CommandResult => ({ lines });
export const fail = (message: string): CommandResult => ({ lines: [err(message)] });
