import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(__dirname, '../../Mock Script Test');
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
      const fn = (0, eval)(wrapped);
      const result = fn(ws, input, input, ws, console2, aidHistory,
        { actionCount: 0, characters: [], maxChars: 4000 }, storyCards, ws.memory || (ws.memory = {}),
        false, console2.log, addStoryCard, noop, noop, addStoryCard, noop, noop);
      return { newState: ws, logs, result, error: null };
    } catch (err) {
      return { newState: worldState, logs, result: null, error: { hook: hookName, line: 'unknown', message: (err as Error).message } };
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

describe('player actions flow into the Context prompt', () => {
  it('parses a multi-action input and tunes the AI prompt', async () => {
    let state: any = {};
    for (const answer of ['/new player', 'Bob', 'elf', 'male', 'knight', 'fire']) {
      const res = await ScriptingService.simulateStep(answer, state, scripts, 'local', undefined, 'AI.');
      state = res.newState ?? state;
    }

    // A turn with two actions in one input.
    const res = await ScriptingService.simulateStep(
      'I attack the goblin and then drink a health potion.', state, scripts, 'local', undefined, 'AI narration.',
    );
    state = res.newState ?? state;

    // Input parsed both actions onto state. (Input tags monster names in
    // [brackets], so the captured target reads "[goblin]".)
    expect(Array.isArray(state.PlayerActions)).toBe(true);
    expect(state.PlayerActions.map((a: any) => a.name)).toEqual(['Attack', 'Use Item']);
    expect(state.PlayerActionPrompt).toMatch(/attack the \[?goblin\]?/i);
    expect(state.PlayerActionPrompt).toMatch(/use health potion/i);

    // The tuned prompt reached the context the AI receives.
    const ctx = res.aiCall?.contextSent ?? '';
    expect(ctx).toMatch(/## PLAYER INTENT/);
    expect(ctx).toMatch(/MULTIPLE actions/);
    expect(ctx).toMatch(/Resolve the combat action/);       // combat guidance
    expect(ctx).toMatch(/Reflect the item being used/);     // inventory guidance
  });

  it('resolves empty action fields from engine state (weapon, target, spell)', async () => {
    let state: any = {};
    for (const answer of ['/new player', 'Mira', 'human', 'female', 'wizard', 'fire']) {
      const res = await ScriptingService.simulateStep(answer, state, scripts, 'local', undefined, 'AI.');
      state = res.newState ?? state;
    }

    // Give the player an equipped weapon and put a live monster on the field,
    // then let the parser fill the fields the free text didn't name.
    state.PS = state.PS || {};
    state.PS.equipped = { mainhand: { name: 'Copper Shortsword', slot: 'mainhand', type: 'weapon' } };
    state.MS = state.MS || {};
    state.MS.activeMonsters = [{ name: 'Goblin', health: 20, maxHealth: 20, isDead: false }];

    const res = await ScriptingService.simulateStep(
      'I attack', state, scripts, 'local', undefined, 'AI narration.',
    );
    state = res.newState ?? state;

    const attack = (state.PlayerActions || [])[0] ?? {};
    // Target defaulted to the only active monster; weapon pulled from equipped.
    expect(attack.name).toBe('Attack');
    expect(attack.target).toBe('Goblin');
    expect(attack.weapon).toBe('Copper Shortsword');

    // The resolved names reach the prompt the AI receives.
    const ctx = res.aiCall?.contextSent ?? '';
    expect(ctx).toMatch(/## PLAYER INTENT/);
    expect(ctx).toMatch(/attack the Goblin/);
    expect(ctx).toMatch(/with their Copper Shortsword/);
  });

  it('detects and executes a multi-word skill from natural input (blood rend)', async () => {
    let state: any = {};
    for (const answer of ['/new player', 'Rev', 'elf', 'male', 'revanant', 'fire']) {
      const res = await ScriptingService.simulateStep(answer, state, scripts, 'local', undefined, 'AI.');
      state = res.newState ?? state;
    }

    // Revanant starts knowing "blood rend"; give it HP and a melee target.
    state.PS.health = 100;
    state.PS.maxHealth = 100;
    state.MS = state.MS || {};
    state.MS.activeMonsters = [{
      name: 'Goblin', health: 200, maxHealth: 200, count: 1, distance: 'melee', state: 'Idle',
      enemyDefenses: { armor: 0, magicRes: 0, vulnerability: 0 },
    }];
    state.MS.deadMonsters = [];
    state.MS.lastTarget = null;

    // Natural phrasing the OLD detector missed (no trailing period, "blood rend"
    // is multi-word, and the greedy capture used to swallow the target).
    const res = await ScriptingService.simulateStep(
      'cast blood rend', state, scripts, 'local', undefined, 'AI narration.',
    );
    state = res.newState ?? state;

    // The engine caught it: blood rend landed and damaged the goblin. (Exact
    // damage varies with the revanant's bleed weapon/stats and crit, so assert it
    // took damage rather than a magic number.)
    expect(state.MS.activeMonsters[0].health).toBeLessThan(200);
  });

  it('closing distance for a melee skill is not reported as a failed cast', async () => {
    let state: any = {};
    for (const answer of ['/new player', 'Rev', 'elf', 'male', 'revanant', 'fire']) {
      const res = await ScriptingService.simulateStep(answer, state, scripts, 'local', undefined, 'AI.');
      state = res.newState ?? state;
    }

    // Goblin is at range (as monsters spawn) — a melee skill must close first.
    state.PS.health = 100;
    state.PS.maxHealth = 100;
    state.MS = state.MS || {};
    state.MS.activeMonsters = [{
      name: 'Goblin', health: 16, maxHealth: 16, count: 1, distance: 'ranged', state: 'Idle',
      enemyDefenses: { armor: 0, magicRes: 0, vulnerability: 0 },
    }];
    state.MS.deadMonsters = [];
    state.MS.lastTarget = null;

    const res = await ScriptingService.simulateStep(
      'cast blood rend', state, scripts, 'local', undefined, 'AI narration.',
    );
    state = res.newState ?? state;

    // Blood rend was recognized and attempted: useSkill ran all the way to the
    // reach gate and charged the goblin into melee — this is only reachable on
    // the known-skill path, NOT the fallback "failed to cast" branch (which never
    // calls useSkill and so would leave distance === 'ranged'). The blow doesn't
    // land this turn and no HP is paid, i.e. closing distance is treated as a
    // legitimate outcome rather than a hard failure.
    expect(state.MS.activeMonsters[0].distance).toBe('melee'); // charged in (useSkill ran)
    expect(state.MS.activeMonsters[0].health).toBe(16);        // no damage yet
    expect(state.PS.health).toBe(100);                         // no cost paid yet
  });
});
