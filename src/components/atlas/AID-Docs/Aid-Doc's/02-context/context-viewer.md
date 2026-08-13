# Context Viewer

> The Context Viewer is a debugging tool that shows exactly what information is being sent to the AI for each generation.

## Overview

The Context Viewer provides transparency into AI Dungeon's context assembly. It displays which elements are included, their token counts, and which Story Cards and memories are active. This tool is essential for debugging scenarios, optimizing scripts, and understanding AI behavior.

## Accessing the Context Viewer

1. Open an Adventure
2. Access the settings sidebar (gear icon)
3. Navigate to debugging/developer options
4. Open Context Viewer

The Context Viewer shows the state as of the most recent AI generation.

## What the Context Viewer Shows

### Token Breakdown

A summary of token usage by category:
- Total context tokens used
- Space remaining in context
- Per-element token counts

### Required Elements

For each Required Element, you'll see:
- Whether it's included
- How many tokens it uses
- If it was trimmed

Elements displayed:
- AI Instructions
- Plot Essentials
- Story Summary
- Author's Note
- Last Action
- Front Memory (if set via script)

### Story Cards

A list of Story Cards currently in context:
- Card name/title
- Trigger that activated it
- Token count
- How recently triggered

Cards not in context (not triggered) are not shown.

### Memory Bank

Information about retrieved memories:
- Used Memories: Memories included in current context
- Stored Memories: All memories in the bank
- Forgotten Memories: Memories removed due to capacity

You can view:
- Memory content
- When it was created
- How often it's been used
- Relevance score to current action

### History

Details on history inclusion:
- Number of actions in context
- Token count for history
- Which actions are included vs. excluded

## Common Debugging Scenarios

### "Why doesn't the AI remember X?"

Check the Context Viewer:
1. Is the relevant Story Card triggered?
2. Is the information in history or excluded?
3. Is there a memory about it?
4. Is it in Plot Essentials or Story Summary?

If not in context, the AI doesn't see it.

### "A Story Card isn't triggering"

Check:
1. Is the trigger word appearing in recent actions?
2. Is the trigger case-correct (case-insensitive but space-sensitive)?
3. Are too many other Story Cards crowding it out?

### "Context seems too short"

Verify:
1. Your subscription tier's context limit
2. The model's context capability
3. Your configured Context Length setting
4. How much Required Elements are consuming

### "Memories aren't being used"

Check:
1. Is Memory Bank enabled?
2. Are there enough actions for memory creation (8+)?
3. Is your tier providing adequate memory capacity?
4. Are memories being created (check Stored Memories)?

## Using Context Viewer for Optimization

### Identify Waste

Look for:
- Very long Story Cards that could be condensed
- Redundant information across multiple elements
- Triggers that activate too frequently

### Balance Elements

Observe:
- How much of dynamic space Story Cards consume
- Whether history is getting crowded out
- If memories are contributing useful content

### Verify Script Effects

After implementing scripts:
- Confirm `state.memory.frontMemory` appears
- Verify Story Card creation/updates
- Check that context modifications apply

## Limitations

The Context Viewer shows:
- The state after context assembly
- Token counts (approximate)
- Element inclusion status

It does not show:
- The exact formatting sent to the model
- Token-level breakdown
- Real-time updates (must refresh/regenerate)

## Related Documentation

- [Context Assembly Order](context-assembly-order.md)
- [Context Optimization](context-optimization.md)
- [Story Cards Overview](../04-story-cards/story-cards-overview.md)
- [Memory Bank](../03-memory-system/memory-bank.md)

## Source References

- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
- https://help.aidungeon.com/faq/the-memory-system
