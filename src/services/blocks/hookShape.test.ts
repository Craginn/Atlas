import { describe, expect, it } from 'vitest';
import { parseCode } from './parse';
import { generateCode } from './generate';

const normalize = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean).join('\n');

describe('AID hook shape', () => {
  const hook = [
    'const modifier = (text) => {',
    '  // react to swords',
    '  if (text.includes("sword")) {',
    '    state.hp = (state.hp ?? 10) - 1;',
    '  }',
    '  return { text };',
    '};',
    '',
    'modifier(text);',
  ].join('\n');

  it('opens `const modifier = (text) => {…}` as a function block with real child blocks', () => {
    const { roots } = parseCode(hook);
    expect(roots.map(r => r.kind)).toEqual(['function', 'expression']);
    expect(roots[0].fields).toMatchObject({ name: 'modifier', params: 'text', style: 'arrow', declKind: 'const' });
    expect(roots[0].slots.body.map(b => b.kind)).toEqual(['if', 'return']);
  });

  it('round-trips the hook, comments included', () => {
    const out = generateCode(parseCode(hook));
    expect(normalize(out)).toBe(normalize(hook));
  });

  it('round-trips function expressions and async arrows', () => {
    const src = 'const helper = function(a, b) {\n  return a + b;\n};\nlet go = async () => {\n  await x;\n};';
    expect(normalize(generateCode(parseCode(src)))).toBe(normalize(src));
  });

  it('keeps expression-bodied arrows verbatim (no block to open)', () => {
    const { roots } = parseCode('const add = (a, b) => a + b;');
    expect(roots[0].kind).toBe('var');
  });

  it('records the source lines of each block', () => {
    const { roots } = parseCode(hook);
    expect(roots[0].loc).toEqual({ start: 1, end: 7 });
    expect(roots[0].slots.body[0].loc).toEqual({ start: 3, end: 5 });
    expect(roots[1].loc).toEqual({ start: 9, end: 9 });
  });
});
