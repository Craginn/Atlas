import { describe, expect, it } from 'vitest';
import { runBlocks, runScriptAsHook } from './runBlocks';
import { parseCode } from './parse';
import { installNodeWorker } from '@/test/nodeWorker';

installNodeWorker();

describe('runScriptAsHook', () => {
  const library = 'function bonus(n) {\n  return n * 2;\n}';

  it('reports text in → out, state changes and the message, without saving anything', async () => {
    const hook = [
      'const modifier = (text) => {',
      '  state.gold = (state.gold ?? 0) + bonus(5);',
      '  state.message = "Rich!";',
      '  return { text: text + " (gold)" };',
      '};',
      'modifier(text);',
    ].join('\n');
    const world = { gold: 1 };
    const r = await runScriptAsHook({ name: 'Input Modifier', code: hook }, library, 'I search', world);
    expect(r.error).toBeNull();
    expect(r.textIn).toBe('I search');
    expect(r.textOut).toBe('I search (gold)');
    expect(r.message).toBe('Rich!');
    expect(r.stateChanges.map(d => [d.path, d.from, d.to])).toEqual([
      ['gold', 1, 11],
      ['message', undefined, 'Rich!'],
    ]);
    expect(world).toEqual({ gold: 1 }); // untouched
  });

  it('locates a failure in the hook', async () => {
    const hook = 'const modifier = (text) => {\n  state.player.hp -= 1;\n  return { text };\n};\nmodifier(text);';
    const r = await runScriptAsHook({ name: 'Input Modifier', code: hook }, library, 'x', {});
    expect(r.error).toMatchObject({ script: 'Input Modifier', line: '2' });
  });
});

describe('runBlocks', () => {
  it('runs a selection with the Library available', async () => {
    const { roots } = parseCode('log(bonus(21));');
    const r = await runBlocks(roots, '', {}, undefined, 'function bonus(n) { return n * 2; }');
    expect(r.error).toBeNull();
    expect(r.logs).toEqual(['42']);
  });

  it('no longer provides the Atlas-only `plot` object', async () => {
    const { roots } = parseCode('log(plot.plotEssentials);');
    const r = await runBlocks(roots, '', {});
    expect(r.error?.message).toMatch(/plot is not defined/);
  });
});
