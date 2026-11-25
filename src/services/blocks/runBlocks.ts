import { BlockNode } from './types';
import { generateCode } from './generate';
import { runOfflineSimulation, type CaughtInWorker } from '../offlineSimulationService';
import { toAidStoryCard, fromAidStoryCard, normalizeModifierResult } from '../scriptingService';
import { diff, type Delta } from '../stateDiff';
import { explainRun } from '../errors/explainRun';
import type { Triangulation } from '../errors/triangulate';
import type { ExecutionError, KnowledgeBase, StoryCard, UndefinedNote, WorldState } from '../../types';

/** The AID-shaped story card the sandbox actually sees. */
type AidCard = ReturnType<typeof toAidStoryCard>;

// Runners for the block canvas. Two kinds:
//
//   runBlocks         — a hand-picked selection of blocks, run as one program.
//                       For poking at a piece of logic in isolation.
//   runScriptAsHook   — the whole script, exactly as AI Dungeon would run it:
//                       Library first, then the hook, called with `text`.
//
// Both are benches, not the engine: the resulting world state is shown and
// thrown away. Story card changes can be applied on request.
//
// Neither injects anything AI Dungeon doesn't have. (An earlier version added
// a `plot` object for convenience; code written against it crashed in AID.)

/**
 * Give the sandbox the user's real cards.
 *
 * The Director's pipeline seeds `worldState.storyCards` from the Knowledge Base
 * before running a hook; without the same step here `storyCards` would be an
 * empty array and every add/update/remove would operate on nothing.
 */
function seedWorldState(worldState: WorldState, kb?: KnowledgeBase): WorldState {
  const clone: WorldState = JSON.parse(JSON.stringify(worldState ?? {}));
  if (kb?.storyCards && !clone.storyCards) {
    clone.storyCards = kb.storyCards.map(toAidStoryCard);
  }
  return clone;
}

export { seedWorldState };

export interface StoryCardChanges {
  added: AidCard[];
  removed: AidCard[];
  updated: AidCard[];
  /** The full post-run deck, ready to apply if the user asks for it. */
  after: AidCard[];
}

/** What the run did to the deck — the visible proof that a card edit landed. */
function diffStoryCards(before: AidCard[], after: AidCard[]): StoryCardChanges | undefined {
  const key = (c: AidCard) => `${c.keys}|${c.entry}|${c.type}|${c.title}|${c.description}`;
  const beforeById = new Map(before.map(c => [c.id, c]));
  const afterById = new Map(after.map(c => [c.id, c]));

  const added = after.filter(c => !beforeById.has(c.id));
  const removed = before.filter(c => !afterById.has(c.id));
  const updated = after.filter(c => {
    const prev = beforeById.get(c.id);
    return prev && key(prev) !== key(c);
  });

  if (!added.length && !removed.length && !updated.length) return undefined;
  return { added, removed, updated, after };
}

/** Noise the shared runner appends for the Director's benefit, not ours. */
const DIRECTOR_ONLY = ['[DEBUG] Modified Text:', '[DEBUG] stop flag:'];

const cleanLogs = (logs: unknown[]) =>
  logs
    .map(l => (typeof l === 'string' ? l : JSON.stringify(l)))
    .filter(l => !DIRECTOR_ONLY.some(p => l.startsWith(p)))
    // Caught errors are shown structured, with their line; don't repeat them raw.
    .filter(l => !l.startsWith('ERROR:'));

export interface BlockRunResult {
  /** The exact source that was executed, so the console can show its work. */
  code: string;
  logs: string[];
  /** The failure, located (script + line + column) — the selection's code is "Block Canvas". */
  error: ExecutionError | null;
  /** Errors the code caught and console.error'd, located. */
  caught: CaughtInWorker[];
  /** Why each caught error's value was undefined (same order as caught). */
  caughtWhy?: (Triangulation | undefined)[];
  /** log() calls that printed undefined, with why. */
  undefinedNotes?: UndefinedNote[];
  /** Whatever the selection returned, if anything. */
  result: unknown;
  ms: number;
  /**
   * Set when the selection ran clean but could not have produced output — every
   * block in it only *declares* something. "No output" is then the correct
   * result rather than a failure, and saying so beats reporting silence.
   */
  inertReason?: string;
  /** Story card adds/updates/removes the run performed (not persisted). */
  storyCards?: StoryCardChanges;
  /** What the run changed on `state` (not persisted). */
  stateChanges: Delta[];
}

/**
 * A selection made only of declarations runs successfully and does nothing.
 * That's the single most confusing way for a scratch run to come back empty, so
 * it's worth naming rather than leaving the user to spot it in the source.
 */
function describeInertness(blocks: BlockNode[]): string | undefined {
  if (!blocks.length) return undefined;
  const declaresOnly = blocks.every(b => b.kind === 'function');
  if (!declaresOnly) return undefined;
  const names = blocks.map(b => b.fields.name).filter(Boolean);
  return names.length
    ? `Declared ${names.join(', ')} but never called it. Add a “Call a Function” block to run it.`
    : 'This selection only declares a function — nothing called it.';
}

const stateOf = (ws: WorldState) => {
  // storyCards are reported separately; keep them out of the state diff.
  const { storyCards: _cards, ...rest } = (ws ?? {}) as Record<string, unknown>;
  // The sandbox always provides `state.memory` (AI Dungeon does too), so an
  // empty one appearing is not something the script did.
  if (rest.memory && typeof rest.memory === 'object' && Object.keys(rest.memory).length === 0) delete rest.memory;
  return rest;
};

/**
 * Run an ordered selection of blocks against the Director's input. When
 * `libraryCode` is given (a hook's blocks), it runs first, as in AI Dungeon, so
 * Library functions can be called.
 */
export async function runBlocks(
  blocks: BlockNode[],
  input: string,
  worldState: WorldState,
  knowledgeBase?: KnowledgeBase,
  libraryCode = '',
): Promise<BlockRunResult> {
  const code = generateCode({ roots: blocks });
  const started = performance.now();

  if (!code.trim()) {
    return { code, logs: ['Nothing selected to run.'], error: null, caught: [], result: null, ms: 0, stateChanges: [] };
  }

  const seeded = seedWorldState(worldState, knowledgeBase);
  const before: AidCard[] = JSON.parse(JSON.stringify(seeded.storyCards ?? []));
  const stateBefore = stateOf(seeded);
  const hasLibrary = libraryCode.trim().length > 0;

  // isModifierScript: false — a scratch selection is a fragment, not a hook, so
  // it must not be held to the `modifier(text)` contract the Director enforces.
  const run = await runOfflineSimulation(
    hasLibrary ? `${libraryCode}\n${code}` : code, seeded, input, false, 'Block Canvas', [], code, 0, 'Library',
  );

  const logs = cleanLogs(run.logs ?? []);
  const after = (run.newState?.storyCards ?? []) as AidCard[];
  const explained = explainRun({
    scripts: [...(hasLibrary ? [{ name: 'Library', code: libraryCode }] : []), { name: 'Block Canvas', code }],
    hook: 'Block Canvas', error: run.error, caught: run.caught, undefinedLogs: run.undefinedLogs,
  });

  return {
    code,
    logs,
    error: explained.error,
    caught: run.caught ?? [],
    caughtWhy: explained.caught,
    undefinedNotes: explained.undefinedNotes,
    result: run.result,
    ms: Math.round(performance.now() - started),
    inertReason: !run.error && logs.length === 0 ? describeInertness(blocks) : undefined,
    storyCards: run.error ? undefined : diffStoryCards(before, after),
    stateChanges: run.error ? [] : diff(stateBefore, stateOf(run.newState)),
  };
}

export interface HookRunResult {
  hook: string;
  /** The text the hook received. */
  textIn: string;
  /** The text it handed back, or undefined when it returned none (text passes through). */
  textOut?: string;
  stopped: boolean;
  logs: string[];
  error: ExecutionError | null;
  caught: CaughtInWorker[];
  caughtWhy?: (Triangulation | undefined)[];
  /** log() calls that printed undefined, with why. */
  undefinedNotes?: UndefinedNote[];
  stateChanges: Delta[];
  storyCards?: StoryCardChanges;
  /** state.message, if the hook set one. */
  message?: string;
  ms: number;
}

/**
 * Run a whole script as the hook it is — Library first, then the hook called
 * with `text` — and report everything it did. Nothing is saved.
 */
export async function runScriptAsHook(
  hook: { name: string; code: string },
  libraryCode: string,
  input: string,
  worldState: WorldState,
  knowledgeBase?: KnowledgeBase,
): Promise<HookRunResult> {
  const started = performance.now();
  const seeded = seedWorldState(worldState, knowledgeBase);
  const before: AidCard[] = JSON.parse(JSON.stringify(seeded.storyCards ?? []));
  const stateBefore = stateOf(seeded);
  const isLibrary = hook.name === 'Library';
  const hasLibrary = !isLibrary && libraryCode.trim().length > 0;

  const run = await runOfflineSimulation(
    hasLibrary ? `${libraryCode}\n${hook.code}` : hook.code,
    seeded, input, !isLibrary, hook.name, [], hook.code, 0, 'Library',
  );
  const { text, stop } = isLibrary ? { text: undefined, stop: false } : normalizeModifierResult(run.result);
  const explained = explainRun({
    scripts: [...(hasLibrary ? [{ name: 'Library', code: libraryCode }] : []), { name: hook.name, code: hook.code }],
    hook: hook.name, error: run.error, caught: run.caught, undefinedLogs: run.undefinedLogs,
  });
  const after = (run.newState?.storyCards ?? []) as AidCard[];
  const stateAfter = stateOf(run.newState);
  const message = typeof stateAfter.message === 'string' && stateAfter.message !== stateBefore.message
    ? stateAfter.message
    : undefined;

  return {
    hook: hook.name,
    textIn: input,
    textOut: typeof text === 'string' ? text : undefined,
    stopped: Boolean(stop),
    logs: cleanLogs(run.logs ?? []).filter(l => !l.startsWith('[DEBUG]') && !l.startsWith('[ERROR]')),
    error: explained.error,
    caught: run.caught ?? [],
    caughtWhy: explained.caught,
    undefinedNotes: explained.undefinedNotes,
    stateChanges: run.error ? [] : diff(stateBefore, stateAfter),
    storyCards: run.error ? undefined : diffStoryCards(before, after),
    message,
    ms: Math.round(performance.now() - started),
  };
}

/**
 * Convert the sandbox's cards back to Knowledge Base shape.
 *
 * Only used when the user explicitly applies a scratch run's card changes —
 * running alone never reaches this.
 */
export function toKnowledgeBaseCards(cards: AidCard[]): StoryCard[] {
  return cards.map(c => fromAidStoryCard(c));
}

/** Depth-first lookup so any block, nested or not, can join the run order. */
export function findBlock(roots: BlockNode[], id: string): BlockNode | null {
  for (const node of roots) {
    if (node.id === id) return node;
    for (const list of Object.values(node.slots)) {
      const hit = findBlock(list, id);
      if (hit) return hit;
    }
  }
  return null;
}
