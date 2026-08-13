# Trigger System

> Triggers are keywords that cause Story Card entries to be added to context when they appear in recent narrative text.

## Overview

The trigger system determines when Story Cards activate. Understanding how triggers work is essential for creating cards that activate at the right times—neither too often (wasting context space) nor too rarely (failing to provide needed information).

## Trigger Matching Rules

### Case Insensitivity

Triggers are case-insensitive:
- Trigger "Dragon" matches: "dragon", "DRAGON", "Dragon", "dRaGoN"

### Space Sensitivity

Triggers ARE sensitive to leading and trailing spaces:
- Trigger "cat" matches: "cat", "cats", "catalog"
- Trigger "cat " (trailing space) matches: "cat " but NOT "cats" or "cat."
- Trigger " cat" (leading space) matches: " cat" but NOT "cat"

**Practical Implication**: Usually don't add extra spaces unless you specifically need exact word boundaries.

### Substring Matching

Triggers match literal substrings within text:
- Trigger "dragon" matches: "dragon", "dragons", "dragonfire", "pendragon"
- Trigger "elf" matches: "elf", "elfish", "shelf", "self"

**Using This Intentionally**:
- "boat" triggers on "boats" (handles regular plurals)
- "attack" triggers on "attacking", "attacked"

**Avoiding Unwanted Matches**:
- "cat" also matches "catalog", "catapult", "locate"
- "elf" matches "shelf" and "self"
- Consider spaces: " elf " reduces accidental matches
- Consider punctuation: "elf." only matches "elf."

### Irregular Plurals

Triggers do **not** automatically match irregular plural forms:
- "elf" will NOT match "elves"
- "knife" will NOT match "knives"

Add separate triggers for irregular plurals:
```
elf,elves,elven
```

### Punctuation in Triggers

Punctuation is included in the match (except commas, which separate triggers):
- Trigger "elf." only matches "elf." not "elf" or "elfish"
- Trigger "elf" matches "elf", "elf.", "elfish"

### Multiple Triggers

Separate triggers with commas:
```
dragon,wyrm,serpent,Fafnir
```

Any of these will activate the card.

### Phrase Triggers

Triggers can be multi-word phrases:
```
red dragon,fire drake,Fafnir the Destroyer
```

The entire phrase must appear in text to trigger.

## Trigger Evaluation Window

The system evaluates a window of recent actions for trigger matches:

- **Minimum**: 4 actions are always checked
- **Dynamic**: If >500 tokens available for Story Cards: (tokens / 100) actions
- **Example**: 900 tokens → 9 recent actions checked

This means a card triggered 3 actions ago is still likely in context.

## Trigger Frequency and Priority

When multiple cards could be triggered:
- Cards are ranked by recency and frequency of trigger matches
- Higher-ranked cards are more likely to be included
- Very frequently triggered cards may crowd out others

## Trigger Timing

**Important**: A card's Entry is added to context AFTER the current output. The AI cannot use a card's information in the same generation where the trigger first appears—only in subsequent outputs.

## When Cards Stay in Context

Once triggered, cards remain in context until pushed out by token limits:
- There is no fixed number of turns
- Frequently referenced cards are prioritized
- Older or less relevant cards may be dropped if space is constrained
- This provides continuity when discussing an element across several actions

## Trigger Design Strategies

### For Characters

Use the character's name and relevant aliases:
```
Elena,Princess Elena,the princess,her highness
```

### For Locations

Use the location name and descriptive references:
```
Thornwood,Thornwood Village,the village,Thornwood's
```

### For Concepts

Use the concept name and related terms:
```
blood magic,hemomancy,blood mage,blood ritual
```

### Avoiding Common Words

Don't trigger on words that appear constantly:
- BAD: "the", "a", "you", "is"
- BAD: Very common words like "door", "look", "walk"
- GOOD: Specific names, unique terms

### Truncated Triggers for Plurals

Use word stems to catch variations:
```
dragon,wyrm
```
- "dragon" catches "dragon", "dragons", "dragonkin"

### Avoiding Unwanted Substrings

If "cat" triggers on "catalog":
- Consider the context—does it matter?
- Use more specific triggers: "the cat", "a cat"
- Accept some false positives as trade-off for coverage

## Testing Triggers

Use the Context Viewer to verify:
1. Take an action mentioning your trigger
2. Check Context Viewer to see if the card is active
3. Adjust triggers based on behavior

## Common Trigger Problems

### Card Never Triggers
- Check for typos in triggers
- Verify the term actually appears in text
- Check if other cards are crowding it out

### Card Triggers Too Often
- Use more specific triggers
- Remove overly common trigger words
- Consider if the card should be Plot Essentials instead

### Wrong Card Triggers
- Triggers may overlap between cards
- Use more distinctive trigger words
- Review which cards share similar triggers

## Related Documentation

- [Story Cards Overview](story-cards-overview.md)
- [Card Anatomy](card-anatomy.md)
- [Card Best Practices](card-best-practices.md)

## Source References

- https://help.aidungeon.com/faq/story-cards
- https://www.reddit.com/r/AIDungeon/comments/1qadbzg/story_cards_guide_core_mechanics_trigger_design/ (u/ppp47634)
