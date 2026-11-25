import { describe, expect, it } from 'vitest';
import { validateScriptSyntax } from './offlineSimulationService';

const warningsOf = (code: string, known: string[] = []) =>
  validateScriptSyntax(code, false, undefined, known).warnings.map(w => [w.type, w.line, w.column]);

describe('validator warnings are based on the syntax tree', () => {
  it('ignores look-alikes inside strings and comments (the old regexes did not)', () => {
    const code = [
      '// if (a = b) is wrong, use ==',
      'const tip = "never write if (x = 1) or a == b";',
      'log(tip);',
    ].join('\n');
    expect(warningsOf(code)).toEqual([]);
  });

  it('points at the exact operator for assignment-in-condition and loose equality', () => {
    const code = 'let hp = 1;\nif (hp = 0) log("dead");\nif (hp == "0") log("x");';
    expect(warningsOf(code)).toEqual([
      ['ASSIGNMENT_IN_CONDITION', 2, 8],
      ['LOOSE_EQUALITY', 3, 8],
    ]);
  });

  it('allows the deliberate idioms', () => {
    const code = 'let m, re = /a/g, s = "a";\nwhile ((m = re.exec(s))) log(m);\nif (s == null) log(1);';
    expect(warningsOf(code)).toEqual([]);
  });

  it('flags near-misses of AID globals unless the name is defined somewhere', () => {
    expect(warningsOf('stat.hp = 1;')).toEqual([['UNDOCUMENTED_API', 1, 1]]);
    expect(warningsOf('const stats = {}; stats.hp = 1;')).toEqual([]);
    // Defined in the Library: not a typo.
    expect(warningsOf('stats.hp = 1;', ['stats'])).toEqual([]);
  });

  it('warns when a modifier never returns', () => {
    const r = validateScriptSyntax('const modifier = (text) => { log(text); };\nmodifier(text);', true);
    expect(r.warnings.map(w => w.type)).toEqual(['MISSING_RETURN']);
  });
});
