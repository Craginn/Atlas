# Context Window Explained

> The context window is the total amount of information an AI model can consider when generating a response, measured in tokens.

## Overview

Every AI language model has a finite context window—a limit on how much text it can process at once. When you play AI Dungeon, only a portion of your adventure's total content can be sent to the AI for each generation. Understanding context windows is crucial for crafting effective adventures, scenarios, and scripts.

The context window determines what the AI "knows" when generating its next response. Information outside the context window is effectively invisible to the AI for that generation.

## Why Context Matters

### The Forgetting Problem

As adventures grow longer, older content falls outside the context window. Without intervention, the AI would:
- Forget character names and traits
- Lose track of established locations
- Ignore earlier plot points
- Contradict previously established facts

AI Dungeon addresses this through multiple systems:
- **Story Cards**: Triggered information that re-enters context when relevant
- **Plot Essentials**: Persistent information always in context
- **Memory System**: Summarized memories retrieved by semantic similarity
- **Story Summary**: Running summary of plot developments

### Context as Real Estate

Context space is a limited resource. Everything sent to the AI competes for this space:
- Longer Plot Essentials means less room for history
- Many active Story Cards reduces history space
- Detailed memories displace older actions

Effective context management balances richness of information against recency of events.

## Context Allocation

AI Dungeon divides context into two categories:

### Required Elements (70% cap)

These elements are prioritized and included in full when possible:
1. **Front Memory** - Always included
2. **Last Action** - Always included
3. **Author's Note** - High priority
4. **Plot Essentials** - High priority
5. **AI Instructions** - Medium priority
6. **Story Summary** - Lower priority

If Required Elements exceed 70% of context, lower-priority items are trimmed or excluded.

### Dynamic Elements (remaining ~30%)

These elements fill remaining space:
- **Story Cards**: ~25% of dynamic space
- **History**: ~50% of dynamic space (75% if Memory Bank disabled)
- **Memory Bank**: ~25% of dynamic space

## Context Length by Tier

Different subscription tiers have different maximum context lengths:

| Tier | Base Context |
|------|--------------|
| Free | Limited |
| Champion | Standard |
| Legend | Large |
| Mythic | Maximum (up to 128K on select models) |

Some models support larger contexts than others. The actual context used is the minimum of:
- Your tier's allowance
- The model's maximum capability
- Your configured context length setting

## Context Viewer

AI Dungeon provides a Context Viewer tool that shows:
- What elements are currently in context
- How many tokens each element consumes
- Which Story Cards are active
- Which memories are being used

The Context Viewer is essential for debugging and optimization.

## Optimization Strategies

### Keep Required Elements Concise
- Write dense, information-rich Plot Essentials
- Avoid redundancy between AI Instructions and Plot Essentials
- Use Story Summary for dynamic information, not static facts

### Design Smart Story Cards
- Use specific triggers to avoid over-activation
- Keep entries focused on essential information
- Prioritize information the AI will actually use

### Leverage the Memory System
- Enable Memory Bank for long adventures
- Let Auto Summarization handle historical details
- Edit Story Summary to correct or emphasize important points

### Match Context to Content
- Shorter context can mean faster, more focused responses
- Longer context helps with complex, information-dense scenarios
- Balance based on adventure complexity

## Related Documentation

- [Context Assembly Order](../02-context/context-assembly-order.md)
- [Required Elements](../02-context/required-elements.md)
- [Dynamic Elements](../02-context/dynamic-elements.md)
- [Context Optimization](../02-context/context-optimization.md)

## Source References

- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
- https://help.aidungeon.com/faq/what-are-advanced-settings
- https://help.aidungeon.com/faq/the-memory-system
