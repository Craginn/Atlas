# Plot Essentials

> Plot Essentials (formerly "Memory") contains key story facts that should always be in context, positioned at the beginning to establish fundamental information.

## Overview

Plot Essentials holds critical information the AI should know throughout the adventure. Unlike Story Cards (triggered) or Author's Note (scene-specific), Plot Essentials is always in context and provides foundational story facts.

## Position in Context

Plot Essentials appears:
- After AI Instructions
- Before Story Cards
- Near the beginning of context

This early position establishes facts before the AI sees the story text.

## What to Include

### Main Character

Essential protagonist details:
```
Protagonist: Elara, elven ranger, 150 years old. Skilled archer. 
Seeking the Sunstone to save her homeland. Distrusts magic-users 
due to past betrayal.
```

### Key Relationships

Important character connections:
```
Traveling with Marcus (human mage, childhood friend, secretly in love with Elara).
Hunted by Lord Varen (dark knight, serves the Shadow King).
```

### Core Setting

Fundamental world facts:
```
Setting: Kingdom of Larion, medieval fantasy. Magic is rare and feared.
Currently in the Misty Marshes, three days from the Crystal Caves.
```

### Active Plot Threads

Current goals and conflicts:
```
Goal: Reach Crystal Caves before full moon (4 days).
Complication: Lord Varen's scouts spotted yesterday.
```

## Writing Guidelines

### Information Density

Pack maximum meaning into minimum words:
- Use sentence fragments if clearer
- Abbreviate where obvious
- Focus on facts, not prose

### Update as Story Evolves

Plot Essentials should reflect current story state:
- Add new important facts
- Remove obsolete information
- Update character states

### Avoid Redundancy

Don't repeat information from:
- AI Instructions (behavioral rules)
- Story Summary (plot overview)
- Active Story Cards

### Prioritize

Put most critical information first and last:
- Beginning and end get more attention
- Middle content may be trimmed if space is tight

## Formatting Examples

### Structured Format

```
SETTING: Medieval fantasy kingdom of Larion
PROTAGONIST: Elara, elven ranger, seeking Sunstone
COMPANION: Marcus, human mage, loyal but hiding something
ANTAGONIST: Lord Varen, hunting the party for the Shadow King
CURRENT: Traveling through Misty Marshes, 3 days to goal
```

### Narrative Format

```
Elara is an elven ranger on a quest for the Sunstone in the kingdom 
of Larion. She travels with Marcus, a human mage and childhood friend. 
Lord Varen hunts them on behalf of the Shadow King. They are currently 
crossing the Misty Marshes with three days until they reach the 
Crystal Caves.
```

Both work. Choose what fits your scenario.

## Script Access

Scripts can set Plot Essentials via:
```
state.memory.context = "Updated plot essentials content here.";
```

This takes priority over UI-configured Plot Essentials.

**Note**: The API uses "context" (legacy term) while the UI uses "Plot Essentials."

## Plot Essentials vs. Story Cards

| Plot Essentials | Story Cards |
|-----------------|-------------|
| Always in context | Only when triggered |
| Best for essential facts | Best for conditional lore |
| Limited space | Many cards possible |
| Beginning of context | After Plot Essentials |

**Rule of thumb**: If the AI should ALWAYS know it, use Plot Essentials. If the AI only needs it when mentioned, use Story Cards.

## Plot Essentials vs. Story Summary

| Plot Essentials | Story Summary |
|-----------------|---------------|
| Static key facts | Dynamic plot overview |
| Manually maintained | Can be auto-summarized |
| Character/setting info | Event sequence |

Use both: Plot Essentials for constants, Story Summary for what's happened.

## Length Considerations

Plot Essentials competes for context space:
- Required Elements are capped at 70%
- Longer Plot Essentials = less history
- Keep it focused and essential

For complex scenarios, use Story Cards for detail and Plot Essentials for core facts only.

## Related Documentation

- [Plot Components Overview](plot-components-overview.md)
- [AI Instructions](ai-instructions.md)
- [Context Optimization](../02-context/context-optimization.md)

## Source References

- https://help.aidungeon.com/faq/plot-essentials
- https://help.aidungeon.com/faq/plot-components
