# Allocation Rules

> Detailed rules governing how context space is divided between Required Elements and Dynamic Elements.

## Overview

AI Dungeon uses a structured allocation system to ensure context includes both essential persistent information and relevant dynamic content. Understanding these rules helps creators and scripters optimize their content for the available space.

## The 70/30 Split

Context is divided into two pools:

| Pool | Maximum Allocation | Contents |
|------|-------------------|----------|
| Required Elements | 70% of context | AI Instructions, Plot Essentials, Story Summary, Author's Note, Front Memory, Last Action |
| Dynamic Elements | ~30% of context | Story Cards, History, Memory Bank |

**Important**: Required Elements don't always use their full 70%. If they only consume 50%, Dynamic Elements get the remaining 50%.

## Required Elements Allocation

### Priority Order

When Required Elements must fit within 70%, they're prioritized:

1. **Front Memory** - Always full
2. **Last Action** - Always full
3. **Author's Note** - Trimmed if necessary
4. **Plot Essentials** - Trimmed if necessary
5. **AI Instructions** - Trimmed if necessary
6. **Story Summary** - May be excluded

### Trimming Behavior

If an element exceeds remaining space:
- It's trimmed from the end
- Lower-priority elements are excluded entirely

**Example**:
- Context: 4000 tokens
- Required cap: 2800 tokens
- Front Memory + Last Action: 200 tokens
- Author's Note: 100 tokens
- Plot Essentials: 500 tokens
- AI Instructions: 600 tokens
- Story Summary: 800 tokens

Total Required: 2200 tokens (fits within 2800)

If Story Summary were 2000 tokens (total 3200), it would be trimmed to fit.

## Dynamic Elements Allocation

### Default Distribution

The ~30% for Dynamic Elements is subdivided:

| Element | Share of Dynamic Pool |
|---------|----------------------|
| Story Cards | ~25% |
| History | ~50% |
| Memory Bank | ~25% |

### Without Memory Bank

If Memory Bank is disabled:

| Element | Share of Dynamic Pool |
|---------|----------------------|
| Story Cards | ~25% |
| History | ~75% |

### Flexible Boundaries

These percentages are guidelines. The actual allocation adjusts based on:
- Available triggered Story Cards
- Length of adventure history
- Number of relevant memories

## Story Card Selection Algorithm

When determining which Story Cards to include:

1. **Trigger Window**: Evaluate recent actions for trigger matches
   - Minimum: 4 actions
   - If >500 tokens available: (tokens / 100) actions

2. **Scoring**: Cards ranked by:
   - Recency of trigger match
   - Frequency of trigger matches
   - Overall relevance

3. **Selection**: Include highest-ranked cards until allocation is filled

4. **Retention**: Once triggered, cards stay in context for multiple turns

## History Selection Algorithm

1. Start from most recent action
2. Add previous actions chronologically
3. Continue until:
   - History allocation is full, OR
   - Entire history is included

Oldest actions are naturally excluded as adventures grow.

## Memory Bank Selection Algorithm

1. **Embedding**: Convert recent action to vector representation
2. **Similarity**: Compare against all stored memory vectors
3. **Ranking**: Order memories by similarity score
4. **Selection**: Include top-ranked memories until allocation filled
5. **Deduplication**: Skip memories already present in Story Summary

## Practical Examples

### Short Adventure (100 actions, 4K context)

- Required Elements: 1500 tokens used
- Dynamic pool: 2500 tokens
  - Story Cards: ~625 tokens
  - History: ~1250 tokens
  - Memory Bank: ~625 tokens

With short history, full history might fit, leaving extra space.

### Long Adventure (1000 actions, 8K context)

- Required Elements: 2000 tokens used
- Dynamic pool: 6000 tokens
  - Story Cards: ~1500 tokens
  - History: ~3000 tokens
  - Memory Bank: ~1500 tokens

Only most recent ~50-100 actions in history, but Memory Bank retrieves relevant older content.

### Heavy Story Cards Scenario

If a scenario has many frequently-triggered Story Cards:
- More Story Card tokens consumed
- Less space for history
- Consider more specific triggers to reduce activation

## Context Length Impact

Higher subscription tiers provide more context, affecting allocation:

| Tier | Approx Context | Dynamic Pool (30%) |
|------|---------------|-------------------|
| Free | Limited | Small |
| Adventurer | Standard | Medium |
| Champion | Extended | Large |
| Legend | Large | Very Large |
| Mythic | Up to 128K | Massive |

Larger context means more history, more Story Cards, more memories.

## Related Documentation

- [Context Assembly Order](context-assembly-order.md)
- [Required Elements](required-elements.md)
- [Dynamic Elements](dynamic-elements.md)
- [Context Optimization](context-optimization.md)

## Source References

- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
