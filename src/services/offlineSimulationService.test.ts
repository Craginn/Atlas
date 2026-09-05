import { describe, it, expect } from 'vitest';
import { validateScriptSyntax, AID_GLOBALS } from './offlineSimulationService';

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
    const structural = res.errors.filter(e =>
      ['UNCLOSED_BRACKET', 'BRACKET_MISMATCH', 'UNCLOSED_STRING'].includes(e.type),
    );
    expect(structural).toHaveLength(0);
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
