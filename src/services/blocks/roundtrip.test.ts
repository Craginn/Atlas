import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseCode } from './parse';
import { generateCode } from './generate';

/**
 * A round-trip is correct when code → blocks → code parses to the same program.
 * We compare normalized source rather than bytes: the generator re-indents, so
 * byte equality would fail on cosmetics while telling us nothing about meaning.
 */
function roundTrip(src: string): string {
  return generateCode(parseCode(src));
}

/** Strip whitespace-only differences so we compare structure, not formatting. */
function normalize(src: string): string {
  return src
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n');
}

describe('block round-trip', () => {
  it('preserves a simple AID modifier', () => {
    const src = `const modifier = (text) => {\n  if (text.includes("sword")) {\n    state.hp -= 1;\n  }\n  return { text };\n};`;
    expect(normalize(roundTrip(src))).toBe(normalize(src));
  });

  it('preserves if / else if / else chains', () => {
    const src = `if (a) {\n  one();\n} else if (b) {\n  two();\n} else {\n  three();\n}`;
    expect(normalize(roundTrip(src))).toBe(normalize(src));
  });

  it('preserves every loop form', () => {
    const src = [
      'for (let i = 0; i < 10; i++) {\n  log(i);\n}',
      'for (const c of storyCards) {\n  log(c.title);\n}',
      'for (const k in state) {\n  log(k);\n}',
      'while (x) {\n  tick();\n}',
      'do {\n  tick();\n} while (x);',
    ].join('\n');
    expect(normalize(roundTrip(src))).toBe(normalize(src));
  });

  it('preserves switch, try/catch/finally, and throw', () => {
    const src =
      `switch (kind) {\n  case "a":\n    one();\n    break;\n  default:\n    two();\n}\n` +
      `try {\n  risky();\n} catch (e) {\n  log(e);\n} finally {\n  cleanup();\n}\n` +
      `throw new Error("nope");`;
    expect(normalize(roundTrip(src))).toBe(normalize(src));
  });

  it('preserves comments', () => {
    const src = `// leading comment\nconst x = 1;\n/* block comment */\nconst y = 2;`;
    const out = roundTrip(src);
    expect(out).toContain('// leading comment');
    expect(out).toContain('/* block comment */');
  });

  it('preserves template literals without re-indenting them', () => {
    const src = 'const t = `line one\n  line two`;';
    // The template's internal newline/indent is content, not formatting.
    expect(roundTrip(src)).toContain('`line one\n  line two`');
  });

  it('keeps unparseable code intact instead of dropping it', () => {
    const src = 'function broken( {';
    const program = parseCode(src);
    expect(program.parseError).toBeTruthy();
    expect(generateCode(program)).toBe(src);
  });

  it('survives a second pass unchanged (idempotent)', () => {
    const src = `if (a) {\n  b();\n} else {\n  c();\n}`;
    const once = roundTrip(src);
    expect(roundTrip(once)).toBe(once);
  });
});

describe('block round-trip — real AID script suite', () => {
  const fixtureDir = path.resolve(__dirname, '../../../Mock Script Test');
  const files = fs.existsSync(fixtureDir)
    ? fs.readdirSync(fixtureDir).filter(f => f.endsWith('.js'))
    : [];

  it('found the fixture suite', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`round-trips ${file} to an equivalent program`, () => {
      const src = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
      const out = roundTrip(src);

      // The strongest check available without an evaluator: re-parsing the
      // generated code must produce the same block structure as the original.
      // That catches dropped statements, mis-nesting, and mangled expressions.
      const a = JSON.stringify(stripIds(parseCode(src)));
      const b = JSON.stringify(stripIds(parseCode(out)));
      expect(b).toBe(a);
    });
  }
});

/** Block ids are random per parse; drop them before structural comparison. */
function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'id') continue;
      out[k] = stripIds(v);
    }
    return out;
  }
  return value;
}
