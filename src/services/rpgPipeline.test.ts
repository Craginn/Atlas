import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// End-to-end character creation through the REAL pipeline.
//
// The raw scripts run this sequence correctly in isolation, so a break that only
// shows up in the app lives in scriptingService's plumbing — the state.output
// override gate, the per-hook structured clone, hook ordering. This drives the
// actual ScriptingService with the actual fixture to catch exactly that.

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const read = (f: string) => fs.readFileSync(path.join(DIR, f), 'utf8');

// Stand in for the Web Worker: same wrapper and globals as
// offlineSimulationService, evaluated in-process. Sloppy mode matters — the
// fixture relies on implicit globals that would throw under strict mode.
vi.mock('./offlineSimulationService', () => ({
  AID_GLOBALS: [],
  validateScriptSyntax: () => ({ valid: true, errors: [], warnings: [] }),
  runOfflineSimulation: async (code: string, worldState: any, input: string, _isMod: boolean, hookName: string, history: any[] = []) => {
    const logs: unknown[] = [];
    const ws = JSON.parse(JSON.stringify(worldState));
    const console2 = {
      log: (...a: unknown[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
      error: () => {},
    };
    const storyCards = Array.isArray(ws.storyCards) ? ws.storyCards : (ws.storyCards = []);
    const addStoryCard = (keys: string, entry: string, type = 'Custom', name = keys, notes = '', o?: any) => {
      const { returnCard = false } = o ?? {};
      storyCards.push({ id: String(storyCards.length), keys, entry, type, title: name, description: notes });
      return returnCard ? storyCards[storyCards.length - 1] : storyCards.length;
    };
    const noop = () => {};
    // Mirror the real executor: history arrives as its own argument (not on
    // worldState), and the Atlas-only `turn` is stripped to AID's exact triple.
    const aidHistory = history.map(({ text, type, rawText }) => ({ text, type, rawText }));
    const exec = code.replace(/modifier\s*\(\s*text\s*\)\s*;?\s*$/, 'return modifier(text);');
    // Mirrors the executor's wrapper signature. extractSections/splatContext/
    // unsplatContext are deliberately absent: AID doesn't provide them, and the
    // fixture's Library.js defines its own.
    const wrapped =
      '(function(worldState, input, text, state, console, history, ' +
      'info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, ' +
      'removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry) {\n' + exec + '\n})';
    try {
      // eslint-disable-next-line no-eval
      const fn = eval(wrapped);
      const result = fn(
        ws, input, input, ws, console2, aidHistory,
        { actionCount: 0, characters: [], maxChars: 4000 }, storyCards, ws.memory || (ws.memory = {}),
        false, console2.log, addStoryCard, noop, noop, addStoryCard, noop, noop,
      );
      return { newState: ws, logs, result, error: null };
    } catch (err) {
      return {
        newState: worldState, logs, result: null,
        error: { hook: hookName, line: 'unknown', message: (err as Error).message },
      };
    }
  },
}));

import { ScriptingService } from './scriptingService';
import { Script, HistoryEntry } from '../types';

const scripts: Script[] = [
  { id: 's1', name: 'Library', trigger: '', description: '', code: read('Library.js'), active: true },
  { id: 's2', name: 'Input Modifier', trigger: '', description: '', code: read('Input.js'), active: true },
  { id: 's3', name: 'Context Modifier', trigger: '', description: '', code: read('Context.js'), active: true },
  { id: 's4', name: 'Output Modifier', trigger: '', description: '', code: read('Output.js'), active: true },
];

// The RPG Config story card gates /new player and ships disabled. Character
// creation tests start from a world where an operator has already enabled it.
const enabledConfigState = () => ({
  storyCards: [{
    id: '1', keys: 'RPG Config', title: 'RPG Config', type: 'Custom', description: '',
    entry: '> Enabled: true\n> Game Mode: open-world\n> Difficulty: medium\n' +
           '> Permadeath: false\n> Survival: true',
  }],
});

describe('RPG engine character creation through the real pipeline', () => {
  it('carries every question to the Output, including Race', async () => {
    let state: any = enabledConfigState();
    const seen: string[] = [];

    for (const answer of ['/new player', 'Bob', 'elf', 'male', 'knight', 'fire']) {
      const res = await ScriptingService.simulateStep(
        answer, state, scripts, 'local', undefined, 'AI narration here.',
      );
      state = res.newState ?? state;
      seen.push(res.output ?? '');
    }

    expect(seen[0]).toMatch(/What is your name\?/);
    expect(seen[1]).toMatch(/What is your race\?/);
    // The reported break: the Race answer produced no Gender prompt in the app.
    expect(seen[2]).toMatch(/What is your gender\?/);
    expect(seen[3]).toMatch(/What is your class\?/);
    expect(seen[4]).toMatch(/What is your element\?/);
    expect(seen[5]).toMatch(/SC Created/);
    expect(state.PS?.Race).toBe('elf');
    expect(state.PS?.Element).toBe('fire');
    // The element's affinity bonus landed on the character.
    expect(state.PS?.['fire damage']).toBe(10);
  });

  it('re-issues an identical prompt when the same answer is rejected twice', async () => {
    let state: any = enabledConfigState();
    for (const a of ['/new player', 'Bob']) {
      const res = await ScriptingService.simulateStep(a, state, scripts, 'local', undefined, 'AI.');
      state = res.newState ?? state;
    }
    // Two identical invalid answers in a row: the second must still be shown.
    const first = await ScriptingService.simulateStep('notarace', state, scripts, 'local', undefined, 'AI.');
    state = first.newState ?? state;
    const second = await ScriptingService.simulateStep('notarace', state, scripts, 'local', undefined, 'AI.');

    expect(first.output).toMatch(/Invalid option/);
    expect(second.output).toMatch(/Invalid option/);
  });
});

describe('RPG config card', () => {
  // The creation gate is switched off (RPG_CONFIG_GATE_ENABLED = false), so a
  // fresh world goes straight into creation while the card is still authored.
  it('does not block creation on a fresh world, but still writes the card', async () => {
    const res = await ScriptingService.simulateStep(
      '/new player', {}, scripts, 'local', undefined, 'AI narration here.',
    );
    const state = res.newState ?? {};

    expect(res.output).toMatch(/What is your name\?/);
    expect(state.tempCharacter).toBeTruthy();      // creation started
    // The card is still created so the world stays configurable.
    const card = (state.storyCards ?? []).find((c: any) => c.keys === 'RPG Config');
    expect(card).toBeTruthy();
    expect(card.entry).toMatch(/> Game Mode: open-world/);
  });

  it('lets creation proceed once the config card is enabled', async () => {
    const res = await ScriptingService.simulateStep(
      '/new player', enabledConfigState(), scripts, 'local', undefined, 'AI narration here.',
    );
    expect(res.output).toMatch(/What is your name\?/);
  });
});

describe('AID history global', () => {
  it('records turns in AID shape so scripts reading history get something', async () => {
    let state: any = enabledConfigState();
    let history: HistoryEntry[] = [];
    for (const a of ['/new player', 'Bob']) {
      const res = await ScriptingService.simulateStep(a, state, scripts, 'local', undefined, 'AI.', 'do', history);
      state = res.newState ?? state;
      history = res.newHistory ?? history;
    }
    const h = history;
    expect(Array.isArray(h)).toBe(true);
    // History is engine-owned and lives outside the state object.
    expect(state.history).toBeUndefined();
    // Opening action is AID's `start`; later player actions are `do`.
    expect(h[0]).toMatchObject({ type: 'start', rawText: '/new player' });
    expect(h.some((e: any) => e.type === 'continue')).toBe(true);
    expect(h.find((e: any) => e.rawText === 'Bob')).toMatchObject({ type: 'do' });
    // Stored entries carry the AID triple plus Atlas's `turn` annotation; the turn
    // is stripped at the sandbox boundary (offlineSimulationService) so a script's
    // `history` global still sees only { text, type, rawText }.
    for (const e of h) expect(Object.keys(e).sort()).toEqual(['rawText', 'text', 'turn', 'type']);
    // The opening and its output share turn 1; the next action starts turn 2.
    expect(h[0].turn).toBe(1);
    expect(h.find((e: any) => e.rawText === 'Bob')?.turn).toBe(2);
  });

  it('exposes the running history to the scripts themselves', async () => {
    let state: any = enabledConfigState();
    const first = await ScriptingService.simulateStep('/new player', state, scripts, 'local', undefined, 'AI.');
    state = first.newState ?? state;
    const history = first.newHistory ?? [];
    // Second turn's hooks must see the first turn already recorded.
    expect(history.length).toBeGreaterThan(0);
    const second = await ScriptingService.simulateStep('Bob', state, scripts, 'local', undefined, 'AI.', 'do', history);
    expect((second.newHistory ?? []).length).toBeGreaterThan(history.length);
  });

  it('strips the Atlas-only turn field before a script reads history', async () => {
    const seen: string[][] = [];
    const spy: Script = {
      id: 'spy', name: 'Input Modifier', trigger: '', active: true, description: '',
      code: 'const modifier=(t)=>{ if(history[0]) log(JSON.stringify(Object.keys(history[0]).sort())); return {text:t}; }; modifier(text);',
    };
    const first = await ScriptingService.simulateStep('/new player', {}, [spy], 'local', undefined, 'AI.');
    const history = first.newHistory ?? [];
    expect(history[0]?.turn).toBe(1); // stored copy keeps it
    // Second turn: the hook logs the keys of history[0] as the sandbox sees them.
    const res = await ScriptingService.simulateStep('Bob', first.newState ?? {}, [spy], 'local', undefined, 'AI.', 'do', history);
    const trace = JSON.parse(res.reasoning ?? '[]');
    const logged = trace.flatMap((t: any) => t.logs).find((l: string) => l.includes('rawText'));
    expect(logged).toBe('["rawText","text","type"]'); // no turn
  });
});
