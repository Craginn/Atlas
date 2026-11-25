import { describe, expect, it } from 'vitest';
import { runOfflineSimulation } from './offlineSimulationService';
import { installNodeWorker } from '@/test/nodeWorker';

// Runs the REAL worker so the stack-frame → script/line mapping is exercised end to end.
installNodeWorker();

/** Run a hook the way the pipeline does: Library + '\n' + hook. */
const run = (library: string, hook: string, name = 'Input Modifier') =>
  runOfflineSimulation(library ? `${library}\n${hook}` : hook, {}, 'hello', true, name, [], hook, 0);

describe('error locations', () => {
  it('points at the failing line and column in the hook', async () => {
    const hook = [
      'const modifier = (text) => {',
      '  const x = 1;',
      '  const hp = state.player.hp;',
      '  return { text };',
      '};',
      'modifier(text);',
    ].join('\n');
    const { error } = await run('', hook);
    expect(error).toMatchObject({ script: 'Input Modifier', line: '3', kind: 'runtime' });
    expect(error?.column).toBe(27); // the `hp` in `.hp` — where the engine points
    expect(error?.sourceLine).toBe('const hp = state.player.hp;');
  });

  it('blames the Library line that broke, and records the hook line that called it', async () => {
    const library = [
      '// helpers',
      'function giveItem(name) {',
      '  const inv = state.inventory;',
      '  inv.push(name);',
      '}',
    ].join('\n');
    const hook = [
      'const modifier = (text) => {',
      '  giveItem("sword");',
      '  return { text };',
      '};',
      'modifier(text);',
    ].join('\n');
    const { error } = await run(library, hook);
    expect(error).toMatchObject({ hook: 'Input Modifier', script: 'Library', line: '4', sourceLine: 'inv.push(name);' });
    expect(error?.calledFrom).toMatchObject({ script: 'Input Modifier', line: 2, sourceLine: 'giveItem("sword");' });
  });

  it('locates errors a script catches and console.errors, with a readable message', async () => {
    const library = 'function risky() {\n  return null.x;\n}';
    const hook = [
      'const modifier = (text) => {',
      '  try { risky(); } catch (e) { console.error(e); }',
      '  return { text };',
      '};',
      'modifier(text);',
    ].join('\n');
    const { error, caught, logs } = await run(library, hook);
    expect(error).toBeNull();
    expect(caught).toHaveLength(1);
    expect(caught[0]).toMatchObject({ script: 'Library', line: 2 });
    expect(caught[0].message).toMatch(/^TypeError: Cannot read properties of null/);
    expect(logs.some(l => String(l).includes('ERROR: {}'))).toBe(false);
  });

  it('reports syntax errors in the Library against the Library, with a column', async () => {
    const { error } = await run('function a() {\n  return 1 +;\n}', 'const modifier = (text) => ({ text });\nmodifier(text);');
    expect(error).toMatchObject({ script: 'Library', line: '2', kind: 'syntax' });
    expect(error?.column).toBeGreaterThan(0);
  });

  it('finds the clashing declaration when a name is declared in both scripts', async () => {
    const { error } = await run('const hp = 1;', 'const modifier = (text) => ({ text });\nconst hp = 2;\nmodifier(text);');
    expect(error?.message).toMatch(/already been declared/);
    expect(error).toMatchObject({ script: 'Input Modifier', line: '2' });
  });
});
