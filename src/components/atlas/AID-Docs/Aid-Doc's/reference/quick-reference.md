# Quick Reference

> One-page overview of AI Dungeon's core systems and features.

## Input Modes

| Mode | Purpose | Format |
|------|---------|--------|
| Do | Character actions | "You [action]" |
| Say | Character dialogue | 'You say "[text]"' |
| Story | Direct narrative | Exactly as typed |
| See | Image generation | Prompt for image |

## Context Assembly Order

1. AI Instructions
2. Plot Essentials
3. Story Cards (triggered)
4. Story Summary
5. Memory Bank
6. History
7. Author's Note
8. Last Action
9. Front Memory
10. Buffer Tokens

## Context Allocation

| Category | Allocation |
|----------|------------|
| Required Elements | Up to 70% |
| Dynamic Elements | ~30% |

**Dynamic Split**:
- Story Cards: ~25%
- History: ~50%
- Memory Bank: ~25%

## Plot Components

| Component | Position | Purpose |
|-----------|----------|---------|
| AI Instructions | Beginning | Behavioral rules |
| Story Summary | Beginning | Plot overview |
| Plot Essentials | Beginning | Key facts |
| Author's Note | Near end | Tone/style |
| Third Person | N/A | Name formatting |

## Story Card Anatomy

| Field | AI Sees | Player Sees |
|-------|---------|-------------|
| Type | No | Yes |
| Name | No | Yes |
| Entry | Yes (when triggered) | Yes |
| Triggers | No | Yes |
| Notes | No* | Yes |

*Notes shown in Character Creator

## Scripting Hooks

| Hook | When | Receives |
|------|------|----------|
| onInput | After player input | Player text |
| onModelContext | Before AI | Full context |
| onOutput | After AI | AI response |

## Key Global Objects

| Object | Purpose | Writable |
|--------|---------|----------|
| `state` | Persistent storage | Yes |
| `info` | Adventure metadata | No |
| `history` | Action array | No |
| `storyCards` | Cards array | Via functions |
| `text` | Current text | Yes |
| `stop` | Halt flag | Yes |

## Story Card Functions

```
addStoryCard(keys, entry, type?)
updateStoryCard(index, keys, entry, type)
removeStoryCard(index)
```

## state.memory Properties

| Property | Effect |
|----------|--------|
| `context` | Plot Essentials override |
| `authorsNote` | Author's Note override |
| `frontMemory` | End-of-context injection |

## Memory System

| Feature | Purpose |
|---------|---------|
| Auto Summarization | Updates Story Summary |
| Memory Bank | Semantic memory retrieval |

**Memory Capacity by Tier**:
- Free: 25 | Adventurer: 50 | Champion: 100 | Legend: 200 | Mythic: 400

## Generation Parameters

| Parameter | Effect |
|-----------|--------|
| Temperature | Creativity/randomness |
| Top-K | Limit to K most likely |
| Top-P | Probability threshold |
| Response Length | Output size |
| Context Length | Input size |

## Trigger Matching

- Case-insensitive
- Space-sensitive
- Substring matching ("cat" matches "cats")
- Comma-separated multiple triggers

## Placeholder Syntax

```
${Question?}
```

## Visibility Levels

| Level | Searchable | Shareable |
|-------|------------|-----------|
| Private | No | No |
| Unlisted | No | Yes (link) |
| Published | Yes | Yes |

## Related Documentation

- [Context Assembly Cheatsheet](context-assembly-cheatsheet.md)
- [Scripting API Reference](scripting-api-reference.md)
