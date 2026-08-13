import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Unit coverage for the Revanant class added to the fixture's Library.js.
// The fixture relies on implicit globals and top-level statements that touch
// `state`, so we eval it in SLOPPY mode (Function constructor) with `state`,
// `info` and `history` supplied as parameters, and return the internals we
// want to drive directly.

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

// Build a fresh sandbox (and fresh `state`) per test. The factory runs
// Library.js top-to-bottom against the `state` we hand it, then hands back the
// symbols we assert on.
function loadFixture() {
  const state: any = { logMessages: { Output: [], Input: [] }, storyCards: [], memory: {} };
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const console2 = { log: noop, error: noop };
  // Same globals the offlineSimulationService/pipeline wrapper supplies.
  const factory = new Function(
    'worldState', 'input', 'text', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `${src}\n; return {
       characterOptions, optionDescriptions, STARTING_ABILITIES,
       getStartingInventory, getPlayerDamage, useSkill, calculateEffectiveStats
     };`,
  );
  const api = factory(
    state, '', '', state, console2, [],
    info, state.storyCards, state.memory, noop, noop, noop, noop,
    noop, noop, noop, noop,
  );
  // Library's top-level block initializes state.PS/state.MS when absent.
  return { state, api };
}

// Give the player a combat-ready Revanant with the requested skills known and a
// single melee monster in reach.
function makeRevanant(state: any, skills: string[]) {
  state.PS.Class = 'revanant';
  state.PS.Name = 'Rev';
  state.PS.health = 100;
  state.PS.maxHealth = 100;
  state.PS.mana = 50;
  state.PS.maxMana = 50;
  state.PS.skills = {};
  for (const s of skills) state.PS.skills[s] = {};
  state.PS.abilityCooldowns = {};
  state.MS = state.MS || {};
  state.MS.activeMonsters = [
    { name: 'Goblin', health: 200, maxHealth: 200, count: 1, distance: 'melee', state: 'Idle',
      enemyDefenses: { armor: 0, magicRes: 0, vulnerability: 0 } },
  ];
  state.MS.deadMonsters = [];
  state.MS.lastTarget = null;
}

describe('Revanant class registration', () => {
  it('is a selectable class with a description', () => {
    const { api } = loadFixture();
    expect(api.characterOptions.Class).toContain('revanant');
    expect(api.optionDescriptions.Class.revanant).toMatch(/blood/i);
  });

  it('starts knowing blood rend, empower and mend', () => {
    const { api } = loadFixture();
    expect(api.STARTING_ABILITIES.revanant).toEqual(['blood rend', 'empower', 'mend']);
  });

  it('gets a bleed weapon in its starting inventory', () => {
    const { api } = loadFixture();
    const inv = api.getStartingInventory('revanant', { name: 'Trinket', type: 'misc' });
    const blade = inv.find((i: any) => i.name === 'Serrated Blade');
    expect(blade).toBeTruthy();
    expect(blade.modifiers['bleed damage']).toBe(6);
  });
});

describe('Revanant damage bucket', () => {
  it('routes bleed through the physical bucket in getPlayerDamage', () => {
    const { state, api } = loadFixture();
    makeRevanant(state, []);
    state.PS['crit chance'] = 0;         // deterministic (no crit)
    state.PS.strength = 0;               // strength*2 also feeds physical damage
    state.PS['bleed damage'] = 20;
    state.PS['physical damage'] = 10;
    state.PS.equipped = {};              // no equipment modifiers
    const dmg = api.getPlayerDamage({ armor: 0, magicRes: 0, vulnerability: 0 });
    expect(dmg).toBe(30);               // 20 bleed + 10 physical, no mitigation
  });
});

describe('Revanant blood-fueled abilities', () => {
  it('blood rend spends 10 HP and damages the target', () => {
    const { state, api } = loadFixture();
    makeRevanant(state, ['blood rend']);
    const before = state.MS.activeMonsters[0].health;
    const [ok] = api.useSkill('blood rend', 'attack the goblin');
    expect(ok).toBe(true);
    expect(state.PS.health).toBe(90);                       // paid 10 HP
    expect(state.MS.activeMonsters[0].health).toBe(before - 25); // dealt 25
  });

  it('blood rend is refused (no HP spent) when health is too low', () => {
    const { state, api } = loadFixture();
    makeRevanant(state, ['blood rend']);
    state.PS.health = 10;                                   // == cost, not enough
    const before = state.MS.activeMonsters[0].health;
    const [ok] = api.useSkill('blood rend', 'attack the goblin');
    expect(ok).toBe(false);
    expect(state.PS.health).toBe(10);                       // unchanged
    expect(state.MS.activeMonsters[0].health).toBe(before); // no damage
  });

  it('empower spends 15 HP and raises physical damage', () => {
    const { state, api } = loadFixture();
    makeRevanant(state, ['empower']);
    state.PS.equipped = {};
    state.PS['physical damage'] = 0;
    api.useSkill('empower', 'empower myself');
    expect(state.PS.health).toBe(85);              // paid 15 HP
    expect(state.PS['physical damage']).toBe(15);  // buff applied
  });

  it('mend heals and goes on an 8-turn cooldown', () => {
    const { state, api } = loadFixture();
    makeRevanant(state, ['mend']);
    state.PS.health = 50;
    const [ok] = api.useSkill('mend', 'heal myself');
    expect(ok).toBe(true);
    expect(state.PS.health).toBe(75);              // +25 heal
    expect(state.PS.abilityCooldowns['mend']).toBe(8);
  });
});
