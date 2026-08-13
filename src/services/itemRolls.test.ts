import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Coverage for rollRarity / applyStatRolls and the WorldLootPlayer fixes
// (shared-template mutation, category weight fallthrough).

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

function loadFixture() {
  const state: any = { logMessages: { Output: [], Input: [] }, memory: {} };
  const storyCards: any[] = [];
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const console2 = { log: noop, error: noop, warn: noop };

  const factory = new Function(
    'worldState', 'input', 'text', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `${src}\n; return {
       rollRarity, applyStatRolls, ITEM_RARITIES, WorldLoot, WorldLootPlayer,
       createPlayerState, NON_SCALING_MODIFIERS
     };`,
  );
  const api = factory(
    state, '', '', state, console2, [],
    info, storyCards, state.memory, noop, noop, noop, noop,
    noop, noop, noop, noop,
  );
  return { state, api };
}

afterEach(() => vi.restoreAllMocks());

describe('rollRarity', () => {
  it('always returns a valid rarity key', () => {
    const { api } = loadFixture();
    const keys = Object.keys(api.ITEM_RARITIES);
    for (let i = 0; i < 300; i++) {
      expect(keys).toContain(api.rollRarity({}, false));
    }
  });

  it('keeps high rarities rare for normal drops', () => {
    const { api } = loadFixture();
    const counts: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      const r = api.rollRarity({}, false);
      counts[r] = (counts[r] || 0) + 1;
    }
    // common+magic dominate; unique is the long tail.
    expect(counts.common + counts.magic).toBeGreaterThan(1500);
    expect(counts.unique || 0).toBeLessThan(counts.common);
  });

  it('bosses shift the odds away from common', () => {
    const { api } = loadFixture();
    const share = (isBoss: boolean) => {
      let common = 0;
      for (let i = 0; i < 3000; i++) if (api.rollRarity({}, isBoss) === 'common') common++;
      return common / 3000;
    };
    expect(share(true)).toBeLessThan(share(false));
  });
});

describe('applyStatRolls', () => {
  const template = () => ({
    name: 'Copper Shortsword', level: 'LL', type: 'weapon', slot: 'mainhand',
    modifiers: { strength: 3, damage: 6, range: 10, is2H: false },
  });

  it('returns a new object and never mutates the source', () => {
    const { api } = loadFixture();
    const source = template();
    const before = JSON.stringify(source);

    const rolled = api.applyStatRolls(source, 'rare', 10, 5);
    expect(rolled).not.toBe(source);
    expect(rolled.modifiers).not.toBe(source.modifiers);
    expect(JSON.stringify(source)).toBe(before);   // pristine
  });

  it('stamps the rarity and a stat tier', () => {
    const { api } = loadFixture();
    const rolled = api.applyStatRolls(template(), 'legendary', 20, 10);
    expect(rolled.rarity).toBe('legendary');
    expect(rolled.statTier).toBeGreaterThanOrEqual(1);
    expect(rolled.statTier).toBeLessThanOrEqual(5);
  });

  it('scales numeric stats but leaves structural keys alone', () => {
    const { api } = loadFixture();
    const rolled = api.applyStatRolls(template(), 'unique', 40, 100);
    expect(rolled.modifiers.range).toBe(10);      // non-scaling
    expect(rolled.modifiers.is2H).toBe(false);    // non-numeric, untouched
    expect(rolled.modifiers.strength).toBeGreaterThan(3);
    expect(rolled.modifiers.damage).toBeGreaterThan(6);
  });

  it('a higher rarity yields bigger stats than a lower one', () => {
    const { api } = loadFixture();
    // Pin the stat tier so only the rarity multiplier varies.
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const common = api.applyStatRolls(template(), 'common', 10, 0);
    const unique = api.applyStatRolls(template(), 'unique', 10, 0);
    expect(unique.modifiers.damage).toBeGreaterThan(common.modifiers.damage);
  });

  it('handles an item with no modifiers', () => {
    const { api } = loadFixture();
    const potion = { name: 'Health Potion', type: 'consumable', effect: { health: 25 } };
    const rolled = api.applyStatRolls(potion, 'common', 5, 0);
    expect(rolled.rarity).toBe('common');
    expect(rolled.name).toBe('Health Potion');
  });
});

describe('WorldLootPlayer', () => {
  const readyPlayer = (state: any, api: any) => {
    state.PS = api.createPlayerState();
    state.PS.Name = 'Hero';
    state.PS.level = 5;
    state.PS.luck = 5;
    state.lootCooldown = 0;
  };

  it('never corrupts the shared WorldLoot templates', () => {
    const { state, api } = loadFixture();
    readyPlayer(state, api);
    const before = JSON.stringify(api.WorldLoot);

    // Force the loot gate open every time; run enough drops to hit the
    // armor set-injection branch that used to mutate the template.
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    for (let i = 0; i < 200; i++) {
      state.lootCooldown = 0;
      api.WorldLootPlayer('', { isBoss: false });
    }
    expect(JSON.stringify(api.WorldLoot)).toBe(before);
  });

  it('drops a rarity-stamped item into the inventory', () => {
    const { state, api } = loadFixture();
    readyPlayer(state, api);
    vi.spyOn(Math, 'random').mockReturnValue(0.01);   // pass the 0.35 loot gate

    api.WorldLootPlayer('', { isBoss: false });
    expect(state.PS.inventory.length).toBeGreaterThan(0);
    expect(state.PS.inventory[0].rarity).toBeTruthy();
  });

  it('never selects a bogus category (the 95-weight fallthrough)', () => {
    const { state, api } = loadFixture();
    readyPlayer(state, api);
    // The old code rolled 0-99 against weights summing to 95; rolls of 95-99
    // left selectedCategory 'None' and threw on .filter.
    for (let i = 0; i < 400; i++) {
      state.lootCooldown = 0;
      expect(() => api.WorldLootPlayer('', { isBoss: false })).not.toThrow();
    }
  });
});
