# Required Elements

> Required Elements are context components that the system prioritizes for inclusion, capped at 70% of available context space.

## Overview

Required Elements are the foundational components of AI Dungeon's context. The system attempts to include them in full before allocating space to Dynamic Elements. If Required Elements exceed 70% of context, lower-priority items are trimmed or excluded.

## What Are Required Elements?

Required Elements include:

1. **AI Instructions** - Behavioral programming for the AI
2. **Plot Essentials** - Key story information (formerly "Memory")
3. **Story Summary** - Running plot summary (if Auto Summarization enabled)
4. **Author's Note** - Short-term narrative guidance
5. **Front Memory** - Script-injected end-of-context text
6. **Last Action** - The most recent player input

## Priority Order

When Required Elements must be trimmed (exceed 70% of context), they are prioritized:

| Priority | Element | Behavior |
|----------|---------|----------|
| 1 (Highest) | Front Memory | Always included in full |
| 2 | Last Action | Always included in full |
| 3 | Author's Note | High priority, trimmed if necessary |
| 4 | Plot Essentials | High priority, trimmed if necessary |
| 5 | AI Instructions | Medium priority, trimmed if necessary |
| 6 (Lowest) | Story Summary | Lower priority, may be excluded |

If an element doesn't fit in remaining space, it's trimmed from the end. Elements with lower priority than the one being trimmed are excluded entirely.

## Element Details

### AI Instructions

**Purpose**: Tell the AI how to behave, what style to use, what to avoid

**Position in Context**: Very beginning

**Best Practices**:
- Use clear, direct instructions
- Focus on behavior rather than specific content
- Keep reasonably concise to preserve space for story

**Examples of Content**:
- Writing perspective (first/second/third person)
- Genre and tone guidance
- Content restrictions
- Response formatting preferences

### Plot Essentials

**Purpose**: Provide key facts the AI should always know

**Position in Context**: After AI Instructions

**Best Practices**:
- Include only essential, always-relevant information
- Update as the story evolves
- Use concise, information-dense writing

**Examples of Content**:
- Main character description
- Central relationships
- Key setting details
- Ongoing plot threads

### Story Summary

**Purpose**: Maintain high-level plot awareness across long adventures

**Position in Context**: After Story Cards

**Source**: Auto Summarization (automatic) or manual entry

**Best Practices**:
- Let Auto Summarization handle it for most adventures
- Edit to correct errors or emphasize important points
- Keep focused on plot, not prose

### Author's Note

**Purpose**: Guide the immediate tone and style of AI output

**Position in Context**: Near end, just before Last Action

**Best Practices**:
- Keep short (3-4 sentences recommended)
- Use for current scene tone, not permanent rules
- Update as scenes change

**Examples of Content**:
- Genre cues: "dark fantasy, ominous atmosphere"
- Pacing: "action scene, fast-paced"
- Style: "descriptive prose, sensory details"

### Front Memory

**Purpose**: Inject hidden guidance at the strongest position

**Position in Context**: Very end, after Last Action

**Access**: Scripts only (`state.memory.frontMemory`)

**Notes**:
- Not visible in any UI
- Has maximum influence on next generation
- Use sparingly and intentionally

### Last Action

**Purpose**: The input the AI is responding to

**Position in Context**: After Author's Note

**Status**: Always included in full—cannot be trimmed

## The 70% Cap

Required Elements are capped at 70% of total context space to ensure room for Dynamic Elements (Story Cards, History, Memory Bank).

**Example with 4000-token context**:
- Required Elements cap: 2800 tokens
- Dynamic Elements space: 1200 tokens

If your Plot Essentials, AI Instructions, Author's Note, and other Required Elements total 2000 tokens, you have 800 tokens of headroom. If they total 3000 tokens, lower-priority elements will be trimmed to fit within 2800.

## Optimization Tips

1. **Be Concise**: Every token in Required Elements is one less for history
2. **Use Story Cards**: Move conditional information to Story Cards instead of Plot Essentials
3. **Avoid Redundancy**: Don't repeat the same information across elements
4. **Match to Context Size**: Larger context tiers can afford more detailed Required Elements

## Related Documentation

- [Context Assembly Order](context-assembly-order.md)
- [Dynamic Elements](dynamic-elements.md)
- [Allocation Rules](allocation-rules.md)
- [AI Instructions](../05-plot-components/ai-instructions.md)
- [Plot Essentials](../05-plot-components/plot-essentials.md)

## Source References

- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
- https://help.aidungeon.com/faq/plot-components
