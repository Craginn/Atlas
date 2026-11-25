import { describe, expect, it } from 'vitest';
import { parseCode } from './parse';
import { generateCode } from './generate';
import { ancestorIds, blockAtLine, rootOf } from './locate';

const src = [
  'const modifier = (text) => {',
  '  if (text.includes("a")) {',
  '    state.x.y = 1;',
  '  } else {',
  '    log("no");',
  '  }',
  '  return { text };',
  '};',
  'modifier(text);',
].join('\n');

describe('blockAtLine', () => {
  const { roots } = parseCode(src);
  const fn = roots[0];
  const ifBlock = fn.slots.body[0];

  it('finds the deepest block holding a line', () => {
    expect(blockAtLine(roots, src, 3)).toBe(ifBlock.slots.then[0].id);
    expect(blockAtLine(roots, src, 5)).toBe(ifBlock.slots.else[0].id);
    expect(blockAtLine(roots, src, 7)).toBe(fn.slots.body[1].id);
    expect(blockAtLine(roots, src, 9)).toBe(roots[1].id);
  });

  it('works against regenerated code after edits moved lines', () => {
    // Edit: a new first step pushes everything down in the generated code.
    const edited = { roots: [{ ...fn, slots: { body: [parseCode('log(1);').roots[0], ...fn.slots.body] } }, roots[1]] };
    const code = generateCode(edited);
    const line = code.split('\n').findIndex(l => l.includes('state.x.y')) + 1;
    expect(blockAtLine(edited.roots, code, line)).toBe(ifBlock.slots.then[0].id);
  });

  it('gives the trail and root for auto-expanding', () => {
    const leaf = ifBlock.slots.then[0].id;
    expect(ancestorIds(roots, leaf)).toEqual([fn.id, ifBlock.id, leaf]);
    expect(rootOf(roots, leaf)?.id).toBe(fn.id);
  });
});
