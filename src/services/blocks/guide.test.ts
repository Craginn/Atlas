import { describe, expect, it } from 'vitest';
import { parseCode } from './parse';
import { generateCode } from './generate';
import { ACTION_RECIPES, CONDITION_RECIPES, adviseScript, describeBlock, describeCondition } from './guide';
import { validateScriptSyntax } from '../offlineSimulationService';

describe('describe', () => {
  it('reads common conditions as words', () => {
    expect(describeCondition('text.toLowerCase().includes("sword")')).toBe('the text contains "sword"');
    expect(describeCondition('(state.hp ?? 0) <= 0')).toBe('saved value hp is at most 0');
    expect(describeCondition('info.actionCount <= 1 && !state.ready')).toBe("it's the first turn and saved value ready is not set yet");
    expect(describeCondition('Math.random() < 0.2')).toBe('a 20% chance');
    expect(describeCondition('weird(x)')).toBe('weird(x)');
  });

  it('describes the hook skeleton plainly', () => {
    const { roots } = parseCode('const modifier = (text) => {\n  state.gold += 5;\n  return { text };\n};\nmodifier(text);');
    expect(describeBlock(roots[0])).toMatch(/hook's main function/);
    expect(roots[0].slots.body.map(describeBlock)).toEqual(['Add 5 to saved value gold', 'Hand the text back to AI Dungeon']);
    expect(describeBlock(roots[1])).toMatch(/needs this last line/);
  });
});

describe('recipes', () => {
  it('build valid JavaScript from plain inputs', () => {
    for (const r of [...CONDITION_RECIPES, ...ACTION_RECIPES]) {
      const values = Object.fromEntries(r.inputs.map(i => [i.key, i.defaultValue ?? i.placeholder ?? 'x']));
      const code = r.build(values);
      const src = CONDITION_RECIPES.includes(r) ? `if (${code}) {}` : `${code};`;
      expect(validateScriptSyntax(src).errors, `${r.id}: ${code}`).toEqual([]);
    }
  });

  it('read back as the words they were built from', () => {
    const word = CONDITION_RECIPES.find(r => r.id === 'textIncludes')!.build({ word: 'Sword' });
    expect(describeCondition(word)).toBe('the text contains "sword"');
    const chance = CONDITION_RECIPES.find(r => r.id === 'chance')!.build({ percent: '35' });
    expect(describeCondition(chance)).toBe('a 35% chance');
  });
});

describe('adviseScript', () => {
  it('offers the hook template for an empty hook, and it produces a working hook', () => {
    const [first] = adviseScript([], 'Input Modifier');
    expect(first.id).toBe('template');
    const code = generateCode({ roots: first.add!.blocks() });
    expect(code).toBe('const modifier = (text) => {\n  return { text };\n};\n\nmodifier(text);');
  });

  it('spots a missing return, a missing call, and state used before it is set up', () => {
    const { roots } = parseCode('const modifier = (text) => {\n  if (state.player.hp < 1) { log("dead"); }\n};');
    const ids = adviseScript(roots, 'Input Modifier').map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['return', 'call', 'init-player']));
  });

  it('does not nag a complete hook, and knows state set up in the Library', () => {
    const { roots } = parseCode('const modifier = (text) => {\n  if (text.includes("x")) { state.player.hp -= 1; }\n  return { text };\n};\nmodifier(text);');
    expect(adviseScript(roots, 'Input Modifier', 'state.player = state.player || { hp: 10 };')).toEqual([]);
  });

  it('flags the Atlas-only `plot` object', () => {
    const { roots } = parseCode('log(plot.plotEssentials);');
    expect(adviseScript(roots, 'Library')[0].id).toBe('plot');
  });
});
