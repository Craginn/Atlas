# Memory Bank

> The Memory Bank stores memories and intelligently retrieves the most relevant ones for each AI generation.

## Overview

The Memory Bank is the "retrieval" half of the Memory System. While Auto Summarization maintains a high-level plot overview, the Memory Bank stores detailed memories and brings them back into context when they're relevant to the current action. This enables the AI to "remember" specific past events, characters, and details.

## How It Works

### Memory Storage

1. **Creation**: Every 4 actions, a new memory is created (same as Auto Summarization)
2. **Embedding**: The memory text is converted to a vector representation using an embedding model
3. **Storage**: Both the text and vector are stored in the Memory Bank

### Memory Retrieval

When generating an AI response:

1. **Current Action Embedding**: The most recent action is embedded (converted to vector)
2. **Similarity Comparison**: This vector is compared against all stored memory vectors
3. **Relevance Ranking**: Memories are ranked by semantic similarity
4. **Selection**: Top-ranked memories are included in context (up to allocation limit)

### Semantic Similarity

The retrieval system uses semantic meaning, not just keywords:

- "The knight drew his sword" and "Sir Galahad prepared his blade" would be similar
- Related concepts surface related memories
- This is more powerful than simple keyword matching

## Memory Bank Capacity

Different subscription tiers have different capacities:

| Tier | Capacity |
|------|----------|
| Free | 25 memories |
| Adventurer | 50 memories |
| Champion | 100 memories |
| Legend | 200 memories |
| Mythic | 400 memories |

## Forgetting

When the Memory Bank reaches capacity and a new memory is created:

1. **Usage Tracking**: The system tracks how often each memory has been used
2. **Selection**: The least-used memories are candidates for removal
3. **Removal**: Oldest among least-used memories are forgotten to make room

**Implications**:
- Frequently relevant memories persist longest
- Important recurring elements stay in the bank
- Obscure one-time events may be forgotten
- Very old but frequently used memories can survive indefinitely

## Context Integration

Memory Bank content appears in context:
- Position: After Story Summary, before History
- Allocation: ~25% of Dynamic Elements space
- Deduplication: Memories already in Story Summary aren't repeated

## Enabling Memory Bank

1. Open Adventure settings
2. Navigate to Gameplay → AI Models → Memory System
3. Toggle "Memory Bank" on

**Without Memory Bank**: History allocation increases to 75% of Dynamic Elements.

## Viewing Your Memories

The Context Viewer shows Memory Bank state:

**Used Memories**: Currently included in context
- Shows which memories were retrieved for the last generation
- Displays relevance ranking

**Stored Memories**: All memories in the bank
- Complete list of what's stored
- Creation timestamps
- Usage statistics

**Forgotten Memories**: Recently removed memories
- Memories removed due to capacity limits

## Timeline vs. Relevance View

In the Memory Viewer:

**Timeline View**: Shows memories in chronological order of creation

**Relevance View**: Shows memories ranked by relevance to the current action

## When Memories Start

Memories require actions to exist before they can be created:
- First memory: Created at action 8 (summarizing actions 1-4)
- Memory Bank retrieval: Begins when memories exist and adventure exceeds context

For short adventures, the full history fits in context and memories aren't needed.

## Relationship to Story Cards

Memory Bank and Story Cards serve different purposes:

| Feature | Story Cards | Memory Bank |
|---------|-------------|-------------|
| Content | World-building, lore | Event summaries |
| Activation | Keyword triggers | Semantic similarity |
| Creation | Manual or script | Automatic |
| Scope | Predefined information | Adventure-generated events |

Both can be active simultaneously—they complement each other.

## Limitations

**No Script Access**: Scripts cannot directly read or write Memory Bank content

**No Manual Creation**: You can't manually add memories to the bank

**Summarization Quality**: Memories are only as good as the summarization model's output

**Vector Quality**: Retrieval depends on embedding model accuracy

## Related Documentation

- [Memory System Overview](memory-system-overview.md)
- [Auto Summarization](auto-summarization.md)
- [Embeddings and Vectors](embeddings-and-vectors.md)

## Source References

- https://help.aidungeon.com/faq/the-memory-system
