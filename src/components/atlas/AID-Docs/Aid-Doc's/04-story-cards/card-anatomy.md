# Card Anatomy

> Each Story Card consists of five fields: Type, Name, Entry, Triggers, and Notes.

## Overview

Understanding Story Card structure helps you create effective cards. Each field serves a specific purpose, and some are only visible to you while others are sent to the AI.

## The Five Fields

### Type

**Purpose**: Categorizes the card for organization and Character Creator functionality

**Options**:
- Character
- Class
- Race
- Location
- Faction
- Custom (you specify the type name)

**AI Visibility**: The AI does not see the Type field directly during normal play

**Special Behavior**: In Character Creator scenarios, cards with Type="Character" appear in the character selection UI

### Name

**Purpose**: Your reference label for the card

**AI Visibility**: The AI does NOT see the Name field

**Best Practices**:
- Use descriptive names for your organization
- The name helps you find and manage cards
- Don't rely on the name to convey information to the AI

### Entry

**Purpose**: The actual content sent to the AI when the card triggers

**AI Visibility**: YES - this is what the AI sees

**Context Format**: Entries appear prefaced with "World Lore:" in context

**Best Practices**:
- Write in clear, information-dense prose
- Repeat the subject's name within the Entry (since AI doesn't see the Name field)
- Place most important information at beginning and end
- Keep concise to save context space

**Example Entry**:
```
Sir Marcus is a veteran knight of the Silver Order. He served King Aldric 
for twenty years before retiring to the countryside. Marcus carries an 
enchanted longsword named Dawnbringer. He is fiercely loyal but haunted 
by a past failure he refuses to discuss.
```

### Triggers

**Purpose**: Keywords that cause the card to activate

**Format**: Comma-separated list of words or phrases

**AI Visibility**: The AI does not see the triggers—only the Entry

**Example Triggers**:
```
Marcus,Sir Marcus,the knight,Dawnbringer
```

**Key Rules**:
- Case-insensitive: "Marcus" matches "marcus" and "MARCUS"
- Space-sensitive: "Marcus " (with trailing space) won't match "Marcus."
- Substring matching: "dragon" matches "dragons"

### Notes

**Purpose**: Your private notes about the card

**AI Visibility**: The AI does NOT see Notes during normal gameplay

**Use Cases**:
- Remind yourself why you created the card
- Store alternate entry versions
- Track card history

**Special Behavior in Character Creator**: When a card is presented as a character option, the Notes field is shown to the player as the option description.

## Field Summary Table

| Field | Visible to AI | Visible to Player | Purpose |
|-------|--------------|-------------------|---------|
| Type | No | Yes (in UI) | Organization, Character Creator |
| Name | No | Yes (in UI) | Your reference |
| Entry | Yes (when triggered) | Yes (in UI) | AI information |
| Triggers | No | Yes (in UI) | Activation keywords |
| Notes | No* | Yes (in UI) | Your notes |

*Notes are shown to players in Character Creator scenarios

## Entry Composition Guidelines

Since the Entry is what the AI actually reads:

### Include the Name

The AI doesn't see the Name field, so mention the subject in the Entry:
- BAD: Entry assumes AI knows who "he" refers to
- GOOD: Entry explicitly names "Sir Marcus"

### Front-Load Important Information

The AI attends more strongly to the beginning and end of text:
- Start with the most crucial facts
- End with defining characteristics
- Put less critical details in the middle

### Be Concise but Complete

Every token matters:
- Avoid flowery prose
- Use short, direct sentences
- Include only relevant information
- Skip information the story will naturally reveal

### Avoid Excessive Physical Description

Unless appearance is plot-relevant:
- The AI often ignores detailed physical descriptions
- Focus on personality, motivations, relationships
- Include appearance only if it affects the story

## Related Documentation

- [Story Cards Overview](story-cards-overview.md)
- [Trigger System](trigger-system.md)
- [Card Best Practices](card-best-practices.md)

## Source References

- https://help.aidungeon.com/faq/story-cards
