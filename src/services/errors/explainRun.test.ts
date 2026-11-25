import { describe, expect, it } from 'vitest';
import { runScriptAsHook } from '../blocks/runBlocks';
import { installNodeWorker } from '@/test/nodeWorker';

// End to end: the real worker snapshots the values at the moment something is
// undefined, and the explanation says why — not just where.

installNodeWorker();

describe('undefined, explained (real worker)', () => {
  it('a crash on state.player.hp names the missing link and where it would be set', async () => {
    const library = 'function setupPlayer() {\n  state.player = { hp: 10 };\n}';
    const hook = [
      'const modifier = (text) => {',
      '  state.player.hp -= 1;',
      '  return { text };',
      '};',
      'modifier(text);',
    ].join('\n');
    const r = await runScriptAsHook({ name: 'Input Modifier', code: hook }, library, 'x', { gold: 3 });
    const why = r.error?.triangulation;
    expect(why?.target).toBe('state.player');
    expect(why?.steps.map(s => s.status)).toEqual(['ok', 'missing']);
    expect(why?.whereSet[0]).toMatchObject({ script: 'Library', line: 2 });
    expect(why?.whereSet[0].why).toMatch(/setupPlayer/);
    expect(r.error).not.toHaveProperty('snapshot');
  });

  it('writing to a missing object is traced too', async () => {
    const hook = 'const modifier = (text) => {\n  state.player.hp = 5;\n  return { text };\n};\nmodifier(text);';
    const r = await runScriptAsHook({ name: 'Input Modifier', code: hook }, '', 'x', {});
    expect(r.error?.message).toMatch(/setting 'hp'/);
    expect(r.error?.triangulation?.target).toBe('state.player');
    expect(r.error?.triangulation?.suggestion).toBe('state.player = state.player || {};');
  });

  it('a log that prints undefined is explained in the run result', async () => {
    const hook = [
      'const modifier = (text) => {',
      '  const quest = state.quests.find(q => q.active);',
      '  log(quest);',
      '  return { text };',
      '};',
      'modifier(text);',
    ].join('\n');
    const r = await runScriptAsHook({ name: 'Input Modifier', code: hook }, '', 'x', { quests: [{ active: false }] });
    expect(r.error).toBeNull();
    expect(r.logs.join('\n')).toMatch(/\[undefined at Input Modifier line 3/);
    const why = r.undefinedNotes?.[0]?.explanations[0];
    expect(why?.target).toBe('quest');
    expect(why?.reason).toMatch(/find/);
  });
});
