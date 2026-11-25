import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { bracketDepthAt, scopePath } from './nesting';

const make = (doc: string) => {
  const state = EditorState.create({ doc, extensions: [javascript()] });
  ensureSyntaxTree(state, state.doc.length, 5000);
  return state;
};

/** Depth of every bracket character in `doc`, in order. */
const depths = (doc: string) => {
  const state = make(doc);
  return [...doc].flatMap((ch, i) => ('()[]{}'.includes(ch) ? [`${ch}${bracketDepthAt(state, i)}`] : []));
};

describe('bracket depth', () => {
  it('increases with nesting and matches between a pair', () => {
    expect(depths('f(a[b({})])')).toEqual(['(0', '[1', '(2', '{3', '}3', ')2', ']1', ')0']);
  });

  it('treats blocks, params and calls as levels', () => {
    expect(depths('function g(x) { if (x) { h(); } }')).toEqual([
      '(0', ')0', '{0', '(1', ')1', '{1', '(2', ')2', '}1', '}0',
    ]);
  });

  it('counts template interpolations as a level', () => {
    // `${` / `}` are themselves a level (1), so the call inside sits at 2.
    expect(depths('log(`a ${b(c)}`)')).toEqual(['(0', '{1', '(2', ')2', '}1', ')0']);
  });
});

describe('scopePath', () => {
  const code = [
    'const modifier = (text) => {',
    '  if (state.ready) {',
    '    history.forEach(entry => {',
    '      const card = { stats: { hp: 1 } };',
    '    });',
    '  }',
    '};',
  ].join('\n');

  it('names functions, control flow, callbacks and object keys outermost first', () => {
    const state = make(code);
    const pos = code.indexOf('hp');
    expect(scopePath(state, pos).map(c => c.label)).toEqual([
      'modifier()',
      'if',
      'history.forEach callback()',
      '{}',
      'stats: {}',
    ]);
  });

  it('is empty at top level', () => {
    expect(scopePath(make('const a = 1;'), 5)).toEqual([]);
  });
});
