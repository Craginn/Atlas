# Dynamic Elements

> Dynamic Elements fill the remaining context space after Required Elements, with flexible allocation based on relevance and availability.

## Overview

Dynamic Elements are context components that adapt to available space and current relevance. Unlike Required Elements (which are prioritized for full inclusion), Dynamic Elements are selected and sized based on what fits and what's most relevant to the current action.

## What Are Dynamic Elements?

Dynamic Elements include:

1. **Story Cards** - Triggered world-building information
2. **History** - Recent adventure actions
3. **Memory Bank** - Retrieved semantic memories

## Space Allocation

Dynamic Elements share approximately 30% of context (the space remaining after Required Elements).

**Default Distribution**:
| Element | Allocation |
|---------|------------|
| Story Cards | ~25% of dynamic space |
| History | ~50% of dynamic space |
| Memory Bank | ~25% of dynamic space |

**When Memory Bank Disabled**:
| Element | Allocation |
|---------|------------|
| Story Cards | ~25% of dynamic space |
| History | ~75% of dynamic space |

## Element Details

### Story Cards

**What's Included**: Entries from Story Cards whose triggers matched recent text

**Selection Criteria**:
- Recency of trigger matches
- Frequency of trigger matches
- Card priority (more recent/frequent matches rank higher)

**Trigger Matching Window**:
- Minimum 4 actions evaluated
- If >500 tokens available for Story Cards: (available_tokens / 100) actions evaluated
- Example: 900 tokens available → 9 actions evaluated

**Format in Context**: Each entry is prefaced with "World Lore:"

**Behavior**:
- Only triggered cards enter context
- Cards remain in context for multiple turns after triggering
- Number of included cards depends on match relevance and card length

### History

**What's Included**: Recent actions from the adventure, most recent first

**Selection Process**:
1. Start from most recent action
2. Add each previous action
3. Continue until space is exhausted or full history included

**Content**: Both player inputs and AI outputs are included

**Priority**: Most recent actions have highest priority

**Notes**:
- History provides narrative continuity
- Very old actions naturally fall out as adventures progress
- Use Story Cards and memories for information that should persist

### Memory Bank

**What's Included**: Memories retrieved based on semantic similarity

**Selection Process**:
1. Most recent action is embedded (converted to vector)
2. All stored memories are ranked by similarity to this vector
3. Most relevant memories are included up to allocation limit

**Deduplication**: If a memory's text already appears in Story Summary, it's not duplicated

**Prerequisites**:
- Memory Bank must be enabled in settings
- Adventure must have generated memories (starts at action 8)
- Subscription tier determines memory capacity

## Dynamic Sizing

Unlike Required Elements with fixed content, Dynamic Elements adapt:

**Fewer Story Cards Triggered** → More space for History
**Longer Story Summary** → Less dynamic space overall
**Short Adventure** → Full history fits, less need for memories

The system automatically balances these elements each generation.

## Context Viewer

Use the Context Viewer to see:
- Which Story Cards are currently in context
- How much history is included
- Which memories are being used
- Token counts for each element

This is invaluable for debugging and optimization.

## Optimization Strategies

### Story Cards
- Use specific triggers to avoid over-activation
- Keep entries concise—long cards crowd out history
- Design trigger networks that activate related cards together

### History
- Accept that old content will exit context
- Use Story Cards for facts that should persist
- Use memories for retrieving relevant old content

### Memory Bank
- Enable for longer adventures
- Higher subscription tiers = more memory capacity
- Let Auto Summarization handle memory creation

## Interaction with Scripts

Scripts can influence Dynamic Elements:

**Story Cards**: Create, update, or remove cards programmatically
**History**: Read-only access to full history via `history` array
**Memory Bank**: No direct script access, but affects what memories contain

The `onModelContext` hook sees the final assembled context including all Dynamic Elements.

## Related Documentation

- [Context Assembly Order](context-assembly-order.md)
- [Required Elements](required-elements.md)
- [Allocation Rules](allocation-rules.md)
- [Story Cards Overview](../04-story-cards/story-cards-overview.md)
- [Memory Bank](../03-memory-system/memory-bank.md)

## Source References

- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
- https://help.aidungeon.com/faq/story-cards
- https://help.aidungeon.com/faq/the-memory-system
