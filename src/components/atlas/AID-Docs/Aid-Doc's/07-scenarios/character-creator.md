# Character Creator

> Scenarios can present Story Cards as character options for players to select during Adventure setup.

## Overview

The Character Creator feature allows Scenario creators to present Story Cards as selectable character options. When players start the Scenario, they choose from these options, and their selection becomes part of their Adventure.

## How It Works

### Setup

1. Create Story Cards with Type = "Character"
2. Fill in the Entry with character information
3. Fill in Notes with player-facing description
4. The cards become selectable options

### Player Experience

1. Player starts the Scenario
2. Presented with character options
3. Each option shows the card's Notes as description
4. Player selects a character
5. Selected card's Entry is available in the Adventure

## Story Card Configuration

### Type Field

Set Type to "Character" for cards to appear in character selection.

Other types (Class, Race, Location, Faction, Custom) do not appear in character selection.

### Entry Field

Contains information for the AI:
- Character background
- Personality traits
- Abilities or skills
- Relationships

This is what goes into context when triggered.

### Notes Field

Contains the player-facing description:
- What players see when choosing
- Can differ from Entry
- Should be appealing and informative

### Triggers

Still function normally:
- Character name and relevant terms
- Activates the card during play
- Selected character card likely always triggered

## Example

**Story Card**:
- Type: Character
- Name: The Wandering Knight
- Entry: "Sir Marcus is a wandering knight who abandoned his post after 
  witnessing corruption in the royal court. He carries a blessed blade 
  named Dawnbringer and seeks to restore his honor through noble deeds."
- Triggers: "Marcus,Sir Marcus,the knight,Dawnbringer"
- Notes: "A disgraced knight seeking redemption. Strong in combat but 
  haunted by past failures."

**Player Sees**: "A disgraced knight seeking redemption. Strong in combat 
but haunted by past failures."

**What AI Gets**: The full Entry about Sir Marcus.

## Multiple Character Types

You can create multiple character categories:

### Class Selection

Cards with Type "Class" could define archetypes:
- Warrior, Mage, Rogue, etc.

### Race Selection

Cards with Type "Race" could define species:
- Human, Elf, Dwarf, etc.

### Combined Selection

Use Scenario Options to create multi-step selection:
1. Choose race
2. Choose class
3. Choose background

## Integration with Placeholders

Combine Character Creator with placeholders:
- Player selects a character template
- Player customizes with name/details via placeholders
- Rich personalization

## Best Practices

### Compelling Notes

Write Notes that sell the option:
- Evocative descriptions
- Clear fantasy/appeal
- Distinct from other options

### Complete Entries

Entries should be self-contained:
- All relevant information
- Works when triggered
- Follows Story Card best practices

### Balanced Options

Make options appealing:
- Each should feel viable
- Different play styles
- No obviously "best" choice

### Test All Paths

Play test each character option:
- Does the AI use the information?
- Is the experience distinct?
- Are triggers working?

## Related Documentation

- [Scenario Structure](scenario-structure.md)
- [Scenario Options](scenario-options.md)
- [Story Cards Overview](../04-story-cards/story-cards-overview.md)

## Source References

- https://help.aidungeon.com/faq/story-cards
- https://help.aidungeon.com/faq/what-are-scenarios
