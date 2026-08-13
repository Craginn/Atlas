# Third Person Mode

> Third Person mode replaces "You" in Do and Say actions with character names, primarily useful for multiplayer adventures.

## Overview

Third Person is a Plot Component that changes how Do and Say actions are formatted. Instead of "You [action]," the system uses "[Character Name] [action]." This is primarily designed for multiplayer where multiple players need distinct character identities.

## How It Works

### Without Third Person

```
Player types: "draw my sword"
Result: "You draw your sword."
```

### With Third Person

```
Player types: "draw my sword"
Result: "Elara draws her sword."
```

The system substitutes the character name for "You" and adjusts pronouns accordingly.

## Pronoun Conversion

Third Person Mode performs automatic pronoun conversion based on the character:

### Second-Person to Third-Person Mapping

| Second Person | Third Person (Example: "Elara") |
|---------------|--------------------------------|
| You | Elara |
| your | her |
| yours | hers |
| yourself | herself |

The system infers gender from the character name or uses neutral pronouns when gender is ambiguous.

### Conversion Examples

**Do Mode Input**: "swing my sword at the enemy"
- Without Third Person: "You swing your sword at the enemy."
- With Third Person (Elara): "Elara swings her sword at the enemy."

**Say Mode Input**: "I won't surrender!"
- Without Third Person: 'You say "I won't surrender!"'
- With Third Person (Marcus): 'Marcus says "I won't surrender!"'

Note: Dialogue inside quotes is NOT converted—the character still speaks in first person ("I") as that's natural speech.

### Verb Conjugation

The system also adjusts verb conjugation:
- "You draw" → "Elara draws"
- "You are" → "Elara is"
- "You have" → "Elara has"

## Enabling Third Person

1. Open Scenario or Adventure editor
2. Add Plot Components
3. Select "Third Person"
4. Players are prompted to enter character names when starting

## Multiplayer Use Case

Third Person is primarily designed for multiplayer:

**Without Third Person (Multiplayer)**:
```
Player 1: "You draw your sword"
Player 2: "You cast a spell"
```
AI might confuse who "You" refers to.

**With Third Person (Multiplayer)**:
```
Player 1: "Marcus draws his sword"
Player 2: "Elena casts a spell"
```
Clear character distinction for the AI.

## Single-Player Use

You can use Third Person in single-player for:
- Playing as a named character (not "You")
- First-person perspective stories
- Stories about someone other than "You"

## Character Name Entry

When Third Person is enabled:
1. Player starts the Adventure
2. Prompted to enter character name
3. Name is used for all Do/Say actions
4. Name can be edited later through player settings

## Script Relevance

The `info.characters` array includes character names:
- In multiplayer, lists all player character names
- Useful for scripts tracking multiple players
- Format may be strings or objects with `name` property

## Affects Only Do and Say

Third Person only affects formatted input modes:
- **Do Mode**: "You [action]" → "[Name] [action]" with pronoun/verb conversion
- **Say Mode**: 'You say "[text]"' → '[Name] says "[text]"' (dialogue content unchanged)
- **Story Mode**: Unchanged (direct input, no formatting applied)
- **See Mode**: Unchanged (image generation)

This means if you want third-person narrative in Story Mode, you must write it yourself—the system won't convert pronouns in Story Mode.

## UI Behavior

With Third Person enabled:
- Player avatars may show character names
- Multiplayer shows distinct player identities
- The game menu displays character names

## When to Use

**Use Third Person When**:
- Creating multiplayer scenarios
- Player should be a specific named character
- Multiple protagonists need distinction

**Skip Third Person When**:
- Standard single-player with "You" perspective
- The player IS the character (not playing a named role)
- Simpler setup is preferred

## Technical Note

Third Person changes affect:
- How input is formatted before entering history
- What the AI sees as the action
- How actions display in the adventure log

It does not affect:
- How the AI generates responses
- Story Cards or Plot Components
- Script behavior (beyond `info.characters`)

## Related Documentation

- [Plot Components Overview](plot-components-overview.md)
- [Multiplayer Overview](../09-multiplayer/multiplayer-overview.md)

## Source References

- https://help.aidungeon.com/faq/plot-components
- https://help.aidungeon.com/faq/do-you-support-multiplayer
