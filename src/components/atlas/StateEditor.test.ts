import { describe, it, expect } from 'vitest';
import { diff, estimateMemoryUsage, calculateMemoryPercentage, formatMemoryUsage, MEMORY_LIMIT_BYTES } from './StateEditor';

const MB = 1024 * 1024;
const KB = 1024;

describe('estimateMemoryUsage', () => {
  it('returns 0 for empty state', () => {
    expect(estimateMemoryUsage({})).toBe(4); // "{}" = 2 chars * 2 bytes
  });

  it('calculates memory for simple state objects', () => {
    const state = { PS: { health: 100, mana: 50, name: 'Test' } };
    const usage = estimateMemoryUsage(state);
    // JSON.stringify({ PS: { health: 100, mana: 50, name: 'Test' } }) = '{"PS":{"health":100,"mana":50,"name":"Test"}}'
    // Length = 42 chars, * 2 = 84 bytes
    expect(usage).toBeGreaterThan(0);
    expect(usage).toBeLessThan(500);
  });

  it('handles nested objects and arrays', () => {
    const state = {
      PS: { health: 100, inventory: ['sword', 'shield', 'potion'] },
      MS: { activeMonsters: [{ name: 'Goblin', health: 30 }, { name: 'Orc', health: 50 }] },
    };
    const usage = estimateMemoryUsage(state);
    expect(usage).toBeGreaterThan(100);
    expect(usage).toBeLessThan(1000);
  });

  it('returns 0 for circular references', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;
    expect(estimateMemoryUsage(circular)).toBe(0);
  });

  it('scales linearly with state size', () => {
    const small = { data: Array(10).fill('x') };
    const large = { data: Array(100).fill('x') };
    const smallUsage = estimateMemoryUsage(small);
    const largeUsage = estimateMemoryUsage(large);
    expect(largeUsage).toBeGreaterThan(smallUsage);
  });

  it('calculates percentage of 16MB limit correctly', () => {
    // Create a state that's approximately 1MB
    const oneMbState = { data: 'x'.repeat(500000) };
    const usage = estimateMemoryUsage(oneMbState);
    const percentage = (usage / MEMORY_LIMIT_BYTES) * 100;
    expect(percentage).toBeGreaterThan(5); // ~6% for 1MB
    expect(percentage).toBeLessThan(10);
  });
});

describe('calculateMemoryPercentage', () => {
  it('returns 0 for empty state', () => {
    expect(calculateMemoryPercentage({})).toBeCloseTo(0, 4);
  });

  it('returns percentage value between 0-100 for typical states', () => {
    const state = { PS: { health: 100, mana: 50, inventory: ['sword', 'shield'] } };
    const percentage = calculateMemoryPercentage(state);
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThan(1);
  });

  it('can exceed 100 for very large states', () => {
    // Create a state larger than 16MB
    const largeState = { data: 'x'.repeat(10000000) };
    const percentage = calculateMemoryPercentage(largeState);
    expect(percentage).toBeGreaterThan(100);
  });
});

describe('formatMemoryUsage', () => {
  it('formats bytes for small values', () => {
    expect(formatMemoryUsage(100)).toBe('100 B');
    expect(formatMemoryUsage(999)).toBe('999 B');
  });

  it('formats kilobytes for medium values', () => {
    expect(formatMemoryUsage(KB)).toBe('1.00 KB');
    expect(formatMemoryUsage(1536)).toBe('1.50 KB');
    expect(formatMemoryUsage(100 * KB)).toBe('100.00 KB');
  });

  it('formats megabytes for large values', () => {
    // formatMemoryUsage uses MEMORY_LIMIT_BYTES (16MB) as the threshold for MB display
    expect(formatMemoryUsage(MEMORY_LIMIT_BYTES)).toBe('16.00 MB');
    expect(formatMemoryUsage(32 * MB)).toBe('32.00 MB');
    expect(formatMemoryUsage(100 * MB)).toBe('100.00 MB');
  });
});

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
