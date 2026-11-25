import { describe, expect, it } from 'vitest';
import { triangulate, type TriangulateInput } from './triangulate';

const hook = (body: string) => `const modifier = (text) => {\n${body}\n  return { text };\n};\nmodifier(text);`;

/** Line (1-based) and column of `needle` in `code`, for a failure at that spot. */
const at = (code: string, needle: string, offsetInNeedle = 0) => {
  const i = code.indexOf(needle) + offsetInNeedle;
  const before = code.slice(0, i).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
};

const run = (over: Partial<TriangulateInput> & Pick<TriangulateInput, 'scripts' | 'script'>) =>
  triangulate({ hook: 'Input Modifier', line: 1, ...over });

describe('triangulate — chains rooted at state', () => {
  it('finds which step is missing, lists what exists, and spots a capitalisation slip', () => {
    const code = hook('  const hp = state.Player.hp;');
    const t = run({
      scripts: [{ name: 'Input Modifier', code }], script: 'Input Modifier',
      ...at(code, 'hp;'), message: "Cannot read properties of undefined (reading 'hp')",
      snapshot: { state: { player: { hp: 3 }, turn: 2 } },
    })!;
    expect(t.target).toBe('state.Player');
    expect(t.steps.map(s => [s.expr, s.status])).toEqual([['state', 'ok'], ['state.Player', 'missing']]);
    expect(t.steps[1].detail).toBe('state has no "Player" — it has: player, turn');
    expect(t.reason).toMatch(/did you mean `state.player`\?/);
  });

  it('says nothing creates it, and suggests a list when it is used like one', () => {
    const code = hook('  state.inventory.push("sword");');
    const t = run({
      scripts: [{ name: 'Input Modifier', code }], script: 'Input Modifier',
      ...at(code, 'push'), message: "Cannot read properties of undefined (reading 'push')",
      snapshot: { state: {} },
    })!;
    expect(t.reason).toMatch(/Nothing in your scripts ever creates `state.inventory`/);
    expect(t.suggestion).toBe('state.inventory = state.inventory || [];');
  });

  it('explains it is only created by a later hook', () => {
    const input = hook('  log(state.gold.total);');
    const output = hook('  state.gold = { total: 0 };');
    const t = run({
      scripts: [{ name: 'Input Modifier', code: input }, { name: 'Output Modifier', code: output }],
      script: 'Input Modifier', ...at(input, 'total'),
      message: "Cannot read properties of undefined (reading 'total')", snapshot: { state: {} },
    })!;
    expect(t.whereSet).toHaveLength(1);
    expect(t.whereSet[0]).toMatchObject({ script: 'Output Modifier', sourceLine: 'state.gold = { total: 0 };' });
    expect(t.whereSet[0].why).toMatch(/runs after the Input Modifier/);
  });

  it('explains it is only created inside an if, or inside a function nobody calls', () => {
    const library = [
      'if (text.includes("start")) {',
      '  state.player = { hp: 10 };',
      '}',
      'function setup() {',
      '  state.quest = {};',
      '}',
    ].join('\n');
    const code = hook('  const a = state.player.hp;\n  const b = state.quest.step;');
    const base = { scripts: [{ name: 'Library', code: library }, { name: 'Input Modifier', code }], script: 'Input Modifier', snapshot: { state: {} } };
    const t1 = run({ ...base, ...at(code, 'hp;'), message: "Cannot read properties of undefined (reading 'hp')" })!;
    expect(t1.whereSet[0].why).toBe('it\'s only set inside `if (text.includes("start"))` — that condition hasn\'t been true yet');
    const t2 = run({ ...base, ...at(code, 'step'), message: "Cannot read properties of undefined (reading 'step')" })!;
    expect(t2.whereSet[0].why).toBe("it's set inside setup(), but nothing in your scripts calls setup()");
  });
});

describe('triangulate — locals', () => {
  it('follows a local back to the state value it came from', () => {
    const library = 'function giveItem(name) {\n  const bag = state.inventory;\n  bag.push(name);\n}';
    const t = run({
      scripts: [{ name: 'Library', code: library }], script: 'Library',
      ...at(library, 'push'), message: "Cannot read properties of undefined (reading 'push')",
      snapshot: { state: { gold: 5 } },
    })!;
    expect(t.target).toBe('bag');
    expect(t.steps[0]).toMatchObject({ expr: 'bag', status: 'from', detail: 'set on line 2 from `state.inventory`' });
    expect(t.steps.find(s => s.status === 'missing')?.expr).toBe('state.inventory');
    expect(t.reason).toMatch(/Nothing in your scripts ever creates `state.inventory`/);
  });

  it('explains a .find() that matched nothing, with how big the list was', () => {
    const code = hook('  const card = storyCards.find(c => c.title === "Dragon");\n  log(card.entry);');
    const t = run({
      scripts: [{ name: 'Input Modifier', code }], script: 'Input Modifier',
      ...at(code, 'entry'), message: "Cannot read properties of undefined (reading 'entry')",
      snapshot: { storyCards: [{ title: 'Goblin' }, { title: 'Cave' }] },
    })!;
    expect(t.reason).toBe('`card` comes from `storyCards.find(…)`, which gives undefined when nothing matches (`storyCards` is a list of 2 items).');
  });

  it('explains a function that never returns', () => {
    const code = 'function getPlayer() {\n  state.player;\n}\nconst p = getPlayer();\nlog(p.hp);';
    const t = run({ scripts: [{ name: 'Library', code }], script: 'Library', ...at(code, 'hp'), message: "Cannot read properties of undefined (reading 'hp')" })!;
    expect(t.reason).toMatch(/getPlayer\(\), which never returns a value/);
  });

  it('explains a parameter nobody passed', () => {
    const code = 'function heal(target) {\n  target.hp += 1;\n}\nheal();';
    const t = run({ scripts: [{ name: 'Library', code }], script: 'Library', ...at(code, 'hp'), message: "Cannot read properties of undefined (reading 'hp')" })!;
    expect(t.reason).toMatch(/parameter of heal\(\)/);
    expect(t.whereSet[0]).toMatchObject({ line: 4, why: 'calls heal() without a value for target' });
  });

  it('explains a variable declared without a value', () => {
    const code = 'let current;\nif (text) { current = { hp: 1 }; }\nlog(current.hp);';
    const t = run({ scripts: [{ name: 'Library', code }], script: 'Library', ...at(code, 'hp);'), message: "Cannot read properties of undefined (reading 'hp')" })!;
    expect(t.reason).toMatch(/declared on line 1 without a starting value/);
    expect(t.whereSet[0].why).toMatch(/only set inside `if \(text\)`/);
  });
});

describe('triangulate — logged undefined', () => {
  it('explains which log() argument was undefined and why', () => {
    const code = hook('  log("Gold:", state.gold);');
    const t = run({
      scripts: [{ name: 'Input Modifier', code }], script: 'Input Modifier',
      line: 2, argIndex: 1, snapshot: { state: { Gold: 4 } },
    })!;
    expect(t.target).toBe('state.gold');
    expect(t.reason).toMatch(/did you mean `state.Gold`/);
  });
});
