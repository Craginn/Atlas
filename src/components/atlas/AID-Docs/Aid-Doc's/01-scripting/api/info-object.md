# Info Object

> The info object provides read-only metadata about the current adventure and context, useful for scripts that need to adapt to adventure state.

## Overview

The `info` object contains read-only information about the adventure. Unlike `state`, scripts cannot modify `info`—it reflects the current state of the adventure as maintained by the platform.

## Properties

### info.actionCount

**Type**: number

**Description**: Total number of actions in the adventure

**Availability**: All hooks

**Use Cases**:
- Detecting first action (actionCount === 1)
- Triggering events at specific action counts
- Progress tracking

### info.characters

**Type**: Array of strings or objects with `name` property

**Description**: Characters in the adventure (primarily for multiplayer)

**Availability**: All hooks

**Structure**: 
```
// May be strings
["Player1", "Player2"]

// Or objects
[{ name: "Player1" }, { name: "Player2" }]
```

**Use Cases**:
- Multiplayer player tracking
- Character-specific logic
- Third Person mode integration

### info.maxChars

**Type**: number

**Description**: Estimated maximum characters that can fit in the model context

**Availability**: onModelContext hook only

**Notes**:
- Character-to-token ratio varies by content
- Use as an estimate, not exact limit
- Helpful for sizing injected content

### info.memoryLength

**Type**: number

**Description**: Number of characters included in context from memory (Plot Essentials)

**Availability**: onModelContext hook only

**Use Cases**:
- Calculating available space
- Balancing memory vs. history

### info.contextTokens

**Type**: number

**Description**: Total tokens in current context

**Availability**: Varies (may be available in onModelContext)

**Notes**: More precise than character estimates

## Hook Availability Summary

| Property | onInput | onModelContext | onOutput |
|----------|---------|----------------|----------|
| actionCount | Yes | Yes | Yes |
| characters | Yes | Yes | Yes |
| maxChars | No | Yes | No |
| memoryLength | No | Yes | No |
| contextTokens | Varies | Yes | Varies |

## Extended Properties

The info object may contain additional properties not documented here:

```
info = {
  actionCount: number,
  characters: array,
  maxChars?: number,
  memoryLength?: number,
  contextTokens?: number,
  [key: string]: unknown  // Additional undocumented properties
}
```

Use `console.log(info)` to inspect available properties in your specific context.

## Read-Only Nature

Attempts to modify info properties have no effect:
```
info.actionCount = 999;  // Does nothing
console.log(info.actionCount);  // Still shows actual count
```

## Common Patterns

### First Action Detection
```
if (info.actionCount === 1) {
  // Initialize state for new adventure
}
```

### Multiplayer Detection
```
if (info.characters && info.characters.length > 1) {
  // Multiplayer-specific logic
}
```

### Context Space Calculation (in onModelContext)
```
const usedChars = text.length;
const availableChars = info.maxChars - usedChars;
// Decide how much to inject based on available space
```

## Related Documentation

- [Hooks Overview](hooks-overview.md)
- [State Object](state-object.md)
- [History Array](history-array.md)

## Source References

- https://help.aidungeon.com/scripting
