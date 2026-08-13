# Story Cards Overview

> Story Cards are triggered information packets that provide the AI with relevant world-building details when specific keywords appear in the narrative.

## Overview

Story Cards are one of AI Dungeon's most powerful features for maintaining consistent world-building. They act as notes for the AI about characters, locations, items, concepts, or any other story elements. Unlike Plot Essentials (which are always in context), Story Cards only activate when their trigger keywords appear, making them efficient for large amounts of lore.

## Core Concept

A Story Card contains:
- **Triggers**: Keywords that activate the card
- **Entry**: Information sent to the AI when activated
- **Metadata**: Type, name, notes (for your reference)

When a trigger word appears in recent text (player input or AI output), the card's Entry is added to context for that generation and subsequent turns.

## When to Use Story Cards

### Capturing Elements

As you play, you might encounter something intriguing—a character, place, or concept. Create a Story Card to ensure the AI remembers it when it comes up again.

### Fleshing Out Elements

The AI might mention a person or place without much detail. Create a Story Card to expand on it, either writing the details yourself or using the AI generator.

### Preliminary World-Building

Before playing, set up a world with places, people, and concepts. Story Cards let you create this framework, ensuring the AI has access to your custom lore when relevant.

## How Story Cards Differ from Other Features

| Feature | Always in Context | Conditional | Best For |
|---------|------------------|-------------|----------|
| Plot Essentials | Yes | No | Core facts |
| Story Summary | Yes | No | Plot overview |
| Author's Note | Yes | No | Tone/style |
| Story Cards | No | Trigger-based | World-building |
| Memory Bank | No | Relevance-based | Past events |

Story Cards are unique in using explicit keyword triggers.

## AI Context Behavior

When a Story Card activates:
1. Its Entry text is added to context AFTER the current output
2. All triggered entries are grouped into a single "World Lore:" block
3. The card remains in context until pushed out by token limits (no fixed turn count)
4. The AI can use this information in subsequent responses

**Important timing**: The AI cannot use a card's information in the same generation where the trigger first appears. The Entry is added after that output, so the AI uses it starting from the next generation.

**Important**: The AI doesn't know Story Cards exist as a feature. It just sees additional information in its context.

## Story Cards in Scenarios

Scenario creators can include Story Cards that transfer to Adventures:
- Define characters, locations, factions
- Establish world rules and lore
- Create consistent settings across multiple playthroughs

## Story Cards in Adventures

Players can add Story Cards during play:
- Capture emerging story elements
- Expand on AI-generated content
- Customize the experience

## Script Integration

Scripts can programmatically manage Story Cards:
- `addStoryCard(keys, entry, type)` - Create cards
- `updateStoryCard(index, keys, entry, type)` - Modify cards
- `removeStoryCard(index)` - Delete cards
- `storyCards` array - Read all cards

See the [Story Cards API](../01-scripting/api/story-cards-api.md) for details.

## Limitations

- **Context Space**: Story Cards compete for Dynamic Elements space (~25%)
- **Trigger Dependency**: Cards only activate when triggered
- **No Guarantee**: The AI may not use all information in a card
- **Long Cards**: Very long entries may be partially ignored

## Related Documentation

- [Card Anatomy](card-anatomy.md)
- [Trigger System](trigger-system.md)
- [Card Generation](card-generation.md)
- [Card Best Practices](card-best-practices.md)

## Source References

- https://help.aidungeon.com/faq/story-cards
- https://www.reddit.com/r/AIDungeon/comments/1qadbzg/story_cards_guide_core_mechanics_trigger_design/ (u/ppp47634)
