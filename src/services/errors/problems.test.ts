import { describe, expect, it } from 'vitest';
import { problemsFromChecks, problemsFromRun } from './problems';
import type { Script } from '@/types';

const script = (id: string, name: string, code: string): Script => ({ id, name, code, trigger: '', description: '', active: true });

describe('problemsFromRun', () => {
  const scripts = [
    script('lib', 'Library', 'function give(n) {\n  state.inv.push(n);\n}'),
    script('in', 'Input Modifier', 'const modifier = (text) => {\n  give("sword");\n  return { text };\n};\nmodifier(text);'),
  ];

  it('locates a Library failure in the Library, explained, with the calling hook line', () => {
    const [p] = problemsFromRun({
      executionError: {
        hook: 'Input Modifier', script: 'Library', line: '2', column: 13,
        message: "Cannot read properties of undefined (reading 'push')",
        calledFrom: { script: 'Input Modifier', line: 2 },
      },
    }, scripts);
    expect(p).toMatchObject({ source: 'run', script: 'Library', scriptId: 'lib', line: 2, sourceLine: '  state.inv.push(n);' });
    expect(p.explanation.title).toBe("`state.inv` is undefined, so the script can't read `.push` from it");
    expect(p.calledFrom).toMatchObject({ script: 'Input Modifier', line: 2 });
  });

  it('marks a problem stale once its script was edited after the run', () => {
    const [p] = problemsFromRun(
      { executionError: { hook: 'Input Modifier', line: '2', message: 'x is not defined' } },
      scripts,
      { in: 'old code', lib: scripts[0].code },
    );
    expect(p.stale).toBe(true);
  });

  it('turns caught errors into warnings', () => {
    const [p] = problemsFromRun({
      scriptErrors: [{ hook: 'Input Modifier', scriptId: 'in', script: 'Input Modifier', line: '2', message: 'TypeError: give is not a function' }],
    }, scripts);
    expect(p).toMatchObject({ source: 'caught', severity: 'warning', line: 2 });
    expect(p.explanation.title).toBe('`give` is not a function');
  });
});

describe('problemsFromChecks', () => {
  it('knows Library names when checking hooks', () => {
    const scripts = [
      script('lib', 'Library', 'const stats = {};'),
      script('in', 'Input Modifier', 'stats.hp = 1;\nconst modifier = (text) => ({ text });\nmodifier(text);'),
    ];
    expect(problemsFromChecks(scripts)).toEqual([]);
  });

  it('reports syntax errors with location and explanation', () => {
    const [p] = problemsFromChecks([script('in', 'Input Modifier', 'const modifier = (text) => {\n  if (x {\n  return { text };\n};')]);
    expect(p).toMatchObject({ source: 'check', severity: 'error', script: 'Input Modifier', line: 2 });
    expect(p.explanation.title.length).toBeGreaterThan(0);
  });
});
