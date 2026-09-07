import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Regression: attacking a spawned monster through the REAL pipeline must
// produce combat output. A missing closing brace on the `if (skillVerb)`
// block in Input.js swallowed playerAttack() — plain attacks ("attacks
// goblin") silently did nothing while skill casts worked, because every
// handler from the summon-direction code down to playerAttack() itself
// was nested inside the cast-verb branch.

const DIR = path.resolve(__dirname, '../../RPG ENGINE');
const read = (f: string) => fs.readFileSync(path.join(DIR, f), 'utf8');

vi.mock('./offlineSimulationService', () => ({
  AID_GLOBALS: [],
  validateScriptSyntax: () => ({ valid: true, errors: [], warnings: [] }),
  runOfflineSimulation: async (code: string, worldState: any, input: string, _isMod: boolean, hookName: string, history: any[] = []) => {
    const logs: unknown[] = [];
    const ws = JSON.parse(JSON.stringify(worldState));
    const console2 = { log: (...a: unknown[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')), error: () => {} };
    const storyCards = Array.isArray(ws.storyCards) ? ws.storyCards : (ws.storyCards = []);
    const addStoryCard = (keys: string, entry: string, type = 'Custom', name = keys, notes = '', o?: any) => {
      const { returnCard = false } = o ?? {};
      storyCards.push({ id: String(storyCards.length), keys, entry, type, title: name, description: notes });
      return returnCard ? storyCards[storyCards.length - 1] : storyCards.length;
    };
    const noop = () => {};
    const aidHistory = history.map(({ text, type, rawText }) => ({ text, type, rawText }));
    const exec = code.replace(/modifier\s*\(\s*text\s*\)\s*;?\s*$/, 'return modifier(text);');
    const wrapped =
      '(function(worldState, input, text, state, console, history, ' +
      'info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, ' +
      'removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry) {\n' + exec + '\n})';
    try {
      // Sloppy indirect eval: the fixture relies on implicit globals that a
      // strict-mode direct eval would reject.
      const fn = (0, eval)(wrapped);
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
import { Script } from '../types';

const scripts: Script[] = [
  { id: 's1', name: 'Library', trigger: '', description: '', code: read('Library.js'), active: true },
  { id: 's2', name: 'Input Modifier', trigger: '', description: '', code: read('Input.js'), active: true },
  { id: 's3', name: 'Context Modifier', trigger: '', description: '', code: read('Context.js'), active: true },
  { id: 's4', name: 'Output Modifier', trigger: '', description: '', code: read('Output.js'), active: true },
];

// Full flow: create a character, start the engine, enter the labyrinth,
// find a goblin (spawning it), then attack.
async function setupWorldWithGoblin() {
  let state: any = {};
  let history: any[] = [];
  const steps: [string, string][] = [
    ['/new player', 'Opening narration.'],
    ['Bob', 'What race?'],
    ['human', 'What gender?'],
    ['male', 'What class?'],
    ['knight', 'What element?'],
    ['fire', 'Character created.'],
    ['start game engine', 'The guide leads you to the safe haven.'],
    ['enter labyrinth', 'You descend into the dark labyrinth.'],
    ['search for a goblin', 'You spot a goblin lurking in the shadows.'],
  ];
  for (const [input, ai] of steps) {
    const res = await ScriptingService.simulateStep(input, state, scripts, 'local', undefined, ai, 'do', history);
    state = res.newState ?? state;
    history = res.newHistory ?? history;
  }
  return state;
}

describe('attacking a spawned monster through the real pipeline', () => {
  it('a plain attack reaches playerAttack and starts combat', async () => {
    const state = await setupWorldWithGoblin();
    const goblin = state.MS.activeMonsters.find((m: any) => m.name === 'Goblin');
    expect(goblin).toBeTruthy();                       // the goblin spawned
    expect(state.PS.combatstatus).toBe('Not in Combat');

    const res = await ScriptingService.simulateStep(
      'attacks goblin', state, scripts, 'local', undefined, 'The goblin hisses at you.',
    );

    const out = res.output ?? '';
    expect(out).toMatch(/Combat Started/);
    // First swing against a monster at range closes the distance.
    expect(out).toMatch(/closes the distance/);
    const newState: any = res.newState ?? state;
    expect(newState.PS.combatstatus).toBe('In Combat');
    expect(newState.MS.activeMonsters[0].distance).toBeLessThan(goblin.distance);
  });

  it('a second attack lands damage and can defeat the monster', async () => {
    const state = await setupWorldWithGoblin();
    // First swing closes the distance.
    const first = await ScriptingService.simulateStep(
      'attacks goblin', state, scripts, 'local', undefined, 'The goblin hisses.',
    );
    // Second swing connects.
    const second = await ScriptingService.simulateStep(
      'attack the goblin again', first.newState as any, scripts, 'local', undefined, 'The goblin snarls.',
    );

    const out = second.output ?? '';
    expect(out).toMatch(/Hit:Goblin\|Damage:\d+/);
    const newState: any = second.newState ?? first.newState;
    // The goblin died (16 HP vs a knight's opening swing).
    expect(newState.MS.activeMonsters.some((m: any) => m.name === 'Goblin' && !m.isDead)).toBe(false);
    expect(out).toMatch(/Defeated:Goblin/);
    expect(newState.PS.combatstatus).toBe('Not in Combat');
    // The kill paid out: XP and a monster core.
    expect(newState.PS.experience).toBeGreaterThan(0);
  });

  it('skill casting still works after the fix (cast verb path is unchanged)', async () => {
    const state = await setupWorldWithGoblin();
    // The knight starts knowing "slash". The goblin is at range, so the cast
    // closes the distance — only the known-skill path through useSkill does
    // this, proving the cast branch still works after the brace fix.
    const res = await ScriptingService.simulateStep(
      'cast slash', state, scripts, 'local', undefined, 'The goblin screeches.',
    );
    const mid: any = res.newState ?? state;
    expect(mid.MS.activeMonsters[0].distance).toBe('melee');
    // Closing is not a failure: no mana was spent, no damage dealt yet.
    expect(mid.PS.mana).toBe(state.PS.mana);
    expect(mid.MS.activeMonsters[0].health).toBe(16);
  });
});
