import { describe, it, expect } from 'vitest';
import { createStoryCardApi } from './offlineSimulationService';

// createStoryCardApi is the single source of truth for the Story Card globals:
// the worker embeds it via `.toString()`, and these tests exercise the same code.
// Contract per AID-Docs 01-scripting/api/story-cards-api.md:
//   updateStoryCard(index, keys, entry, type) → void
//   - replaces the card at index, throws if it doesn't exist, updates updatedAt.

describe('Story Card API — updateStoryCard(index, keys, entry, type)', () => {
  const seed = () => ([
    { id: 'a', keys: 'goblin', entry: 'A goblin.', type: 'class', title: 'Goblin', description: '', updatedAt: '2000-01-01T00:00:00.000Z' },
  ]);

  it('is implemented and mutates the card in place', () => {
    const cards = seed();
    const { updateStoryCard } = createStoryCardApi(cards);
    updateStoryCard(0, 'orc', 'A fierce orc.', 'race');
    expect(cards[0].keys).toBe('orc');
    expect(cards[0].entry).toBe('A fierce orc.');
    expect(cards[0].type).toBe('race');
  });

  it('bumps updatedAt', () => {
    const cards = seed();
    const before = cards[0].updatedAt;
    createStoryCardApi(cards).updateStoryCard(0, 'orc', 'x', 'race');
    expect(cards[0].updatedAt).not.toBe(before);
  });

  it('preserves title/description (they are not part of the 4-arg signature)', () => {
    const cards = seed();
    createStoryCardApi(cards).updateStoryCard(0, 'orc', 'x', 'race');
    expect(cards[0].title).toBe('Goblin');
    expect(cards[0].description).toBe('');
  });

  it('accepts a string index (docs: number or string)', () => {
    const cards = seed();
    createStoryCardApi(cards).updateStoryCard('0' as any, 'orc', 'x', 'race');
    expect(cards[0].keys).toBe('orc');
  });

  it('throws when the card does not exist (per the documented contract)', () => {
    const { updateStoryCard } = createStoryCardApi(seed());
    expect(() => updateStoryCard(9, 'k', 'e', 't')).toThrow(/does not exist/);
  });

  it('updateWorldEntry is a working legacy alias', () => {
    const cards = seed();
    createStoryCardApi(cards).updateWorldEntry(0, 'orc', 'aliased');
    expect(cards[0].entry).toBe('aliased');
  });

  // The worker embeds this factory as source via `.toString()`. Prove that
  // embedded form still evaluates to a working API (catches transpilation of
  // syntax the ES2020 worker relies on, e.g. ?? / optional chaining).
  it('survives the worker embed: (factory.toString())(cards) works', () => {
    const cards = seed();
    // eslint-disable-next-line no-eval
    const api = (0, eval)(`(${createStoryCardApi.toString()})`)(cards);
    api.updateStoryCard(0, 'orc', 'embedded', 'race');
    expect(cards[0].entry).toBe('embedded');
    const len = api.addStoryCard('slime', 'A slime.', 'class');
    expect(len).toBe(2);
    expect(cards[1].title).toBe('slime');
    api.removeStoryCard(0);
    expect(cards).toHaveLength(1);
  });
});
