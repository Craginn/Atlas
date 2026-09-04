import { BlockNode } from './types';
import { generateCode } from './generate';
import { runOfflineSimulation } from '../offlineSimulationService';
import { toAidStoryCard } from '../scriptingService';
import { KnowledgeBase, StoryCard, WorldState } from '../../types';

/** The AID-shaped story card the sandbox actually sees. */
type AidCard = ReturnType<typeof toAidStoryCard>;

// Scratch execution for the block canvas.
//
// This is a *bench*, not the engine. The Director's Execute button runs the real
// pipeline and commits its results; this runs a hand-picked selection of blocks
// so you can poke at logic in isolation, and deliberately throws the resulting
// world state away. Nothing here can move the simulation.
//
// The selection runs as one concatenated program rather than block-by-block.
// Blocks share scope that way, so ordering a `let n = …` block ahead of a block
// that reads `n` does what it looks like it does — which is the whole point of
// being able to reorder the run.

/**
 * Plot Essentials reaches a real AID script as *context text*, not as globals —
 * a Context Modifier gets the whole blob as `text` and splits it apart itself
 * (with whatever helper the author wrote). A scratch run has no context to
 * split, so the Knowledge Base is injected as one `plot` object instead.
 *
 * One declaration, on one line, for two reasons: a single identifier is the
 * smallest possible collision surface against user code, and a fixed line count
 * keeps the runner's reported error lines easy to shift back onto the user's
 * own source.
 */
const PREAMBLE_LINES = 1;

function buildPreamble(kb?: KnowledgeBase): string {
  const plot = {
    aiInstructions: kb?.aiInstructions ?? '',
    plotEssentials: kb?.plotEssentials ?? '',
    storySummary: kb?.storySummary ?? '',
    memoryBank: kb?.memoryBank ?? '',
    recentHistory: kb?.recentHistory ?? '',
    authorsNote: kb?.authorsNote ?? '',
    storyCards: kb?.storyCards ?? [],
  };
  return `const plot = ${JSON.stringify(plot)};\n`;
}

/**
 * Give the sandbox the user's real cards.
 *
 * The Director's pipeline seeds `worldState.storyCards` from the Knowledge Base
 * before running a hook; without the same step here `storyCards` would be an
 * empty array and every add/update/remove would operate on nothing — the
 * feature would look like it worked while touching no real card.
 */
function seedWorldState(worldState: WorldState, kb?: KnowledgeBase): WorldState {
  const clone: WorldState = JSON.parse(JSON.stringify(worldState ?? {}));
  if (kb?.storyCards && !clone.storyCards) {
    clone.storyCards = kb.storyCards.map(toAidStoryCard);
  }
  return clone;
}

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
const DIRECTOR_ONLY = [
  '[DEBUG] Modified Text:',
  '[DEBUG] stop flag:',
];

export interface BlockRunResult {
  /** The exact source that was executed, so the console can show its work. */
  code: string;
  logs: string[];
  error: { line: string; message: string } | null;
  /** Whatever the selection returned, if anything. */
  result: unknown;
  ms: number;
  /**
   * Set when the selection ran clean but could not have produced output — every
   * block in it only *declares* something. "No output" is then the correct
   * result rather than a failure, and saying so beats reporting silence.
   */
  inertReason?: string;
  /**
   * Story card adds/updates/removes the run performed. Present only when the
   * deck actually changed. Nothing is persisted — this is the record of what
   * *would* happen, which the user can then choose to apply.
   */
  storyCards?: StoryCardChanges;
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

/**
 * Run an ordered selection of blocks against the Director's input.
 *
 * `worldState` is read to populate `state`/`storyCards`/`history` so the code
 * sees a realistic world, but the mutated copy the worker returns is discarded —
 * callers get logs and nothing else.
 */
export async function runBlocks(
  blocks: BlockNode[],
  input: string,
  worldState: WorldState,
  knowledgeBase?: KnowledgeBase,
): Promise<BlockRunResult> {
  const code = generateCode({ roots: blocks });
  const started = performance.now();

  if (!code.trim()) {
    return { code, logs: ['Nothing selected to run.'], error: null, result: null, ms: 0 };
  }

  const seeded = seedWorldState(worldState, knowledgeBase);
  const before: AidCard[] = JSON.parse(JSON.stringify(seeded.storyCards ?? []));

  // isModifierScript: false — a scratch selection is a fragment, not a hook, so
  // it must not be held to the `modifier(text)` contract the Director enforces.
  const run = await runOfflineSimulation(
    buildPreamble(knowledgeBase) + code, seeded, input, false, 'Block Canvas',
  );

  const logs = (run.logs ?? [])
    .map(l => (typeof l === 'string' ? l : JSON.stringify(l)))
    .filter(l => !DIRECTOR_ONLY.some(p => l.startsWith(p)));

  // The preamble sits above the user's code, so a raw line number would point
  // one line further down than the block they actually wrote.
  let line = run.error?.line ?? 'unknown';
  if (run.error && /^\d+$/.test(line)) {
    line = String(Math.max(1, Number(line) - PREAMBLE_LINES));
  }

  const after = (run.newState?.storyCards ?? []) as AidCard[];

  return {
    code,
    logs,
    error: run.error ? { line, message: run.error.message } : null,
    result: run.result,
    ms: Math.round(performance.now() - started),
    inertReason: !run.error && logs.length === 0 ? describeInertness(blocks) : undefined,
    storyCards: run.error ? undefined : diffStoryCards(before, after),
  };
}

/**
 * Convert the sandbox's cards back to Knowledge Base shape.
 *
 * Only used when the user explicitly applies a scratch run's card changes —
 * running alone never reaches this.
 */
export function toKnowledgeBaseCards(cards: AidCard[]): StoryCard[] {
  return cards.map(c => ({
    id: c.id,
    title: c.title ?? '',
    content: c.entry ?? '',
    keywords: typeof c.keys === 'string'
      ? c.keys.split(',').map(k => k.trim()).filter(Boolean)
      : [],
    type: (c.type ?? 'Custom') as StoryCard['type'],
    notes: c.description ?? '',
  }));
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
