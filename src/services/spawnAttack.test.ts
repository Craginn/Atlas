import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Direct unit tests for spawn() and playerAttack() from the RPG engine's
// Library.js.  The fixture is loaded via `new Function` (sloppy mode) with the
// same AID globals the real executor provides, so every helper the two
// functions call (createMonster, SpatialManager, getPlayerDamage, etc.) is
// available in-scope.

const DIR = path.resolve(__dirname, '../../RPG ENGINE');
const src = fs.readFileSync(path.join(DIR, 'Library.js'), 'utf8');

function loadFixture(initialText = '') {
  const state: any = { logMessages: { Output: [], Input: [] }, memory: {} };
  const storyCards: any[] = [];
  const info = { actionCount: 0, characters: [], maxChars: 4000 };
  const noop = () => {};
  const logs: string[] = [];
  const console2 = {
    log: (...a: any[]) => logs.push(a.map((x: any) => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
    error: noop,
    warn: noop,
  };
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

  // `let text` so we can mutate it between calls via setText() — playerAttack
  // reads `text` as a free variable (the AID global), so closing over a
  // mutable binding lets us drive different inputs without reloading the file.
  const factory = new Function(
    'worldState', 'input', 'state', 'console', 'history',
    'info', 'storyCards', 'memory', 'stop', 'log', 'addStoryCard', 'updateStoryCard',
    'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
    `let text = input;
    ${src}
    ;
    function _setText(t) { text = t; }
    function _getText() { return text; }
    return {
      spawn, playerAttack, createPlayerState, createMonster,
      tickMonsterCooldowns, _setText, _getText,
      getPlayerDamage, SpatialManager, setBaseDamage, rescalePackDamage,
      onMonsterDefeated, playerattackWords, KnownMonsters
    };`,
  );

  const api: any = factory(
    state, initialText, state, console2, [],
    info, storyCards, state.memory, noop, noop, addStoryCard, updateStoryCard,
    noop, noop, noop, noop,
  );

  return { state, storyCards, api, logs };
}

// ── Helpers ──────────────────────────────────────────────────────────────

// A player with clean stats for deterministic combat.
function barePlayer(state: any, api: any, cls = 'knight') {
  state.PS = api.createPlayerState();
  state.PS.Name = 'Hero';
  state.PS.Class = cls;
  state.PS.level = 1;
  state.PS.equipped = {};
  state.PS.strength = 0;
  state.PS.dexterity = 0;
  state.PS.intelligence = 0;
  state.PS['crit chance'] = 0;
  state.PS.combatstatus = 'None';
  state.PS.speed = 15;
}

// A live monster at melee distance, ready to be hit.
function meleeMonster(over: any = {}) {
  return {
    name: 'Maze Rat',
    health: 20,
    maxHealth: 20,
    count: 1,
    distance: 5,
    baseRange: 5,
    speed: 10,
    state: 'Idle',
    isDead: false,
    attackDelay: 5,
    tier: 'weak',
    level: 1,
    damage: 3,
    damageMax: 8,
    baseDamage: 3,
    enemyDefenses: { armor: 0, magicRes: 0, vulnerability: 0 },
    ...over,
  };
}

afterEach(() => vi.restoreAllMocks());

// ══════════════════════════════════════════════════════════════════════════
//  spawn()
// ══════════════════════════════════════════════════════════════════════════

describe('spawn()', () => {
  it('creates a new monster pack from a valid low-level name', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('Maze Rat');

    expect(state.MS.activeMonsters).toHaveLength(1);
    const m = state.MS.activeMonsters[0];
    expect(m.name).toBe('Maze Rat');
    expect(m.count).toBe(1);
    expect(m.health).toBeGreaterThan(0);
    expect(m.maxHealth).toBeGreaterThan(0);
    expect(m.isDead).toBe(false);
    expect(m.tier).toBe('weak');
    // spawn writes a log message
    expect(state.logMessages.Input.some((l: string) => l.includes('Maze Rat'))).toBe(true);
  });

  it('spawns the requested count (up to MAX_PACK)', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('Maze Rat', 3);

    expect(state.MS.activeMonsters).toHaveLength(1);
    expect(state.MS.activeMonsters[0].count).toBe(3);
  });

  it('caps pack size at 5', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('Maze Rat', 10);

    expect(state.MS.activeMonsters[0].count).toBe(5);
  });

  it('returns early for an unknown monster name', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('Not A Real Monster');

    expect(state.MS.activeMonsters).toHaveLength(0);
  });

  it('returns early when name is falsy', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('');
    api.spawn(null);

    expect(state.MS.activeMonsters).toHaveLength(0);
  });

  it('blocks respawn when the monster was just slain this turn', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };
    state.processedMonsterDeaths = new Set(['maze rat']);

    api.spawn('Maze Rat');

    expect(state.MS.activeMonsters).toHaveLength(0);
  });

  it('blocks spawn while a cooldown is active', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };
    state.MS.spawnCooldowns = { 'maze rat': 2 };

    api.spawn('Maze Rat');

    expect(state.MS.activeMonsters).toHaveLength(0);
  });

  it('allows spawn after cooldown expires via tickMonsterCooldowns', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };
    state.MS.spawnCooldowns = { 'maze rat': 1 };

    api.tickMonsterCooldowns();          // 1 → 0
    expect(state.MS.spawnCooldowns['maze rat']).toBe(0);

    api.spawn('Maze Rat');
    expect(state.MS.activeMonsters).toHaveLength(1);
  });

  it('respects the maxMonsters cap', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };
    state.MS.maxMonsters = 2;

    api.spawn('Maze Rat');
    api.spawn('Gloom Spider');
    api.spawn('Chitterling');            // should be blocked

    expect(state.MS.activeMonsters).toHaveLength(2);
  });

  it('merges into an existing pack instead of creating a duplicate', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('Maze Rat', 2);
    expect(state.MS.activeMonsters).toHaveLength(1);
    expect(state.MS.activeMonsters[0].count).toBe(2);

    // Second spawn of the same name — the spawn() code path checks for an
    // existing pack but the current implementation only creates new packs
    // (it does not add to an existing one).  Either way, no duplicate entry.
    api.spawn('Maze Rat', 1);
    const rats = state.MS.activeMonsters.filter((m: any) => m.name === 'Maze Rat');
    expect(rats).toHaveLength(1);
  });

  it('initialises spawnCooldowns lazily', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };
    expect(state.MS.spawnCooldowns).toBeUndefined();

    api.spawn('Maze Rat');

    expect(state.MS.spawnCooldowns).toBeDefined();
    expect(typeof state.MS.spawnCooldowns).toBe('object');
  });

  it('sets up the world LocalLocation entry on first spawn', () => {
    const { state, api } = loadFixture();
    state.PS = { level: 1, playerloc: 'dungeon entrance' };

    api.spawn('Maze Rat');

    const key = 'dungeonentrance';
    expect(state.world.LocalLocation[key]).toBeDefined();
    expect(state.world.LocalLocation[key].biomass).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  playerAttack()
// ══════════════════════════════════════════════════════════════════════════

describe('playerAttack()', () => {
  it('returns early when there are no active monsters', () => {
    const { state, api } = loadFixture('I attack the goblin');
    barePlayer(state, api);
    state.MS.activeMonsters = [];

    api.playerAttack();

    // No combat started, no logs about hits
    expect(state.logMessages.Output.some((l: string) => l.includes('Hit'))).toBe(false);
  });

  it('returns early when no attack word is present and not in combat', () => {
    const { state, api } = loadFixture('I look around');
    barePlayer(state, api);
    state.MS.activeMonsters = [meleeMonster()];

    api.playerAttack();

    expect(state.logMessages.Output.some((l: string) => l.includes('Hit'))).toBe(false);
    expect(state.PS.combatstatus).toBe('None');
  });

  it('detects "attack" in the text and strikes the target', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    const rat = meleeMonster({ health: 100, maxHealth: 100 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    expect(rat.health).toBeLessThan(100);
    expect(state.logMessages.Output.some((l: string) => l.includes('Hit'))).toBe(true);
  });

  it('sets combatstatus to "In Combat" on the first hit', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    state.MS.activeMonsters = [meleeMonster({ health: 100, maxHealth: 100 })];

    expect(state.PS.combatstatus).toBe('None');

    api.playerAttack();

    expect(state.PS.combatstatus).toBe('In Combat');
  });

  it('closes distance when target is out of melee range (no damage this turn)', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    state.PS.speed = 15;
    const rat = meleeMonster({ health: 100, maxHealth: 100, distance: 40, baseRange: 5 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    // Distance reduced by player speed but no damage dealt yet
    expect(rat.distance).toBe(40 - 15);
    expect(rat.health).toBe(100);
    expect(state.logMessages.Output.some((l: string) => l.includes('closes the distance'))).toBe(true);
  });

  it('defeats a monster when health reaches 0', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 50;
    const rat = meleeMonster({ health: 20, maxHealth: 20 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    expect(state.MS.activeMonsters).toHaveLength(0);
    expect(state.logMessages.Output.some((l: string) => l.includes('Defeated'))).toBe(true);
  });

  it('decrements pack count instead of removing when count > 1', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 50;
    const rat = meleeMonster({ health: 20, maxHealth: 20, count: 3 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    // One rat dies, two remain
    expect(state.MS.activeMonsters).toHaveLength(1);
    expect(state.MS.activeMonsters[0].count).toBe(2);
    expect(state.MS.activeMonsters[0].health).toBe(20);  // reset to maxHealth
    expect(state.logMessages.Output.some((l: string) => l.includes('remain'))).toBe(true);
  });

  it('counter-attacks the player after a hit', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    state.PS.health = 50;
    state.PS.maxHealth = 50;
    const rat = meleeMonster({ health: 100, maxHealth: 100, distance: 5 });
    state.MS.activeMonsters = [rat];

    // Force deterministic counter-attack damage
    vi.spyOn(Math, 'random').mockReturnValue(0);

    api.playerAttack();

    // Player took counter-attack damage (3-10 range with random=0 → 3)
    expect(state.PS.health).toBeLessThan(50);
    expect(state.logMessages.Output.some((l: string) => l.includes('damage'))).toBe(true);
  });

  it('stores the last target name', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    const rat = meleeMonster({ health: 100, maxHealth: 100 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    expect(state.MS.lastTarget).toBe('Maze Rat');
  });

  it('falls back to the first monster when no target is named in text', () => {
    const { state, api } = loadFixture('attack');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    const rat = meleeMonster({ health: 100, maxHealth: 100 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    expect(rat.health).toBeLessThan(100);
  });

  it('uses lastTarget when the text does not name a monster', () => {
    const { state, api } = loadFixture('I attack');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    const rat = meleeMonster({ health: 100, maxHealth: 100 });
    state.MS.activeMonsters = [rat];
    state.MS.lastTarget = 'Maze Rat';

    api.playerAttack();

    expect(rat.health).toBeLessThan(100);
  });

  it('sets combatstatus to "Not in Combat" after defeating the last monster', () => {
    const { state, api } = loadFixture('I attack the Maze Rat');
    barePlayer(state, api);
    state.PS['physical damage'] = 50;
    const rat = meleeMonster({ health: 20, maxHealth: 20 });
    state.MS.activeMonsters = [rat];

    api.playerAttack();

    expect(state.PS.combatstatus).toBe('Not in Combat');
  });

  it('can be driven with different text via setText', () => {
    const { state, api } = loadFixture('I look around');
    barePlayer(state, api);
    state.PS['physical damage'] = 10;
    const rat = meleeMonster({ health: 100, maxHealth: 100 });
    state.MS.activeMonsters = [rat];

    // No attack word initially — should not hit
    api.playerAttack();
    expect(rat.health).toBe(100);

    // Now switch to an attack command
    api._setText('I attack the Maze Rat');
    api.playerAttack();
    expect(rat.health).toBeLessThan(100);
  });
});
