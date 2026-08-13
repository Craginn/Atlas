# Memory System Overview

> The Memory System automatically stores and retrieves key information from your adventure, helping the AI maintain continuity across long stories.

## Overview

The Memory System addresses a fundamental challenge in AI storytelling: language models have limited context windows and cannot "remember" information outside that window. As adventures grow longer, important details from early in the story fall out of context and are effectively forgotten.

Latitude designed the Memory System drawing inspiration from human memory, which uses both compression (remembering key points) and retrieval (recalling details when relevant). The Memory System implements both strategies through its two main features.

## Core Promise

AI Dungeon's core promise is that players can have ultimate freedom and that their choices truly matter. But if the AI forgets those choices after a few thousand tokens, the choices become meaningless. The Memory System ensures that important decisions, events, and details can influence the story even hundreds of actions later.

## Two Components

The Memory System consists of two complementary features:

### Auto Summarization

Maintains a running high-level overview of the story's plot through the Story Summary Plot Component.

**Purpose**: Keep the AI aware of overall story direction and major events

**How It Works**:
- Every 4 actions, the system summarizes recent content into a "memory"
- These memories are appended to the Story Summary
- When Story Summary gets long, it's re-summarized to stay concise

**Analogy**: Like how humans remember the gist of a book they read, not every word

### Memory Bank

Stores detailed memories and retrieves the most relevant ones for each generation.

**Purpose**: Recall specific details when they become relevant again

**How It Works**:
- Memories are stored with embedding vectors (numerical representations of meaning)
- When generating, the system finds memories most similar to the current action
- Relevant memories are included in context

**Analogy**: Like how seeing a photo triggers related memories

## How Memories Are Created

A memory is an AI-generated summary of 4 consecutive actions from your adventure.

**Creation Cycle**:
1. Adventure starts
2. Player takes actions
3. At action 8, actions 1-4 are summarized into first memory
4. At action 12, actions 5-8 are summarized into second memory
5. Pattern continues: new memory every 4 actions

**Why the 8-Action Delay**: Your most recent 4 actions are never summarized—they're still fresh in the regular history. This also allows you to edit/undo recent actions without affecting memories.

## Enabling the Memory System

Both features are **disabled by default**. To enable:

1. Open Adventure settings sidebar
2. Navigate to Gameplay → AI Models → Memory System
3. Toggle on Memory Bank and/or Auto Summarization

Once enabled for one adventure, the settings persist for all adventures until changed.

## Tier-Based Capacity

Memory Bank capacity varies by subscription tier:

| Tier | Memory Capacity |
|------|-----------------|
| Free | 25 memories |
| Adventurer | 50 memories |
| Champion | 100 memories |
| Legend | 200 memories |
| Mythic | 400 memories |

More capacity means more memories can be stored before old ones are forgotten.

## Interaction with Other Features

**Story Cards**: Work alongside memories—Story Cards provide triggered lore, memories provide recalled events

**Plot Essentials**: Remains in context always; memories are retrieved dynamically

**History**: The most recent history is always prioritized; memories fill in older relevant context

## When to Use the Memory System

**Best For**:
- Long adventures (100+ actions)
- Stories with recurring characters and locations
- Narratives where past events should influence present
- Adventures where continuity matters

**Optional For**:
- Short adventures
- One-shot scenarios
- Deliberately amnesiac narratives

## Related Documentation

- [Auto Summarization](auto-summarization.md)
- [Memory Bank](memory-bank.md)
- [Embeddings and Vectors](embeddings-and-vectors.md)
- [Story Summary Component](story-summary-component.md)

## Source References

- https://help.aidungeon.com/faq/the-memory-system
- https://latitude.io/blog/how-the-new-memory-system-works
