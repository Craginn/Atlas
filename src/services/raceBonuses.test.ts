import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Coverage for the 50/50 base stats + race Health/Mana bonuses added to the
// fixture's Library.js. The fixture relies on implicit globals and top-level
// statements that touch `state`, so we eval it SLOPPY (Function constructor)
// with the same globals the pipeline wrapper supplies, and return the internals.

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

function loadFixture() {
  const state: any = { logMessages: { Output: [], Input: [] }, storyCards: [], memory: {} };
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const console2 = { log: noop, error: noop };
  const factory = new Function(
    'worldState', 'input', 'text', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `${src}\n; return {
       createPlayerState, applyRaceBonuses, RACE_BONUSES, optionDescriptions
     };`,
  );
  const api = factory(
    state, '', '', state, console2, [],
    info, state.storyCards, state.memory, noop, noop, noop, noop,
    noop, noop, noop, noop,
  );
  return { state, api };
}

describe('base Health/Mana', () => {
  it('a freshly created character starts at 50/50', () => {
    const { api } = loadFixture();
    const c = api.createPlayerState();
    expect(c.health).toBe(50);
    expect(c.maxHealth).toBe(50);
    expect(c.mana).toBe(50);
    expect(c.maxMana).toBe(50);
  });
});

describe('applyRaceBonuses', () => {
  it('orc adds +25 Health to current and max, no mana', () => {
    const { api } = loadFixture();
    const c = api.createPlayerState();
    api.applyRaceBonuses(c, 'orc');
    expect(c.health).toBe(75);
    expect(c.maxHealth).toBe(75);
    expect(c.mana).toBe(50);
    expect(c.maxMana).toBe(50);
  });

  it('elf adds +5 Health and +20 Mana', () => {
    const { api } = loadFixture();
    const c = api.createPlayerState();
    api.applyRaceBonuses(c, 'elf');
    expect(c.health).toBe(55);
    expect(c.maxHealth).toBe(55);
    expect(c.mana).toBe(70);
    expect(c.maxMana).toBe(70);
  });

  it('is case-insensitive and leaves stats unchanged for an unknown race', () => {
    const { api } = loadFixture();
    const upper = api.createPlayerState();
    api.applyRaceBonuses(upper, 'DWARF');
    expect(upper.maxHealth).toBe(75);

    const unknown = api.createPlayerState();
    api.applyRaceBonuses(unknown, 'gremlin');
    expect(unknown.maxHealth).toBe(50);
    expect(unknown.maxMana).toBe(50);
  });
});

describe('race descriptions mirror the bonus map', () => {
  it('every race in RACE_BONUSES advertises its Health/Mana bonus', () => {
    const { api } = loadFixture();
    const descs = api.optionDescriptions.Race;
    for (const [race, bonus] of Object.entries<any>(api.RACE_BONUSES)) {
      if (race === 'default') continue;
      const text = descs[race];
      expect(text, `${race} has a description`).toBeTruthy();
      if (bonus.health) expect(text).toContain(`+${bonus.health} Health`);
      if (bonus.mana) expect(text).toContain(`+${bonus.mana} Mana`);
    }
  });
});
