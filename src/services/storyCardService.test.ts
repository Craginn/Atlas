import { describe, it, expect } from 'vitest';
import { matchStoryCards, assembleWorldLore, simulateTriggers } from './storyCardService';
import type { StoryCard } from '../types';

const card = (over: Partial<StoryCard>): StoryCard => ({
  id: over.id ?? 'c',
  title: over.title ?? 'Card',
  content: over.content ?? 'Entry text.',
  keywords: over.keywords ?? [],
  type: over.type ?? 'Character',
  notes: over.notes ?? '',
});

describe('storyCardService — AID trigger rules', () => {
  const marcus = card({ id: 'm', title: 'Sir Marcus', content: 'Sir Marcus is a knight.', keywords: ['Marcus', 'Dawnbringer'] });
  const dragon = card({ id: 'd', title: 'Dragon', content: 'A great red dragon.', keywords: ['dragon'] });

  it('is case-insensitive', () => {
    expect(matchStoryCards('MARCUS drew his blade', [marcus])).toHaveLength(1);
  });

  it('matches as a substring (dragon → dragons, pendragon)', () => {
    expect(matchStoryCards('two dragons flew over', [dragon])).toHaveLength(1);
    expect(matchStoryCards('house Pendragon', [dragon])).toHaveLength(1);
  });

  it('does not match when no trigger appears', () => {
    expect(matchStoryCards('a quiet meadow', [marcus, dragon])).toHaveLength(0);
  });

  it('splits comma-joined keywords stored in one entry', () => {
    const c = card({ keywords: ['wyrm,serpent,Fafnir'] });
    expect(matchStoryCards('the serpent coiled', [c])).toHaveLength(1);
  });

  it('reports which keywords matched', () => {
    const [m] = matchStoryCards('Marcus lifted Dawnbringer', [marcus]);
    expect(m.matchedKeywords).toEqual(['Marcus', 'Dawnbringer']);
  });

  it('assembles a single "World Lore:" block from entries only', () => {
    const lore = assembleWorldLore([marcus, dragon]);
    expect(lore.startsWith('World Lore:\n')).toBe(true);
    expect(lore).toContain('Sir Marcus is a knight.');
    expect(lore).toContain('A great red dragon.');
    // Name / triggers / type / notes are never included.
    expect(lore).not.toContain('Dawnbringer]');
  });

  it('simulateTriggers returns matches + assembled lore together', () => {
    const { matches, worldLore } = simulateTriggers('a dragon appeared', [marcus, dragon]);
    expect(matches).toHaveLength(1);
    expect(worldLore).toContain('A great red dragon.');
  });

  it('empty text triggers nothing and yields empty lore', () => {
    const { matches, worldLore } = simulateTriggers('', [marcus, dragon]);
    expect(matches).toHaveLength(0);
    expect(worldLore).toBe('');
  });
});
