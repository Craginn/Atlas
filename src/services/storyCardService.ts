import { StoryCard } from '../types';

// Story Card trigger matching, faithful to AI Dungeon's documented rules
// (AID-Docs/04-story-cards/trigger-system.md):
//   - Case-insensitive.
//   - Literal SUBSTRING match (trigger "dragon" matches "dragons", "pendragon").
//   - Leading/trailing spaces in a trigger are significant.
//   - Commas separate multiple triggers on one card.
//   - Any one trigger match activates the card.
// The app's StoryCard maps to AID's five fields: type=Type, title=Name,
// content=Entry, keywords=Triggers, notes=Notes.

export interface MatchedTrigger {
  card: StoryCard;
  /** The specific trigger keywords that matched the text. */
  matchedKeywords: string[];
}

/** Normalize a card's keywords, splitting any comma-joined entries. */
export function cardTriggers(card: StoryCard): string[] {
  return (card.keywords || [])
    .flatMap(k => k.split(','))
    // Note: do NOT trim — leading/trailing spaces are significant per AID.
    .filter(k => k.length > 0);
}

/** Return the cards that a block of narrative text would activate. */
export function matchStoryCards(text: string, cards: StoryCard[]): MatchedTrigger[] {
  const haystack = (text || '').toLowerCase();
  const matches: MatchedTrigger[] = [];
  for (const card of cards) {
    const matched = cardTriggers(card).filter(trigger =>
      haystack.includes(trigger.toLowerCase()),
    );
    if (matched.length > 0) {
      matches.push({ card, matchedKeywords: matched });
    }
  }
  return matches;
}

// Assemble the "World Lore:" context block from triggered cards. Only the Entry
// (content) is sent to the AI — Type, Name, Triggers, and Notes are never shown
// to the model (per card-anatomy.md).
export function assembleWorldLore(cards: StoryCard[]): string {
  const entries = cards.map(c => (c.content || '').trim()).filter(Boolean);
  if (entries.length === 0) return '';
  return 'World Lore:\n' + entries.join('\n');
}

/** Convenience: match against text and return the assembled World Lore block. */
export function simulateTriggers(text: string, cards: StoryCard[]): {
  matches: MatchedTrigger[];
  worldLore: string;
} {
  const matches = matchStoryCards(text, cards);
  return { matches, worldLore: assembleWorldLore(matches.map(m => m.card)) };
}
