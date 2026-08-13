import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Coverage for the reworked getPlayerDamage (data-driven buckets, positives
// only), the status-effect system, and the Element creator step. Evaluated
// SLOPPY (Function constructor) with the pipeline wrapper's globals.

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

function loadFixture() {
  const state: any = { logMessages: { Output: [], Input: [] }, memory: {} };
  const storyCards: any[] = [];
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const console2 = { log: noop, error: noop, warn: noop };
  const addStoryCard = (keys: string, entry: string, type = 'Custom', name = keys, notes = '') => {
    storyCards.push({ id: String(storyCards.length + 1), keys, entry, type, title: name, description: notes });
    return storyCards.length;
  };
  const updateStoryCard = (index: number, keys: string, entry: string, type?: string) => {
    const card = storyCards[index];
    if (!card) throw new Error('missing card');
    card.keys = keys; card.entry = entry;
    if (type !== undefined) card.type = type;
  };

  const factory = new Function(
    'worldState', 'input', 'text', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `${src}\n; return {
       getPlayerDamage, sumPositiveStats, applyVulnerability, DAMAGE_STATS,
       CLASS_DAMAGE_PROFILE, DAMAGE_MITIGATION,
       STATUS_EFFECTS, statusKeyForDamageType, rollStatusEffect, tickStatusEffects,
       damageMonster, ELEMENT_AFFINITIES, applyElementBonus, elementChanceBonus,
       createPlayerState, characterOptions, optionDescriptions, characterQuestions
     };`,
  );
  const api = factory(
    state, '', '', state, console2, [],
    info, storyCards, state.memory, noop, noop, addStoryCard, updateStoryCard,
    noop, noop, noop, noop,
  );
  return { state, storyCards, api };
}

// A player with a clean slate: no equipment, no attribute-derived damage.
function bareCombatant(state: any, api: any, cls: string) {
  state.PS = api.createPlayerState();
  state.PS.Name = 'Hero';
  state.PS.Class = cls;
  state.PS.equipped = {};
  state.PS.strength = 0;
  state.PS.dexterity = 0;
  state.PS.intelligence = 0;
  state.PS['crit chance'] = 0;   // deterministic
  state.MS = { activeMonsters: [], deadMonsters: [], lastTarget: null };
}

const monster = (over: any = {}) => ({
  name: 'Goblin', health: 500, maxHealth: 500, count: 1, distance: 'melee',
  state: 'Idle', isDead: false, attackDelay: 5,
  enemyDefenses: { armor: 0, magicRes: 0, vulnerability: 0 }, ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('sumPositiveStats', () => {
  it('counts only real numbers above zero', () => {
    const { api } = loadFixture();
    const stats = { a: 10, b: -5, c: 0, d: NaN, e: undefined, f: '7', g: 3 };
    // -5, 0, NaN and undefined all contribute nothing; '7' coerces.
    expect(api.sumPositiveStats(stats, ['a', 'b', 'c', 'd', 'e', 'g'])).toBe(13);
    expect(api.sumPositiveStats(stats, ['b', 'c', 'd'])).toBe(0);
    expect(api.sumPositiveStats(stats, ['f'])).toBe(7);
  });
});

describe('getPlayerDamage — positives only', () => {
  it('a negative damage stat contributes 0 instead of subtracting', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'knight');
    state.PS['physical damage'] = 20;
    state.PS['bleed damage'] = -50;          // a curse; must not subtract
    expect(api.getPlayerDamage({ armor: 0, magicRes: 0, vulnerability: 0 })).toBe(20);
  });

  it('ignores NaN stats', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'knight');
    state.PS['physical damage'] = 25;
    state.PS['bleed damage'] = NaN;
    expect(api.getPlayerDamage({ armor: 0, magicRes: 0, vulnerability: 0 })).toBe(25);
  });
});

describe('getPlayerDamage — class profiles match the old switch', () => {
  const defenses = { armor: 400, magicRes: 50, vulnerability: 0 };

  // Old behavior: physical classes -> physical*armorMit + base;
  // casters -> magic*magicMit + base; unknown -> both + base.
  const setup = (cls: string) => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, cls);
    state.PS['physical damage'] = 100;
    state.PS['spell damage'] = 100;
    state.PS['base damage'] = 10;
    return api.getPlayerDamage(defenses);
  };

  it('physical classes use the physical bucket only', () => {
    for (const cls of ['knight', 'barbarian', 'rogue', 'revanant']) {
      expect(setup(cls), cls).toBe(60);   // 100*0.5 + 10
    }
  });

  it('caster classes use the magic bucket only', () => {
    for (const cls of ['wizard', 'druid', 'cleric', 'battlemage']) {
      expect(setup(cls), cls).toBe(60);   // 100*0.5 + 10
    }
  });

  it('an unknown class uses both buckets', () => {
    expect(setup('tourist')).toBe(110);   // 100*0.5 + 100*0.5 + 10
  });
});

describe('getPlayerDamage — regression against the previous implementation', () => {
  // The old formula, transcribed verbatim, with crit removed (crit chance is 0).
  const legacy = (eff: any, cls: string, d: any) => {
    const raw = {
      base: (eff['base damage'] || 0),
      physical: (eff['physical damage'] || 0) + (eff['bleed damage'] || 0),
      magic: (eff['spell damage'] || 0) + (eff['fire damage'] || 0) + (eff['frost damage'] || 0)
        + (eff['lightning damage'] || 0) + (eff['nature damage'] || 0) + (eff['chaos damage'] || 0),
    };
    const armorMit = 1 - (d.armor / (d.armor + 400));
    const magicMit = 1 - (Math.min(95, d.magicRes || 0) / 100);
    let total;
    if (['knight', 'barbarian', 'rogue', 'revanant'].includes(cls)) total = raw.physical * armorMit + raw.base;
    else if (['cleric', 'wizard', 'druid', 'battlemage'].includes(cls)) total = raw.magic * magicMit + raw.base;
    else total = raw.physical * armorMit + raw.magic * magicMit + raw.base;
    if (d.vulnerability) total *= (1 + d.vulnerability);
    return Math.max(0, Math.round(total));
  };

  it('produces identical numbers for non-negative stats', () => {
    const cases = [
      { stats: { 'physical damage': 30, 'bleed damage': 12, 'base damage': 5 }, d: { armor: 200, magicRes: 0, vulnerability: 0 } },
      { stats: { 'spell damage': 40, 'fire damage': 15 }, d: { armor: 0, magicRes: 30, vulnerability: 0.2 } },
      { stats: { 'physical damage': 7, 'spell damage': 9, 'base damage': 3 }, d: { armor: 800, magicRes: 95, vulnerability: 0.5 } },
      { stats: { 'chaos damage': 21, 'nature damage': 6 }, d: { armor: 50, magicRes: 10, vulnerability: 0 } },
    ];
    for (const cls of ['knight', 'wizard', 'cleric', 'revanant', 'tourist']) {
      for (const { stats, d } of cases) {
        const { state, api } = loadFixture();
        bareCombatant(state, api, cls);
        Object.assign(state.PS, stats);
        const eff = { ...state.PS };
        expect(api.getPlayerDamage(d), `${cls} ${JSON.stringify(stats)}`).toBe(legacy(eff, cls, d));
      }
    }
  });
});

describe('status effects', () => {
  it('maps damage types (and aliases) to effects', () => {
    const { api } = loadFixture();
    expect(api.statusKeyForDamageType('fire')).toBe('burn');
    expect(api.statusKeyForDamageType('poison')).toBe('poison');
    expect(api.statusKeyForDamageType('bleed')).toBe('bleed');
    expect(api.statusKeyForDamageType('ice')).toBe('chill');       // alias
    expect(api.statusKeyForDamageType('frost')).toBe('chill');
    expect(api.statusKeyForDamageType('lightning')).toBe('shock');
    expect(api.statusKeyForDamageType('holy')).toBeNull();          // no DoT
  });

  it('applies a DoT scaled off the hit that inflicted it', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    const m = monster();
    vi.spyOn(Math, 'random').mockReturnValue(0);   // always proc

    api.rollStatusEffect(m, 'fire', 100);
    expect(m.statusEffects).toHaveLength(1);
    expect(m.statusEffects[0]).toMatchObject({ key: 'burn', turns: 3, tickDamage: 10 }); // 10%
  });

  it('does not proc when the roll fails', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    const m = monster();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(api.rollStatusEffect(m, 'fire', 100)).toBeNull();
    expect(m.statusEffects ?? []).toHaveLength(0);
  });

  it('refreshes duration instead of stacking', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    const m = monster();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    api.rollStatusEffect(m, 'fire', 100);
    m.statusEffects[0].turns = 1;
    api.rollStatusEffect(m, 'fire', 100);
    expect(m.statusEffects).toHaveLength(1);
    expect(m.statusEffects[0].turns).toBe(3);
  });

  it('chill slows the target and the slow is removed on expiry', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    const m = monster({ attackDelay: 5 });
    state.MS.activeMonsters = [m];
    vi.spyOn(Math, 'random').mockReturnValue(0);

    api.rollStatusEffect(m, 'frost', 50);
    expect(m.attackDelay).toBe(7);                 // +2 slow

    for (let i = 0; i < 3; i++) api.tickStatusEffects();
    expect(m.statusEffects).toHaveLength(0);
    expect(m.attackDelay).toBe(5);                 // restored
  });

  it('ticks damage each turn, then expires', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    const m = monster({ health: 500 });
    state.MS.activeMonsters = [m];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    api.rollStatusEffect(m, 'fire', 100);          // burn, 3 turns, 10/turn
    vi.restoreAllMocks();

    api.tickStatusEffects();
    expect(m.health).toBe(490);
    api.tickStatusEffects();
    expect(m.health).toBe(480);
    api.tickStatusEffects();
    expect(m.health).toBe(470);
    expect(m.statusEffects).toHaveLength(0);       // expired after 3

    api.tickStatusEffects();
    expect(m.health).toBe(470);                    // no further ticks
  });

  it('a DoT kill routes through the death path', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    const m = monster({ health: 5 });
    state.MS.activeMonsters = [m];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    api.rollStatusEffect(m, 'fire', 100);          // 10 tick vs 5 hp
    vi.restoreAllMocks();

    api.tickStatusEffects();
    expect(m.health).toBe(0);
    expect(m.isDead).toBe(true);
    expect(state.MS.activeMonsters).not.toContain(m);
  });
});

describe('Element', () => {
  it('is the last creator question and offers all seven', () => {
    const { api } = loadFixture();
    expect(Object.keys(api.characterQuestions).at(-1)).toBe('Element');
    expect(api.characterOptions.Element).toEqual(
      ['fire', 'frost', 'lightning', 'nature', 'chaos', 'void', 'holy']);
    for (const el of api.characterOptions.Element) {
      expect(api.optionDescriptions.Element[el], el).toBeTruthy();
    }
  });

  it('grants its damage bonus at creation', () => {
    const { api } = loadFixture();
    const c = api.createPlayerState();
    api.applyElementBonus(c, 'fire');
    expect(c['fire damage']).toBe(10);

    const v = api.createPlayerState();
    api.applyElementBonus(v, 'void');
    expect(v['void damage']).toBe(12);
  });

  it('raises the matching status chance only', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    state.PS.Element = 'fire';
    expect(api.elementChanceBonus('burn')).toBe(0.10);
    expect(api.elementChanceBonus('chill')).toBe(0);
  });

  it('void and holy nudge every status chance', () => {
    const { state, api } = loadFixture();
    bareCombatant(state, api, 'wizard');
    state.PS.Element = 'void';
    expect(api.elementChanceBonus('burn')).toBe(0.05);
    expect(api.elementChanceBonus('shock')).toBe(0.05);
  });

  it('void and holy damage reach the magic bucket', () => {
    const { state, api } = loadFixture();
    expect(api.DAMAGE_STATS.magic).toContain('void damage');
    expect(api.DAMAGE_STATS.magic).toContain('holy damage');

    bareCombatant(state, api, 'wizard');
    state.PS['void damage'] = 30;
    state.PS['holy damage'] = 10;
    expect(api.getPlayerDamage({ armor: 0, magicRes: 0, vulnerability: 0 })).toBe(40);
  });
});
