import { describe, expect, it } from 'vitest';
import { ancestorsOf, buildSections, relativePath, searchSection, sortSections } from './stateSections';

const state = {
  PS: { hp: 10, name: 'Aria', inventory: ['sword', 'potion'] },
  MS: { turn: 4 },
  log: 'hello world',
};

describe('buildSections', () => {
  it('makes one section per top-level key, in state order', () => {
    const s = buildSections(state, []);
    expect(s.map(x => [x.key, x.kind, x.count])).toEqual([
      ['PS', 'object', 3],
      ['MS', 'object', 1],
      ['log', 'string', 11],
    ]);
  });

  it('attaches last-turn changes to the section they belong to', () => {
    const s = buildSections(state, [
      { path: 'PS.hp', type: 'modified', from: 12, to: 10 },
      { path: 'PS.inventory.1', type: 'added', to: 'potion' },
      { path: 'MS.turn', type: 'modified', from: 3, to: 4 },
    ]);
    expect(s.find(x => x.key === 'PS')!.changes.map(c => c.path)).toEqual(['PS.hp', 'PS.inventory.1']);
    expect(s.find(x => x.key === 'log')!.changes).toEqual([]);
  });

  it('keeps a key removed last turn as a section so the change is still findable', () => {
    const s = buildSections(state, [{ path: 'quest', type: 'removed', from: { id: 1 } }]);
    const quest = s.find(x => x.key === 'quest')!;
    expect(quest.removed).toBe(true);
    expect(quest.changes).toHaveLength(1);
  });
});

describe('sortSections', () => {
  const s = buildSections(state, [{ path: 'MS.turn', type: 'modified', from: 3, to: 4 }]);
  it('sorts by name, size and changes', () => {
    expect(sortSections(s, 'name').map(x => x.key)).toEqual(['log', 'MS', 'PS']);
    expect(sortSections(s, 'size')[0].key).toBe('PS');
    expect(sortSections(s, 'changed')[0].key).toBe('MS');
    expect(sortSections(s, 'state').map(x => x.key)).toEqual(['PS', 'MS', 'log']);
  });
});

describe('searchSection', () => {
  it('matches nested keys and values case-insensitively', () => {
    expect(searchSection('PS', state.PS, 'POT').hits).toEqual(['inventory.1']);
    expect(searchSection('PS', state.PS, 'name').hits).toEqual(['name']);
    expect(searchSection('PS', state.PS, 'aria').hits).toEqual(['name']);
  });

  it('matches the section key itself and primitive sections', () => {
    expect(searchSection('PS', state.PS, 'ps').hits).toEqual(['']);
    expect(searchSection('log', state.log, 'world').hits).toEqual(['']);
  });

  it('returns nothing for an empty query and stops at its budget', () => {
    expect(searchSection('PS', state.PS, '  ').hits).toEqual([]);
    const big = Array.from({ length: 50_000 }, (_, i) => `item${i}`);
    const r = searchSection('big', big, 'item');
    expect(r.truncated).toBe(true);
    expect(r.hits.length).toBeLessThanOrEqual(200);
  });
});

describe('paths', () => {
  it('lists ancestors for auto-expansion and strips the section key', () => {
    expect([...ancestorsOf(['inventory.1', 'a.b.c'])].sort()).toEqual(['', 'a', 'a.b', 'inventory']);
    expect(relativePath('PS.inventory.1')).toBe('inventory.1');
    expect(relativePath('PS')).toBe('');
  });
});
