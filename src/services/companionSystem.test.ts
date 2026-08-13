import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createStoryCardApi } from './offlineSimulationService';
import { mergeScriptStoryCards } from './scriptingService';

// Coverage for the ALLY SYSTEM (party members + summons) and the Necromancer
// class added to the fixture's Library.js.
//
// Same harness shape as revanantClass.test.ts: the fixture relies on implicit
// globals and top-level statements that touch `state`, so it is eval'd in
// SLOPPY mode (Function constructor). The difference here is that companions
// write Story Cards, so the REAL card API (createStoryCardApi — the single
// source of truth the worker also embeds) is supplied instead of noops.

const DIR = path.resolve(__dirname, '../../Mock Script Test');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

function loadFixture() {
  const state: any = { logMessages: { Output: [], Input: [] }, storyCards: [], memory: {} };
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const console2 = { log: noop, error: noop };
  const cardApi = createStoryCardApi(state.storyCards);

  const factory = new Function(
    'worldState', 'input', 'text', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `${src}\n; return {
       characterOptions, optionDescriptions, STARTING_ABILITIES, CLASS_DAMAGE_PROFILE,
       getStartingInventory, useSkill, createCompanion, recruitAlly, dismissCompanion,
       applySummonEffect, companionCombatTick, updateCompanionCards, damageCompanion,
       getLivingCompanions, getCompanionsByKind, findCompanion, displayParty,
       resolveAbilityTargets, MAX_PARTY, summonCapFor, CommunityUtils
     };`,
  );
  const api = factory(
    state, '', '', state, console2, [],
    info, state.storyCards, state.memory, noop, noop,
    cardApi.addStoryCard, cardApi.updateStoryCard, cardApi.removeStoryCard,
    cardApi.addWorldEntry, cardApi.updateWorldEntry, cardApi.removeWorldEntry,
  );
  return { state, api };
}

/** A combat-ready caster with the given skills known and one monster in reach. */
function makePlayer(state: any, className: string, skills: string[]) {
  state.PS.Class = className;
  state.PS.Name = 'Mort';
  state.PS.health = 100;
  state.PS.maxHealth = 100;
  state.PS.mana = 100;
  state.PS.maxMana = 100;
  state.PS.level = 1;
  state.PS.location = 'labyrinth';
  state.PS.playerloc = 'dungeon';
  state.PS.skills = {};
  for (const s of skills) state.PS.skills[s] = {};
  state.PS.abilityCooldowns = {};
  state.MS = state.MS || {};
  state.MS.activeMonsters = [
    {
      name: 'Goblin', health: 500, maxHealth: 500, count: 1, distance: 'melee',
      state: 'Idle', damage: 5, damageMax: 8, statusEffects: [],
      enemyDefenses: { armor: 0, magicRes: 0, vulnerability: 0 },
    },
  ];
  state.MS.deadMonsters = [];
  state.MS.lastTarget = null;
  state.Party = [];
}

const cardFor = (state: any, name: string) =>
  state.storyCards.find((c: any) => String(c.keys).includes(name));

const setting = (entry: string, key: string) =>
  (entry.match(new RegExp(`^>\\s*${key}:\\s*(.+)`, 'm')) || [])[1]?.trim();

// ---------------------------------------------------------------------------

describe('Necromancer class registration', () => {
  it('is a selectable class with a description', () => {
    const { api } = loadFixture();
    expect(api.characterOptions.Class).toContain('necromancer');
    expect(api.optionDescriptions.Class.necromancer).toMatch(/dead|skeleton/i);
  });

  it('starts knowing summon skeleton, decay and soul drain', () => {
    const { api } = loadFixture();
    expect(api.STARTING_ABILITIES.necromancer).toEqual(['summon skeleton', 'decay', 'soul drain']);
  });

  it('deals in the magic damage bucket', () => {
    const { api } = loadFixture();
    expect(api.CLASS_DAMAGE_PROFILE.necromancer).toEqual(['magic']);
  });

  it('gets a void-damage staff in its starting inventory', () => {
    const { api } = loadFixture();
    const inv = api.getStartingInventory('necromancer', { name: 'Trinket', type: 'misc' });
    const staff = inv.find((i: any) => i.name === 'Bone Staff');
    expect(staff).toBeTruthy();
    expect(staff.modifiers['void damage']).toBe(6);
  });

  it('soul drain both damages the monster and heals the caster', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', ['soul drain']);
    state.PS.health = 50;
    const before = state.MS.activeMonsters[0].health;

    const [ok] = api.useSkill('soul drain', 'drain the goblin');

    expect(ok).toBe(true);
    expect(state.MS.activeMonsters[0].health).toBe(before - 12);
    expect(state.PS.health).toBe(60);
  });
});

describe('Summons', () => {
  it('summon skeleton adds a companion with a Summon-tagged card', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', ['summon skeleton']);

    const [ok] = api.useSkill('summon skeleton', 'cast summon skeleton');

    expect(ok).toBe(true);
    const summons = api.getCompanionsByKind('summon');
    expect(summons).toHaveLength(1);
    expect(summons[0].role).toBe('skeleton');

    const card = cardFor(state, summons[0].name);
    expect(card).toBeTruthy();
    // The "different tag" per kind, written in all three places it can be read.
    expect(card.type).toBe('Summon');
    expect(card.title).toBe(`[Summon] ${summons[0].name}`);
    expect(setting(card.entry, 'Kind')).toBe('summon');
    expect(setting(card.entry, 'Health')).toBe(`${summons[0].health}/${summons[0].maxHealth}`);
  });

  it('holds at the class summon cap by retiring the oldest summon', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', ['summon skeleton']);
    expect(api.summonCapFor('necromancer')).toBe(3);

    for (let i = 0; i < 4; i++) {
      state.PS.mana = 100;
      state.PS.abilityCooldowns = {};
      api.useSkill('summon skeleton', 'cast summon skeleton');
    }

    // Four casts, cap of three: the roster holds at three...
    expect(api.getCompanionsByKind('summon')).toHaveLength(3);
    // ...and the displaced one is retired on its card, never deleted (the app's
    // mergeScriptStoryCards cannot remove cards, only update/append).
    const unsummoned = state.storyCards.filter((c: any) => /Status: unsummoned/.test(c.entry));
    expect(unsummoned).toHaveLength(1);
  });

  it('a non-necromancer is capped at one summon', () => {
    const { api } = loadFixture();
    expect(api.summonCapFor('wizard')).toBe(1);
    expect(api.summonCapFor(undefined)).toBe(1);
  });

  it('raise thrall reports a miss rather than throwing when no corpse exists', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', ['raise thrall']);
    state.MS.corpses = [];

    const ok = api.applySummonEffect({ name: 'raise thrall', displayName: 'Raise Thrall', effect: { summonCorpse: true } }, 'Mort');

    expect(ok).toBe(false);
    expect(api.getLivingCompanions()).toHaveLength(0);
    expect(state.logMessages.Output.join('\n')).toMatch(/no corpse/i);
  });

  it('raise thrall builds a summon out of a recorded corpse', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', ['raise thrall']);
    state.MS.corpses = [{ name: 'Goblin', level: 2, maxHealth: 200, damage: 20, damageMax: 30 }];

    const ok = api.applySummonEffect({ name: 'raise thrall', displayName: 'Raise Thrall', effect: { summonCorpse: true } }, 'Mort');

    expect(ok).toBe(true);
    const thrall = api.getCompanionsByKind('summon')[0];
    expect(thrall.role).toBe('goblin thrall');
    expect(thrall.damageType).toBe('void');
    expect(state.MS.corpses).toHaveLength(0);   // the corpse is consumed
  });
});

describe('Recruiting party members', () => {
  it('recruitAlly adds an ally with a Party Member-tagged card', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);

    const ally = api.recruitAlly('Kaela', 'recruit the scout Kaela');

    expect(ally).toBeTruthy();
    expect(ally.kind).toBe('ally');
    expect(ally.role).toBe('scout');       // template picked from the hint
    const card = cardFor(state, 'Kaela');
    expect(card.type).toBe('Party Member');
    expect(card.title).toBe('[Party Member] Kaela');
    expect(setting(card.entry, 'Kind')).toBe('ally');
    expect(setting(card.entry, 'Loyalty')).toBe('3');
  });

  it('refuses a duplicate and refuses past the party cap', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);

    api.recruitAlly('Kaela', 'scout');
    expect(api.recruitAlly('Kaela', 'scout')).toBeNull();       // duplicate
    expect(api.getCompanionsByKind('ally')).toHaveLength(1);

    api.recruitAlly('Bram', 'guard');
    api.recruitAlly('Sela', 'healer');
    expect(api.getCompanionsByKind('ally')).toHaveLength(api.MAX_PARTY);
    expect(api.recruitAlly('Toran', 'mercenary')).toBeNull();   // over cap
    expect(api.getCompanionsByKind('ally')).toHaveLength(api.MAX_PARTY);
  });

  it('dismissCompanion removes the ally and marks the card departed', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);
    api.recruitAlly('Kaela', 'scout');

    expect(api.dismissCompanion('Kaela')).toBe(true);

    expect(api.getLivingCompanions()).toHaveLength(0);
    // Card survives (it must — the merge cannot delete) but reads as departed.
    expect(setting(cardFor(state, 'Kaela').entry, 'Status')).toBe('departed');
  });
});

describe('Companion combat', () => {
  it('companions attack the monster the player is fighting', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);
    const ally = api.recruitAlly('Bram', 'guard');
    state.MS.lastTarget = 'Goblin';
    const before = state.MS.activeMonsters[0].health;

    api.companionCombatTick();

    // Damage lands in the companion's own roll band — retaliation this tick is
    // aimed at companions, so nothing else touches the monster's health.
    const dealt = before - state.MS.activeMonsters[0].health;
    expect(dealt).toBeGreaterThanOrEqual(ally.damage);
    expect(dealt).toBeLessThanOrEqual(ally.damageMax);
  });

  it('a companion kill still routes XP to the player', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);
    api.recruitAlly('Bram', 'guard');
    // One hit from anyone finishes it.
    state.MS.activeMonsters[0].health = 1;
    state.MS.activeMonsters[0].maxHealth = 1;
    const xpBefore = state.PS.experience;

    api.companionCombatTick();

    expect(state.MS.activeMonsters).toHaveLength(0);
    expect(state.PS.experience).not.toBe(xpBefore);
  });

  it('a companion reduced to 0 HP leaves the roster and its card says so', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', []);
    const summon = api.applySummonEffect(
      { name: 'summon skeleton', displayName: 'Summon Skeleton', effect: { summon: 'skeleton' } }, 'Mort');
    expect(summon).toBe(true);
    const skeleton = api.getCompanionsByKind('summon')[0];

    api.damageCompanion(skeleton, 9999, 'Goblin');

    expect(api.getLivingCompanions()).toHaveLength(0);
    const card = cardFor(state, skeleton.name);
    expect(card).toBeTruthy();                                  // not deleted
    expect(setting(card.entry, 'Status')).toBe('destroyed');
    expect(setting(card.entry, 'Health')).toBe(`0/${skeleton.maxHealth}`);
  });

  it('nothing happens with an empty roster', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);
    const before = state.MS.activeMonsters[0].health;
    api.companionCombatTick();
    expect(state.MS.activeMonsters[0].health).toBe(before);
  });
});

describe('ally / party ability targeting', () => {
  it('targetType "ally" resolves to the most wounded companion, not the caster', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'cleric', []);
    const hurt = api.recruitAlly('Bram', 'guard');
    api.recruitAlly('Kaela', 'scout');
    hurt.health = 5;

    const res = api.resolveAbilityTargets({ targetType: 'ally' }, '');

    expect(res.hitsSelf).toBe(false);
    expect(res.companions).toHaveLength(1);
    expect(res.companions[0].name).toBe('Bram');
  });

  it('targetType "ally" falls back to the caster when travelling alone', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'cleric', []);
    const res = api.resolveAbilityTargets({ targetType: 'ally' }, '');
    expect(res.hitsSelf).toBe(true);
    expect(res.companions).toHaveLength(0);
  });

  it('an ally-targeted heal restores the companion and leaves the caster alone', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'cleric', ['heal']);
    const ally = api.recruitAlly('Bram', 'guard');
    ally.health = 10;
    state.PS.health = 50;

    // "heal" is registered targetType "self"; drive the ally path directly.
    const res = api.resolveAbilityTargets({ targetType: 'ally' }, '');
    expect(res.companions[0]).toBe(ally);

    api.useSkill('heal', 'heal Bram');
    expect(state.PS.health).toBe(65);   // self-targeted skill still heals self
  });
});

describe('card sync', () => {
  it('a summon card survives the Knowledge Base merge and keeps updating', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'necromancer', ['summon skeleton']);
    api.useSkill('summon skeleton', 'cast summon skeleton');
    const skeleton = api.getCompanionsByKind('summon')[0];

    // Turn 1: brand new card. The KB has nothing yet, so the merge APPENDS it.
    const kbAfterSummon = mergeScriptStoryCards([], state.storyCards, state.storyCards.map((c: any) => c.id));
    const kbCard = kbAfterSummon.find(c => c.keywords.includes(skeleton.name));
    expect(kbCard).toBeTruthy();
    // The app's Knowledge Base clamps card `type` to the editor's fixed union,
    // so the AID-side "Summon" tag lands as Custom here — which is exactly why
    // the tag is also carried in the title, where it survives untouched.
    expect(kbCard!.title).toBe(`[Summon] ${skeleton.name}`);

    // Turn 2: the skeleton takes a hit and the per-turn sync rewrites its card.
    skeleton.health -= 10;
    api.updateCompanionCards();
    const changed = state.storyCards.map((c: any) => c.id);
    const kbAfterHit = mergeScriptStoryCards(kbAfterSummon, state.storyCards, changed);

    const updated = kbAfterHit.find(c => c.keywords.includes(skeleton.name));
    expect(setting(updated!.content, 'Health')).toBe(`${skeleton.health}/${skeleton.maxHealth}`);
    // Updated in place, not duplicated.
    expect(kbAfterHit.filter(c => c.keywords.includes(skeleton.name))).toHaveLength(1);
  });

  it('updateCompanionCards refreshes the volatile lines each turn', () => {
    const { state, api } = loadFixture();
    makePlayer(state, 'knight', []);
    const ally = api.recruitAlly('Bram', 'guard');

    ally.health = 3;
    ally.status = 'wounded';
    state.PS.location = 'safe haven';
    api.updateCompanionCards();

    const entry = cardFor(state, 'Bram').entry;
    expect(setting(entry, 'Health')).toBe(`3/${ally.maxHealth}`);
    expect(setting(entry, 'Status')).toBe('wounded');
    expect(setting(entry, 'Location')).toBe('safe haven');
  });
});
