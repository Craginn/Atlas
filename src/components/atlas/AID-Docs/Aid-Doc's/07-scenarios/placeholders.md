# Placeholders

> Placeholders are dynamic content markers that prompt players for input during Adventure setup, enabling customized experiences.

## Overview

Placeholders let Scenario creators include customizable elements that players fill in when starting an Adventure. This allows a single Scenario to adapt to player preferences for character name, gender, backstory, and other details.

## Basic Syntax

Placeholders use this format:
```
${Question text?}
```

When players start the Adventure, they see the question and provide an answer. Their answer replaces the placeholder in the Prompt.

## Example

**Scenario Prompt**:
```
You are ${What is your name?}, a ${What is your profession?} in the 
kingdom of Larion.
```

**Player Sees**:
- "What is your name?" → enters "Marcus"
- "What is your profession?" → enters "blacksmith"

**Resulting Adventure Start**:
```
You are Marcus, a blacksmith in the kingdom of Larion.
```

## Advanced Syntax

### Default Values

Provide a suggestion the player can accept or change:
```
${What is your name?|Marcus}
```

Player sees "Marcus" pre-filled but can change it.

### Multiple Choice Options

Give players specific options to choose from:
```
${What is your class?|Warrior|Mage|Rogue|Ranger}
```

Player selects from the provided list.

## Placeholder Locations

Placeholders function in:
- Scenario opening text (Prompt)
- Plot Essentials
- Author's Note
- Story Cards (titles, entries, and triggers)

They do **NOT** work in:
- AI Instructions
- The built-in Character Creator

## Resolution Order

Placeholders are asked in order as they appear across components:
1. Plot Essentials (first)
2. Scenario Opening text
3. Author's Note
4. Story Cards (last)

This order matters for nested placeholders—earlier placeholders must be resolved before later ones can reference them.

## Placeholder Reuse

If the **exact same placeholder text** appears multiple times, AI Dungeon asks the question once and reuses the answer everywhere.

Any difference in spelling, capitalization, or punctuation creates a separate prompt:
- `${Character name}` ≠ `${character name}` ≠ `${Character Name}`

Keep placeholder text exactly consistent for reuse.

## Nested Placeholders

Nested placeholders are supported, but dependencies must be resolved in order:
- The inner placeholder must be fully resolved before the outer one processes
- Later placeholders can reference earlier resolved values
- Earlier placeholders cannot reference later ones

If a placeholder contains unresolved placeholder syntax when processed, the unresolved text appears literally (broken substitution).

## Use Cases

### Character Customization

```
You are ${What is your name?}, a ${What is your gender?|male|female|other} 
${What is your race?|human|elf|dwarf} from ${Where are you from?}.
```

### Opening Variations

```
You wake up in a ${Where do you wake up?|forest|dungeon|tavern|castle}.
```

### Backstory Elements

```
Your greatest fear is ${What do you fear most?}. This has shaped your 
entire life since ${What happened to cause this fear?}.
```

## Best Practices

### Clear Questions

Write questions that are easy to understand:
- "What is your name?" ✓
- "Name?" (too terse)
- "Please enter the appellation by which..." (too complex)

### Useful Defaults

Provide defaults for common answers:
- Saves time for players who don't want to customize
- Shows the expected format

### Appropriate Choices

For multiple choice, offer meaningful options:
- Cover common preferences
- Keep list manageable (4-6 options)
- Allow custom entry when possible

### Test Placeholder Flow

Play through your Scenario:
- Are questions clear?
- Do answers make sense in context?
- Is the order logical?

## Integration with Story Cards

Placeholder values can affect how Story Cards trigger:
- If a player enters their name as "Elena"
- A Story Card with trigger "Elena" will activate

This creates dynamic personalization.

## Limitations

Placeholders are resolved at Adventure start:
- Answers are substituted into text
- No runtime re-prompting
- Changes require editing the Adventure

## Related Documentation

- [Scenario Structure](scenario-structure.md)
- [Opening and Setup](opening-and-setup.md)
- [Character Creator](character-creator.md)

## Source References

- https://help.aidungeon.com/faq/what-are-scenarios
- https://www.reddit.com/r/AIDungeon/comments/1psd1kp/placeholders_guide_using_for_scenario_creation/ (u/ppp47634)
