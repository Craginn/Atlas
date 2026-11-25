import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { assembleContext } from './scriptingService';
import { lineDiff, parseProbeExport, rebuildWithAtlas, segmentContext, similarity } from './contextLab';
import type { KnowledgeBase } from '@/types';

const PROBE_DIR = path.resolve(__dirname, '../../AID Probe');
const read = (f: string) => fs.readFileSync(path.join(PROBE_DIR, f), 'utf8');

/**
 * Run one AID hook the way AID does: Library concatenated ahead of the hook,
 * sloppy mode, AID globals in scope. Returns the hook's `{ text }`.
 */
function runHook(hook: string, g: Record<string, unknown>) {
  const names = Object.keys(g);
  const src = `${read('Library.js')}\n;return (function(){\n${read(hook).replace('modifier(text);', 'return modifier(text);')}\n})();`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...names, src)(...names.map(n => g[n])) as { text: string };
}

/** A minimal stand-in for AID's story-card store and API, exported AID-style. */
function makeAid() {
  const storyCards: { keys: string; entry: string; type: string }[] = [];
  const state: Record<string, unknown> = { memory: {} };
  const logs: string[] = [];
  const api = {
    state,
    storyCards,
    log: (m: string) => logs.push(m),
    addStoryCard: (keys: string, entry: string, type: string) => {
      if (storyCards.some(c => c.keys === keys)) return false;
      storyCards.push({ keys, entry, type });
      return storyCards.length - 1;
    },
    updateStoryCard: (i: number, keys: string, entry: string, type: string) => {
      if (!storyCards[i]) throw new Error('no card');
      storyCards[i] = { keys, entry, type };
    },
    removeStoryCard: (i: number) => {
      if (!storyCards[i]) throw new Error('no card');
      storyCards.splice(i, 1);
    },
  };
  /** AID's export: entry is written as `value`. */
  const exportCards = () => JSON.stringify(storyCards.map(c => ({ keys: c.keys, value: c.entry, type: c.type })));
  return { api, logs, exportCards };
}

const kb = (over: Partial<KnowledgeBase> = {}): KnowledgeBase => ({
  aiInstructions: '', plotEssentials: '', storyCards: [], storySummary: '', memoryBank: '', recentHistory: '', authorsNote: '', ...over,
});

/** Play one turn through the probe, using Atlas's assembler as a stand-in for AID's. */
function playTurn(aid: ReturnType<typeof makeAid>, input: string, history: { text: string; type: string; rawText: string }[], k: KnowledgeBase) {
  const base = { ...aid.api, history, info: { actionCount: history.length, characterNames: [] } };
  runHook('Input.js', { ...base, text: input });
  const assembled = assembleContext(k, history, input, undefined, {
    cards: [{ id: 'c', title: 'Goblin', content: 'Goblins hate light.', keywords: ['goblin'], type: 'Custom', notes: '' }],
  });
  const ctxInfo = { ...base.info, maxChars: 8000, memoryLength: assembled.memoryLength };
  const ctxOut = runHook('Context.js', { ...base, info: ctxInfo, text: assembled.context });
  const outOut = runHook('Output.js', { ...base, text: 'The goblin shrieks.' });
  return { assembled, ctxOut, outOut };
}

describe('AID Probe scripts', () => {
  it('load as plain scripts', () => {
    for (const f of ['Library.js', 'Input.js', 'Context.js', 'Output.js']) {
      expect(() => new Function(read(f)), f).not.toThrow();
    }
  });

  it('never change the text, and round-trip a turn through an exported card file', () => {
    const aid = makeAid();
    const history = [
      { text: 'You stand at the mouth of a cave.', type: 'start', rawText: '' },
      { text: '\n> You light a torch.\n', type: 'do', rawText: '' },
      { text: 'A goblin squints at the flame.', type: 'continue', rawText: '' },
    ];
    const k = kb({ plotEssentials: 'You are a ranger.', authorsNote: 'Tense.', storySummary: 'A cave.' });
    const { assembled, ctxOut, outOut } = playTurn(aid, '\n> You step forward.\n', history, k);
    expect(ctxOut.text).toBe(assembled.context);
    expect(outOut.text).toBe('The goblin shrieks.');
    expect(aid.logs).toEqual([]);

    const { records, problems } = parseProbeExport(aid.exportCards());
    expect(problems).toEqual([]);
    expect(records).toHaveLength(1);
    expect(records[0].context?.text).toBe(assembled.context);
    expect(records[0].context?.info?.memoryLength).toBe('You are a ranger.'.length);
    expect(records[0].output?.text).toBe('The goblin shrieks.');

    // Atlas rebuilding its own output from the capture must match exactly.
    const rebuilt = rebuildWithAtlas(records[0])!;
    const ops = lineDiff(records[0].context!.text, rebuilt.atlas);
    expect(similarity(ops)).toBe(1);
  });

  it('splits long captures across cards and keeps only the last keepTurns turns', () => {
    const aid = makeAid();
    const longEssentials = 'x'.repeat(9000);
    for (let t = 0; t < 7; t++) {
      playTurn(aid, `\n> You wait ${t}.\n`, [{ text: 'Start.', type: 'start', rawText: '' }], kb({ plotEssentials: longEssentials }));
    }
    const seqs = new Set(aid.api.storyCards.map(c => c.keys.split(':')[1]));
    expect([...seqs].sort()).toEqual(['t3', 't4', 't5', 't6', 't7']);
    expect(aid.api.storyCards.filter(c => c.keys.startsWith('atlasprobe:t7:')).length).toBeGreaterThan(1);
    expect(parseProbeExport(aid.exportCards()).records.map(r => r.seq)).toEqual([3, 4, 5, 6, 7]);
  });
});

describe('parseProbeExport', () => {
  it('reports missing and truncated parts instead of failing silently', () => {
    const cut = JSON.stringify([{ keys: 'atlasprobe:t1:1/1', value: '{"probe":1,"seq":1,"cont' }]);
    expect(parseProbeExport(cut).problems[0]).toMatch(/cut off/);
    const gap = JSON.stringify([{ keys: 'atlasprobe:t2:1/2', value: '{' }]);
    expect(parseProbeExport(gap).problems[0]).toMatch(/missing part/);
    expect(parseProbeExport('[]').problems[0]).toMatch(/No Atlas probe cards/);
    expect(parseProbeExport('nope').problems[0]).toMatch(/Not valid JSON/);
  });
});

describe('segmentContext', () => {
  const text = [
    'You are a ranger.',
    'World Lore:',
    'Goblins hate light.',
    '',
    'Recent Story:',
    'A goblin squints.',
    '',
    "[Author's note: Tense.]",
    '> You step forward.',
    'FRONT',
  ].join('\n');

  it('labels each documented section', () => {
    const segs = segmentContext(text, 'You are a ranger.'.length, 'FRONT');
    expect(segs.map(s => [s.id, s.text])).toEqual([
      ['plotEssentials', 'You are a ranger.'],
      ['worldLore', 'World Lore:\nGoblins hate light.'],
      ['recentStory', 'Recent Story:\nA goblin squints.'],
      ['authorsNote', "[Author's note: Tense.]"],
      ['lastAction', '> You step forward.'],
      ['frontMemory', 'FRONT'],
    ]);
    for (const s of segs) expect(text.slice(s.from, s.to)).toBe(s.text);
  });

  it('flags text that memoryLength does not account for', () => {
    const segs = segmentContext(text, 4, null);
    expect(segs[0]).toMatchObject({ id: 'plotEssentials', text: 'You ' });
    expect(segs[1]).toMatchObject({ id: 'unknown', text: 'are a ranger.' });
  });
});

describe('lineDiff', () => {
  it('finds the lines only in one side', () => {
    const ops = lineDiff('a\nb\nc', 'a\nx\nc');
    expect(ops).toEqual([
      { op: 'same', text: 'a' },
      { op: 'del', text: 'b' },
      { op: 'add', text: 'x' },
      { op: 'same', text: 'c' },
    ]);
    expect(similarity(ops)).toBeCloseTo(2 / 3);
  });
});
