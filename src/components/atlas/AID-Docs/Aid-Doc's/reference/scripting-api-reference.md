# Scripting API Reference

> Complete API reference for AI Dungeon scripting based on ScriptingTypes.js.

## Global Variables

### text

**Type**: `string`

**Description**: The primary text for the current hook

**By Hook**:
- onInput: Player's input text
- onModelContext: Assembled context
- onOutput: AI's generated response

**Return**: Must be returned in the return object

---

### stop

**Type**: `boolean`

**Description**: Flag to halt generation pipeline

**Default**: `false` / `undefined`

**Effect**: Prevents AI generation when `true`

---

### state

**Type**: `Object`

**Structure**:
```javascript
{
  memory: {
    context: string,      // Plot Essentials override
    authorsNote: string,  // Author's Note override
    frontMemory: string   // End-of-context injection
  },
  message: string,        // Player-visible message
  [key: string]: any      // Custom properties
}
```

**Persistence**: Survives across turns

---

### memory

**Type**: `Object`

**Structure**:
```javascript
{
  context: string,        // UI Plot Essentials
  [key: string]: any
}
```

**Priority**: `state.memory` overrides this

---

### info

**Type**: `Object` (read-only)

**Properties**:

| Property | Type | Hook | Description |
|----------|------|------|-------------|
| actionCount | number | All | Total actions |
| characters | array | All | Player names |
| maxChars | number | onModelContext | Max context chars |
| memoryLength | number | onModelContext | Memory char count |
| contextTokens | number | Varies | Context tokens |

---

### history

**Type**: `Array<Action>`

**Action Object**:
```javascript
{
  text: string,
  type: 'start' | 'continue' | 'do' | 'say' | 'story' | 'see' | 'repeat' | 'unknown',
  rawText: string  // Deprecated, same as text
}
```

**Order**: Chronological (oldest first)

---

### storyCards

**Type**: `Array<StoryCard>`

**StoryCard Object**:
```javascript
{
  id: string,
  title: string,              // Name field
  keys: string,               // Triggers field
  type: string,               // Type field
  entry: string,              // Entry field
  description: string,        // Notes field
  createdAt: string,
  updatedAt: string,
  useForCharacterCreation: boolean
}
```

---

## Global Functions

### addStoryCard(keys, entry, type?, name?, notes?, options?)

Creates a new Story Card and appends it to `storyCards`.

**Parameters**:
- `keys` (string): Triggers field (comma-separated).
- `entry` (string): Entry / content shown to the AI and players.
- `type` (string, optional): Card type. Default `"Custom"`.
- `name` (string, optional): Title / Name field. Defaults to `keys`.
- `notes` (string, optional): Notes → the card's `description`. Default `""`.
- `options` (object, optional): `{ returnCard?: boolean }`.

**Returns**: the new `storyCards.length` (a `number`) by default, or the created
card object when `options.returnCard` is `true`.

**Card shape written** (as read back by scripts):
```javascript
{ id, keys, entry, type, title, description, createdAt, updatedAt, useForCharacterCreation }
```

**Legacy Alias**: `addWorldEntry(keys, entry, type?)`

---

### updateStoryCard(index, keys, entry, type)

Updates an existing Story Card.

**Parameters**:
- `index` (number|string): Array index
- `keys` (string): New triggers
- `entry` (string): New content
- `type` (string): New type

**Returns**: `void`

**Throws**: Error if card doesn't exist

**Legacy Alias**: `updateWorldEntry(index, keys, entry)`

---

### removeStoryCard(index)

Removes a Story Card.

**Parameters**:
- `index` (number|string): Array index

**Returns**: `void`

**Throws**: Error if card doesn't exist

**Legacy Alias**: `removeWorldEntry(index)`

---

### log(...data)

Logs to console.

**Parameters**: Any values

**Returns**: `void`

**Aliases**: `console.log()`, `sandboxConsole.log()`

---

## Hooks

### onInput (Input Modifier)

**When**: After player input, before context assembly

**Available**: `text`, `state`, `info`, `history`, `storyCards`, `memory`, `stop`

**Return**: `{ text, stop? }`

---

### onModelContext (Context Modifier)

**When**: After context assembly, before AI

**Available**: All above + `info.maxChars`, `info.memoryLength`

**Return**: `{ text, stop? }`

---

### onOutput (Output Modifier)

**When**: After AI generation, before display

**Available**: `text`, `state`, `info`, `history`, `storyCards`, `memory`

**Return**: `{ text }`

---

## Return Object

All hooks must return an object:

```javascript
return { text };                    // Pass through
return { text: modifiedText };      // Modify
return { text, stop: true };        // Halt (onInput/onModelContext)
return { text: null, stop: true };  // Command processed
```

---

## Empty Text Behavior

| Hook | Empty Text Result |
|------|-------------------|
| onInput | "Unable to run scenario scripts" error |
| onModelContext | Uses original context |
| onOutput | "Script failed" error |

---

## Related Documentation

- [Hooks Overview](../01-scripting/api/hooks-overview.md)
- [Global Objects Reference](../01-scripting/reference/global-objects.md)
- [Quick Reference](quick-reference.md)
