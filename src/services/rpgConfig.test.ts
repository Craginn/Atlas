import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Coverage for the RPG world-configuration Story Card + new-player gate added to
// the fixture's Library.js. Evaluated SLOPPY (Function constructor) with the same
// globals the pipeline wrapper supplies — including a working addStoryCard so the
// config card can be created/read via CommunityUtils.StoryCards.

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

function loadFixture() {
  const state: any = { logMessages: { Output: [], Input: [] }, memory: {} };
  const storyCards: any[] = [];
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const console2 = { log: noop, error: noop };
  // Minimal working Story Card API (mirrors offlineSimulationService's shape).
  const addStoryCard = (keys: string, entry: string, type = 'Custom', name = keys, notes = '') => {
    storyCards.push({ id: String(storyCards.length + 1), keys, entry, type, title: name, description: notes });
    return storyCards.length;
  };
  const updateStoryCard = (index: number, keys: string, entry: string, type?: string) => {
    const card = storyCards[index];
    if (!card) throw new Error('Story card at index ' + index + ' does not exist');
    card.keys = keys; card.entry = entry;
    if (type !== undefined) card.type = type;
  };
  const removeStoryCard = (index: number) => { storyCards.splice(index, 1); };

  const factory = new Function(
    'worldState', 'input', 'text', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `${src}\n; return {
       getRpgConfig, rpgCreationGate, createCharacter, RPG_CONFIG_CARD_KEYS,
       RPG_CONFIG_GATE_ENABLED,
       CommunityUtils, performStatCheck, playerFood, handlePlayerDeath,
       isPermadeath, isSurvivalOn, rpgStartingLocation, finalizeCharacter,
       createPlayerState, getEffectiveStat
     };`,
  );
  const api = factory(
    state, '', '', state, console2, [],
    info, storyCards, state.memory, noop, noop, addStoryCard, updateStoryCard,
    removeStoryCard, noop, noop, noop,
  );
  return { state, storyCards, api };
}

describe('RPG config card defaults', () => {
  it('creates the "RPG Config" card and reads coerced defaults on first access', () => {
    const { storyCards, api } = loadFixture();
    expect(storyCards.length).toBe(0);
    const cfg = api.getRpgConfig();

    const card = storyCards.find(c => c.keys === api.RPG_CONFIG_CARD_KEYS);
    expect(card).toBeTruthy();                 // card was created
    expect(cfg.enabled).toBe(false);           // boolean-coerced, gate closed
    expect(cfg.gameMode).toBe('open-world');
    expect(cfg.difficulty).toBe('medium');
    expect(cfg.permadeath).toBe(false);
    expect(cfg.survival).toBe(true);           // boolean-coerced
  });

  it('parses config onto state.rpgConfig', () => {
    const { state, api } = loadFixture();
    api.getRpgConfig();
    expect(state.rpgConfig.gameMode).toBe('open-world');
  });
});

describe('collapsed-entry tolerance (settings on one line)', () => {
  // A story card editor can strip the newlines, leaving every `> Name: value`
  // run together. A line-anchored regex misses all of them and silently returns
  // defaults, so "Enabled: true" appears not to take. This is that exact entry.
  const COLLAPSED =
    'RPG world configuration. Edit the values, set "Enabled: true", then type /new player.' +
    '> Enabled: true> Game Mode: open-world> Difficulty: medium> Permadeath: false' +
    '> Survival: falseGame Mode: open-world | rogue-like   Difficulty: easy | medium | hard';

  const seedCollapsed = (storyCards: any[]) => {
    storyCards.push({
      id: '1', keys: 'RPG Config', title: 'RPG Config', type: 'Custom',
      description: '', entry: COLLAPSED,
    });
  };

  it('still reads Enabled: true from a collapsed entry', () => {
    const { storyCards, api } = loadFixture();
    seedCollapsed(storyCards);
    const cfg = api.getRpgConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.gameMode).toBe('open-world');
    expect(cfg.difficulty).toBe('medium');
    expect(cfg.permadeath).toBe(false);
    // Trailing prose glued onto the last value must still coerce.
    expect(cfg.survival).toBe(false);
  });

  it('unblocks character creation from a collapsed entry', () => {
    const { state, storyCards, api } = loadFixture();
    seedCollapsed(storyCards);
    expect(api.rpgCreationGate().allowed).toBe(true);
    expect(api.createCharacter()).toBe(true);
    expect(state.tempCharacter).toBeTruthy();
  });

  it('self-heals the card back to one setting per line', () => {
    const { storyCards, api } = loadFixture();
    seedCollapsed(storyCards);
    api.getRpgConfig();

    const card = storyCards.find(c => c.keys === 'RPG Config');
    expect(card.entry).toMatch(/^> Enabled: true$/m);
    expect(card.entry).toMatch(/^> Game Mode: open-world$/m);
    expect(card.entry).toMatch(/^> Survival: false$/m);
    // Repaired card is readable by the line-anchored CommunityUtils reader too.
    expect(api.CommunityUtils.StoryCards.readSettings(card, 'Enabled', false)).toBe(true);
  });
});

describe('settings actually change the game', () => {
  // Seed a config card with the given overrides already applied.
  const seed = (storyCards: any[], overrides: Record<string, string | boolean> = {}) => {
    const values: Record<string, any> = {
      Enabled: true, 'Game Mode': 'open-world', Difficulty: 'medium',
      Permadeath: false, Survival: true, ...overrides,
    };
    storyCards.push({
      id: '1', keys: 'RPG Config', title: 'RPG Config', type: 'Custom', description: '',
      entry: Object.entries(values).map(([k, v]) => `> ${k}: ${v}`).join('\n'),
    });
  };

  const withPlayer = (state: any, api: any) => {
    state.PS = api.createPlayerState();
    state.PS.Name = 'Rev';
    state.MS = { activeMonsters: [], deadMonsters: [] };
  };

  it('Difficulty shifts every stat-check DC (easy is easier than hard)', () => {
    const dcFor = (level: string) => {
      const { state, storyCards, api } = loadFixture();
      seed(storyCards, { Difficulty: level });
      withPlayer(state, api);
      api.performStatCheck('strength', 'medium');
      const line = state.logMessages['Output'].find((l: string) => l.includes('Attempting a'));
      return Number(line.match(/DC (\d+)/)[1]);
    };
    expect(dcFor('easy')).toBe(12);    // medium 15 - 3
    expect(dcFor('medium')).toBe(15);
    expect(dcFor('hard')).toBe(18);    // medium 15 + 3
  });

  it('performStatCheck no longer throws when the caller omits a difficulty', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards);
    withPlayer(state, api);
    expect(() => api.performStatCheck('strength', null)).not.toThrow();
  });

  it('Survival: false skips the hunger/thirst tick entirely', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards, { Survival: false });
    withPlayer(state, api);
    const hunger = state.PS.hunger, thirst = state.PS.thirst;
    api.playerFood();
    expect(state.PS.hunger).toBe(hunger);   // untouched
    expect(state.PS.thirst).toBe(thirst);
  });

  it('Survival: true drains hunger and thirst', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards, { Survival: true });
    withPlayer(state, api);
    const hunger = state.PS.hunger, thirst = state.PS.thirst;
    api.playerFood();
    expect(state.PS.hunger).toBeLessThan(hunger);
    expect(state.PS.thirst).toBeLessThan(thirst);
  });

  it('Permadeath: false revives the player at the safe haven', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards, { Permadeath: false });
    withPlayer(state, api);
    state.PS.health = 0;
    api.handlePlayerDeath('battle');
    expect(state.PS.dead).toBeUndefined();
    expect(state.PS.health).toBeGreaterThan(0);
    expect(state.PS.location).toBe('safe haven');
  });

  it('Permadeath: true ends the run', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards, { Permadeath: true });
    withPlayer(state, api);
    state.PS.health = 0;
    api.handlePlayerDeath('battle');
    expect(state.PS.dead).toBe(true);
    expect(state.PS.health).toBe(0);
    expect(state.logMessages['Output'].join('\n')).toMatch(/fallen for good/i);
  });

  it('rogue-like forces permadeath even when Permadeath is false', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards, { 'Game Mode': 'rogue-like', Permadeath: false });
    withPlayer(state, api);
    expect(api.isPermadeath()).toBe(true);
    state.PS.health = 0;
    api.handlePlayerDeath('battle');
    expect(state.PS.dead).toBe(true);
  });

  it('Game Mode sets where a new character starts', () => {
    const open = loadFixture();
    seed(open.storyCards, { 'Game Mode': 'open-world' });
    expect(open.api.rpgStartingLocation().location).toBe('safe haven');

    const rogue = loadFixture();
    seed(rogue.storyCards, { 'Game Mode': 'rogue-like' });
    expect(rogue.api.rpgStartingLocation().location).toBe('dungeon');
  });

  it('finalizeCharacter drops a rogue-like character into the dungeon', () => {
    const { state, storyCards, api } = loadFixture();
    seed(storyCards, { 'Game Mode': 'rogue-like' });
    api.createCharacter();
    Object.assign(state.tempCharacter, { Name: 'Rev', Race: 'orc', Gender: 'male', Class: 'knight' });
    api.finalizeCharacter();
    expect(state.PS.location).toBe('dungeon');
    expect(state.PS.playerloc).toBe('dungeon entrance');
  });
});

describe('new-player gate', () => {
  // RPG_CONFIG_GATE_ENABLED is the master kill-switch. It is currently OFF, so
  // the card configures the world but never blocks character creation.
  it('is switched off, so creation is allowed even with Enabled: false', () => {
    const { state, api } = loadFixture();
    expect(api.RPG_CONFIG_GATE_ENABLED).toBe(false);

    const cfg = api.getRpgConfig();
    expect(cfg.enabled).toBe(false);          // card still says disabled...
    expect(api.rpgCreationGate().allowed).toBe(true);   // ...but the gate is off

    expect(api.createCharacter()).toBe(true);
    expect(state.tempCharacter).toBeTruthy();
  });

  it('allows creation once the card sets Enabled: true', () => {
    const { state, api } = loadFixture();
    const cfg = api.getRpgConfig();
    api.CommunityUtils.StoryCards.setSettings(cfg.card, 'Enabled', true);

    expect(api.rpgCreationGate().allowed).toBe(true);
    expect(api.getRpgConfig().enabled).toBe(true);

    const started = api.createCharacter();
    expect(started).toBe(true);
    expect(state.tempCharacter).toBeTruthy();
  });

  it('reads back an edited Game Mode', () => {
    const { api } = loadFixture();
    const cfg = api.getRpgConfig();
    api.CommunityUtils.StoryCards.setSettings(cfg.card, 'Game Mode', 'rogue-like');
    expect(api.getRpgConfig().gameMode).toBe('rogue-like');
  });
});
