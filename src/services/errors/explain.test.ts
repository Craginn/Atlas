import { describe, expect, it } from 'vitest';
import { closest, declaredNames, explainError, receiverOf } from './explain';

describe('receiverOf', () => {
  it('finds the member chain a property is read from', () => {
    expect(receiverOf('  if (state.player.hp > 0) {', 'hp')).toBe('state.player');
    expect(receiverOf('x = cards[0]["entry"]', 'entry')).toBe('cards[0]');
    expect(receiverOf('a.b.c + d.e.c', 'c', 10)).toBe('d.e');
  });
});

describe('explainError', () => {
  it('names the undefined object on the line, with a state-specific fix', () => {
    const e = explainError("Cannot read properties of undefined (reading 'hp')", {
      sourceLine: 'if (state.player.hp > 0) {', column: 18,
    });
    expect(e.title).toBe('`state.player` is undefined, so the script can\'t read `.hp` from it');
    expect(e.fix).toContain('state.player = state.player || {};');
  });

  it('suggests the closest real name for a misspelling', () => {
    expect(explainError('stat is not defined').fix).toBe('Did you mean `state`?');
    expect(explainError('helpr is not defined', { knownNames: ['helper'] }).fix).toBe('Did you mean `helper`?');
  });

  it('spots a misspelled method', () => {
    const e = explainError('text.include is not a function');
    expect(e.title).toBe('`text.include` is not a function');
    expect(e.fix).toBe('Did you mean `text.includes`?');
  });

  it('explains common runtime failures plainly', () => {
    expect(explainError('Assignment to constant variable.', { sourceLine: '  count += 1;' }).fix).toContain('let count');
    expect(explainError("Identifier 'hp' has already been declared").explanation).toContain('Library');
    expect(explainError('Maximum call stack size exceeded').title).toMatch(/calling itself/);
    expect(explainError('Execution timed out after 10000ms').title).toMatch(/never finished/);
    expect(explainError('Story card at index 7 does not exist').title).toContain('position 7');
  });

  it('falls back to the engine message', () => {
    expect(explainError('Something odd').title).toBe('Something odd');
  });
});

describe('helpers', () => {
  it('collects declared names and finds close matches', () => {
    expect(declaredNames('const a = 1; function go() {} let b;')).toEqual(['a', 'go', 'b']);
    expect(closest('Text', ['text', 'next'])).toBe('text');
    expect(closest('zzzz', ['text'])).toBeUndefined();
  });
});
