# Card Best Practices

> Guidelines for creating effective Story Cards that enhance AI storytelling without wasting context space.

## Overview

Well-designed Story Cards can significantly improve story consistency and world-building. Poorly designed cards can waste context space or cause confusion. These best practices help you create cards that work effectively.

## Entry Writing

### Use Plain English

Write naturally but concisely:
- Short, clear sentences
- Unambiguous language
- No special formatting requirements

The AI doesn't need bullet points or structured data—natural language works well.

### Be Thorough but Brief

Include important information without padding:
- Every sentence should add value
- Remove redundant phrasing
- Focus on what the AI needs to know

### Repeat the Subject's Name

The AI doesn't see the card's Name field. Mention the subject in the Entry:

**Bad**: "He is a knight who serves the king."
**Good**: "Sir Marcus is a knight who serves King Aldric."

Use the name multiple times for emphasis and clarity.

### Front-Load Important Information

The AI attends more strongly to the beginning and end of text:
- Start with the most critical facts
- End with defining characteristics or current relevance
- Put less essential details in the middle

### Avoid Excessive Physical Description

Unless appearance affects the story:
- Skip detailed physical descriptions
- The AI often ignores incidental visual details
- Focus on personality, behavior, and relationships

## Trigger Design

### Use Specific Triggers

More specific triggers = fewer false activations:
- Character names (proper nouns)
- Unique location names
- Distinctive terms from your world

### Avoid Common Words

Don't trigger on words that appear constantly:
- Skip: "the", "door", "look", "say"
- Use: Names, titles, unique terms

### Consider Plurals and Variations

Regular plurals are caught by substring matching:
- "dragon" catches "dragons"
- "boat" catches "boats"

Irregular plurals need explicit triggers:
- "elf" does NOT catch "elves"
- Use: "elf,elves,elven"
- Add synonyms: "wyrm,serpent" for variety

### Beware Substring Issues

"cat" matches "catalog":
- Usually not a problem in context
- Use phrase triggers if needed: "the cat"
- Accept minor false positives for coverage

### Test Your Triggers

Use the Context Viewer to verify activation:
1. Mention the trigger term
2. Check if the card appears in context
3. Adjust as needed

## Card Organization

### Use Descriptive Names

Names are for your reference:
- Make them descriptive and searchable
- Use consistent naming conventions
- Group related cards with prefixes if helpful

### Choose Appropriate Types

Match Type to content:
- Character: People and creatures
- Location: Places
- Faction: Groups, organizations
- Class/Race: For Character Creator scenarios
- Custom: Everything else

### Keep Notes Useful

Use Notes for:
- Why you created the card
- Alternative entry versions
- Related cards or connections
- Reminders about trigger behavior

## Balancing Cards and Context

### Story Cards vs. Plot Essentials

Choose the right tool:
- Always needed → Plot Essentials
- Only when relevant → Story Cards

Don't put conditional information in Plot Essentials or essential information only in Story Cards.

### Watch Card Count

Many cards can crowd out history:
- Monitor context allocation
- Consolidate related cards if needed
- Use more specific triggers to reduce overlap

### Keep Cards Concise

Long entries fill context quickly:
- Aim for 2-4 sentences typically
- Include only information the AI will use
- More detail isn't always better

## Card Networks

### Reference Other Cards (Network Effect)

Mentioning one entity inside another card's Entry encourages chained activation:
- If Card A is active and mentions Card B's name, the AI is more likely to use that name
- When the AI outputs that name, Card B triggers for the next generation
- Example: A character card mentions "The Silver Guild" → faction card triggers when the character appears

### Embed Triggers in Plot Essentials

Mentioning key entity names in Plot Essentials primes the AI to use those names:
- Plot Essentials are always visible to the AI
- If Plot Essentials lists "Friends: Joe, Dave", the AI is more likely to mention them
- When those names appear in AI output, their Story Cards trigger

### Parent-Child Relationships

For complex locations or factions:
- Main card for the overall entity
- Sub-cards for specific details
- Main card's triggers include references to sub-cards

## Maintenance

### Update as Story Evolves

Cards should reflect current story state:
- Update entries when relationships change
- Remove outdated information
- Add new developments

### Prune Unused Cards

Periodically review your cards:
- Remove cards that never trigger
- Consolidate cards with overlapping content
- Keep the library focused and efficient

### Review in Context Viewer

Check which cards are activating:
- Look for cards that trigger too often
- Identify cards that never trigger
- Verify expected cards appear when needed

## Common Mistakes to Avoid

1. **Too Many Triggers**: Cards activating constantly
2. **Too Few Triggers**: Cards never activating
3. **Redundant Content**: Same info in multiple cards
4. **Missing Subject Names**: AI doesn't know who "he" is
5. **Excessive Length**: Crowding out history
6. **Vague Entries**: Not enough specificity for AI to use

## Related Documentation

- [Story Cards Overview](story-cards-overview.md)
- [Card Anatomy](card-anatomy.md)
- [Trigger System](trigger-system.md)
- [Context Optimization](../02-context/context-optimization.md)

## Source References

- https://help.aidungeon.com/faq/story-cards
- https://www.reddit.com/r/AIDungeon/comments/1qadbzg/story_cards_guide_core_mechanics_trigger_design/ (u/ppp47634)
