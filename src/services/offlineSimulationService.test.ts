import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateScriptSyntax, diagnoseSyntax, runOfflineSimulation, AID_GLOBALS } from './offlineSimulationService';

const engine = (file: string) => readFileSync(resolve(process.cwd(), 'RPG ENGINE', file), 'utf8');

const withoutLine = (code: string, lineNumber: number, closer: string) => {
  const lines = code.split('\n');
  lines[lineNumber - 1] = lines[lineNumber - 1].replace(closer, '');
  return lines.join('\n');
};

describe('diagnoseSyntax — pointing at the real problem', () => {
  it.each(['Library.js', 'Input.js', 'Context.js', 'Output.js'])('reports nothing for the intact %s', file => {
    expect(diagnoseSyntax(engine(file))).toBeNull();
  });

  it('blames the object left open when line 47 of Input.js loses its }', () => {
    const error = diagnoseSyntax(withoutLine(engine('Input.js'), 47, '}'));
    expect(error).toMatchObject({ type: 'MISSING_BRACKET', line: 46 });
    expect(error?.message).toContain('opened on line 29');
    expect(error?.message).toContain('after line 46');
  });

  it.each([
    [26, 25, 2],   // function closed by nothing, next code is a top-level let
    [63, 62, 58],  // if inside a function
    [65, 64, 55],  // function followed by more functions: the parser only fails at end of file
    [120, 119, 100], // nested block
  ])('removing the } on line %i of Input.js reports line %i, opened on %i', (removed, reported, opened) => {
    const error = diagnoseSyntax(withoutLine(engine('Input.js'), removed, '}'));
    expect(error).toMatchObject({ type: 'MISSING_BRACKET', line: reported });
    expect(error?.message).toContain(`opened on line ${opened}`);
  });

  it('is not misled by apostrophes in comments or brackets inside regex literals', () => {
    const code = [
      "// don't confuse the scan",
      'function a() {',
      '  const clean = text.replace(/\\[[^\\]]*\\]/g, " ");',
      '  return clean;',
      '',
      'function b() {',
      '  return 1;',
      '}',
    ].join('\n');
    expect(diagnoseSyntax(code)).toMatchObject({ type: 'MISSING_BRACKET', line: 4 });
  });

  it('names a stray closer on its own line', () => {
    const error = diagnoseSyntax('function a() {\n  return 1;\n}\n}\nconst b = 2;');
    expect(error).toMatchObject({ type: 'EXTRA_BRACKET', line: 4 });
  });

  it('points at a wrong-type closer as a missing bracket', () => {
    const error = diagnoseSyntax('call(function () {\n  run();\n);');
    expect(error).toMatchObject({ type: 'MISSING_BRACKET', line: 2 });
  });

  it('reports non-bracket errors at the parser\'s position, not as a bracket problem', () => {
    const error = diagnoseSyntax('const a = 1;\nconst b = ;\nconst c = 3;');
    expect(error).toMatchObject({ type: 'SYNTAX_ERROR', line: 2 });
  });

  it('reports an unterminated string on its own line', () => {
    const error = diagnoseSyntax('const a = 1;\nconst b = "oops;\nconst c = 3;');
    expect(error).toMatchObject({ type: 'SYNTAX_ERROR', line: 2 });
  });

  it('never runs the code it is diagnosing', () => {
    const marker = '__diagnoseSyntaxRan';
    diagnoseSyntax(`}); globalThis.${marker} = true; (function () {`);
    expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined();
  });

  it('produces exactly one error, so one missing brace cannot look like seven', () => {
    const res = validateScriptSyntax(withoutLine(engine('Input.js'), 47, '}'), true);
    expect(res.errors).toHaveLength(1);
  });
});

describe('runOfflineSimulation — rejecting code before it runs', () => {
  const library = 'function helper() {\n  return 1;\n}';
  const hook = 'const modifier = (text) => {\n  return { text };\n};\nmodifier(text);';

  it('reports a broken hook against the hook\'s own line numbers', async () => {
    const broken = 'function a() {\n  return 1;\n\nconst modifier = (text) => {\n  return { text };\n};\nmodifier(text);';
    const res = await runOfflineSimulation(`${library}\n${broken}`, {}, '', true, 'Input Modifier', [], broken, 3);
    expect(res.error).toMatchObject({ hook: 'Input Modifier', line: '2' });
    expect(res.logs[0]).toContain('Input Modifier, line 2: Missing }');
  });

  it('attributes a broken Library to the Library, not the hook', async () => {
    const broken = 'function helper() {\n  return 1;\n\nfunction other() {\n  return 2;\n}';
    const res = await runOfflineSimulation(`${broken}\n${hook}`, {}, '', true, 'Input Modifier', [], hook, 6);
    expect(res.error).toMatchObject({ hook: 'Library', line: '2' });
  });

  it('maps a name declared in both files onto the hook line', async () => {
    const lib = 'const shared = 1;';
    const clash = `const other = 2;\nconst shared = 3;\n${hook}`;
    const res = await runOfflineSimulation(`${lib}\n${clash}`, {}, '', true, 'Input Modifier', [], clash, 1);
    expect(res.error).toMatchObject({ hook: 'Input Modifier', line: '2' });
    expect(res.error?.message).toContain("'shared'");
  });
});

describe('validateScriptSyntax — AID API alignment', () => {
  it('accepts a script using only documented AID globals + helpers', () => {
    const code = `
      state.turn = (state.turn || 0) + 1;
      log('turn', state.turn, info.actionCount, memory, storyCards.length, history.length);
      const modifier = (t) => ({ text: t });
      modifier(text);
    `;
    const res = validateScriptSyntax(code, true);
    const undocumented = [...res.errors, ...res.warnings].filter(f => f.type === 'UNDOCUMENTED_API');
    expect(undocumented).toHaveLength(0);
  });

  it('flags a typo of a real AID global (stat instead of state)', () => {
    const code = `stat.turn = 1;\nreturn { text };`;
    const res = validateScriptSyntax(code, true);
    const flagged = [...res.errors, ...res.warnings].find(f => f.type === 'UNDOCUMENTED_API');
    expect(flagged).toBeTruthy();
    expect(flagged!.message).toContain('state');
  });

  it('does NOT flag the removed hallucinated rules (state.PS / .health / .activeMonsters)', () => {
    const code = `state.PS.health = 10;\nx.activeMonster = 1;\nreturn { text };`;
    const res = validateScriptSyntax(code, true);
    const bogus = [...res.errors, ...res.warnings].filter(f =>
      ['CASE_SENSITIVITY', 'TYPO', 'UNSAFE_STATE_ACCESS'].includes(f.type),
    );
    expect(bogus).toHaveLength(0);
  });

  it('does not raise false unclosed-bracket/string errors on regex literals', () => {
    const code = `const re = /foo\\/bar[/]/g;\nconst out = text.replace(/\\d+/g, '#');\nreturn { text: out };`;
    const res = validateScriptSyntax(code, true);
    expect(res.errors).toHaveLength(0);
    expect(res.valid).toBe(true);
  });

  it('still catches genuine syntax errors', () => {
    const code = `const x = {;\nreturn { text };`;
    const res = validateScriptSyntax(code, true);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('warns when a modifier script has no text-returning shape', () => {
    const code = `state.count = 1;`;
    const res = validateScriptSyntax(code, true);
    expect(res.warnings.some(w => w.type === 'MISSING_RETURN')).toBe(true);
  });

  it('exposes the documented globals in AID_GLOBALS', () => {
    for (const g of ['text', 'state', 'info', 'history', 'storyCards', 'memory', 'stop', 'log']) {
      expect(AID_GLOBALS).toContain(g);
    }
  });

  it('recognizes the Story Card API (and aliases) as known globals', () => {
    for (const g of ['addStoryCard', 'updateStoryCard', 'removeStoryCard', 'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry']) {
      expect(AID_GLOBALS).toContain(g);
    }
    // A script that adds a card must not be flagged as calling an undocumented API.
    const code = `addStoryCard('the abyss', 'A strange domain adrift in the deep.', 'location');\nreturn { text };`;
    const res = validateScriptSyntax(code, true);
    const undocumented = [...res.errors, ...res.warnings].filter(f => f.type === 'UNDOCUMENTED_API');
    expect(undocumented).toHaveLength(0);
  });
});
