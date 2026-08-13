import { describe, it, expect } from 'vitest';
import { diff } from './StateEditor';

describe('state delta diff', () => {
  it('emits one entry for a whole added object, not a box per field', () => {
    // Turn 1 with the RPG engine: the Library initializes state.PS whole.
    const deltas = diff({}, { PS: { health: 100, mana: 50, equipped: { head: null } } });
    expect(deltas).toEqual([
      { path: 'PS', from: undefined, to: { health: 100, mana: 50, equipped: { head: null } }, type: 'added' },
    ]);
  });

  it('emits one entry for a whole removed object', () => {
    const deltas = diff({ tempCharacter: { Name: 'a', Race: null } }, {});
    expect(deltas).toEqual([
      { path: 'tempCharacter', from: { Name: 'a', Race: null }, to: undefined, type: 'removed' },
    ]);
  });

  it('keeps an empty added container as a single entry', () => {
    const deltas = diff({}, { inventory: [], skills: {} });
    expect(deltas).toEqual([
      { path: 'inventory', from: undefined, to: [], type: 'added' },
      { path: 'skills', from: undefined, to: {}, type: 'added' },
    ]);
  });

  it('emits one entry for a whole added array element', () => {
    const deltas = diff({ EventsPool: [] }, { EventsPool: [[2, 'An evil presence']] });
    expect(deltas).toEqual([
      { path: 'EventsPool.0', from: undefined, to: [2, 'An evil presence'], type: 'added' },
    ]);
  });

  it('still leafs modified values as before', () => {
    const deltas = diff({ PS: { health: 100 } }, { PS: { health: 90 } });
    expect(deltas).toEqual([
      { path: 'PS.health', from: 100, to: 90, type: 'modified' },
    ]);
  });
});
