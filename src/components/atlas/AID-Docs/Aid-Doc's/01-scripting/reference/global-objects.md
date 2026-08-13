# Global Objects Reference

> Complete reference of all global objects, variables, and functions available in AI Dungeon scripts.

## Overview

AI Dungeon scripts execute in a sandboxed JavaScript environment with predefined global objects. This document provides a comprehensive reference of all available globals.

## Global Variables

### text

**Type**: string (varies by hook)

**Description**: The primary text being processed by the current hook

**Hook Context**:
| Hook | Content |
|------|---------|
| onInput | Player's input text |
| onModelContext | Assembled context string |
| onOutput | AI's generated response |

**Return Behavior**: Must be returned in the return object. Empty string has special behavior per hook.

---

### stop

**Type**: boolean

**Description**: Flag to halt the generation pipeline

**Default**: false (or undefined)

**Behavior When True**:
- onInput: Shows "Unable to run scenario scripts"
- onModelContext: Shows "AI is stumped" error
- onOutput: Output becomes literal "stop"

---

### state

**Type**: Object

**Description**: Persistent storage across turns

**Structure**:
```
{
  memory: {
    context?: string,       // Plot Essentials override
    authorsNote?: string,   // Author's Note override
    frontMemory?: string    // End-of-context injection
  },
  message?: string,         // Player-visible message
  [key: string]: unknown    // Custom properties
}
```

**Persistence**: All properties persist for the adventure's lifetime

**Priority**: state.memory takes priority over the memory object

---

### memory

**Type**: Object

**Description**: User-defined memory (lower priority than state.memory)

**Structure**:
```
{
  context?: string,         // Plot Essentials (from UI)
  [key: string]: unknown
}
```

**Notes**: Reflects UI-configured Plot Essentials. state.memory.context overrides this.

---

### info

**Type**: Object (read-only)

**Description**: Adventure metadata

**Properties**:
| Property | Type | Availability | Description |
|----------|------|--------------|-------------|
| actionCount | number | All hooks | Total actions in adventure |
| characters | array | All hooks | Player/character names |
| maxChars | number | onModelContext | Max characters for context |
| memoryLength | number | onModelContext | Characters used by memory |
| contextTokens | number | Varies | Total context tokens |

---

### history

**Type**: Array of Action objects

**Description**: Chronological record of adventure actions

**Action Object**:
```
{
  text: string,
  type: 'start' | 'continue' | 'do' | 'say' | 'story' | 'see' | 'repeat' | 'unknown',
  rawText: string  // Deprecated, same as text
}
```

**Order**: Oldest first, newest last

---

### storyCards

**Type**: Array of StoryCard objects

**Description**: All Story Cards in the adventure

**StoryCard Object**:
```
{
  id: string,
  title?: string,
  keys?: string,
  type?: string,
  entry?: string,
  description?: string,
  createdAt?: string,
  updatedAt?: string,
  useForCharacterCreation?: boolean
}
```

## Global Functions

### addStoryCard(keys, entry, type?)

**Description**: Creates a new Story Card

**Parameters**:
- `keys` (string, required): Trigger keywords, also sets title
- `entry` (string, required): Card content
- `type` (string, optional): Card type, default "Custom"

**Returns**: number (new array length) or false if duplicate keys

**Legacy Alias**: `addWorldEntry(keys, entry)`

---

### updateStoryCard(index, keys, entry, type)

**Description**: Updates an existing Story Card

**Parameters**:
- `index` (number|string, required): Array index
- `keys` (string, required): New triggers
- `entry` (string, required): New content
- `type` (string, required): New type

**Returns**: void

**Throws**: Error if card doesn't exist

**Legacy Alias**: `updateWorldEntry(index, keys, entry)`

---

### removeStoryCard(index)

**Description**: Removes a Story Card

**Parameters**:
- `index` (number|string, required): Array index

**Returns**: void

**Throws**: Error if card doesn't exist

**Legacy Alias**: `removeWorldEntry(index)`

---

### log(...data)

**Description**: Logs to console for debugging

**Parameters**: Any number of arguments

**Returns**: void

**Aliases**: `console.log()`, `sandboxConsole.log()` (deprecated)

## Return Object

All hooks must return an object:

```
return { text };           // Minimum
return { text, stop };     // With stop flag
return { text: modified }; // Modified text
```

## Related Documentation

- [Hooks Overview](../api/hooks-overview.md)
- [State Object](../api/state-object.md)
- [Legacy Compatibility](legacy-compatibility.md)

## Source References

- https://help.aidungeon.com/scripting
