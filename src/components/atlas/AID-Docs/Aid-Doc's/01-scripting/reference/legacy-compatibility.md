# Legacy Compatibility

> Documentation of deprecated API names and backward compatibility aliases for scripts written against older versions.

## Overview

The AI Dungeon scripting API has evolved over time. Some function and object names have changed to reflect updated platform terminology. The old names continue to work for backward compatibility but are deprecated and may be removed in future updates.

## Deprecated Function Names

### Story Card Functions

The term "World Entry" was the original name for what is now called "Story Cards." The API originally used `worldEntry` naming:

| Deprecated | Current | Status |
|------------|---------|--------|
| `addWorldEntry(keys, entry)` | `addStoryCard(keys, entry, type?)` | Works, deprecated |
| `updateWorldEntry(index, keys, entry)` | `updateStoryCard(index, keys, entry, type)` | Works, deprecated |
| `removeWorldEntry(index)` | `removeStoryCard(index)` | Works, deprecated |

**Notes**:
- The deprecated functions lack the `type` parameter available in current functions
- Both names work—calling `addWorldEntry` internally calls `addStoryCard`
- New scripts should use the `StoryCard` naming

### Logging Functions

| Deprecated | Current | Status |
|------------|---------|--------|
| `sandboxConsole.log()` | `log()` or `console.log()` | Works, deprecated |

**Notes**:
- All three logging methods work identically
- `console.log()` was added to match standard JavaScript conventions
- `log()` is the simplest form

## Deprecated Object Names

### worldEntries Array

Early documentation may reference a `worldEntries` array. This is the same as `storyCards`:

| Deprecated | Current |
|------------|---------|
| `worldEntries` | `storyCards` |

**Notes**: Check current API behavior—the `worldEntries` global may or may not be defined depending on platform version.

## Deprecated Property Names

### History Object

| Deprecated | Current | Status |
|------------|---------|--------|
| `rawText` | `text` | Works, deprecated |

**Notes**: The `rawText` property on history action objects is identical to `text`. It exists for backward compatibility with scripts that used the older property name.

## Terminology Changes

### World Info → Story Cards

The feature was renamed from "World Info" to "Story Cards" to better reflect its purpose:

| Old Term | Current Term |
|----------|--------------|
| World Info | Story Cards |
| World Entry | Story Card |
| World Info entries | Story Card entries |
| WI | SC (in community shorthand) |

### Memory → Plot Essentials

The UI feature "Memory" was renamed to "Plot Essentials," but the scripting API still uses `memory`:

| UI Name | API Name |
|---------|----------|
| Plot Essentials | `state.memory.context`, `memory.context` |

This is not deprecated—the API name `memory` is still correct.

## Migration Recommendations

### For Existing Scripts

Existing scripts using deprecated names will continue to work. However, consider updating:

1. Replace `addWorldEntry` with `addStoryCard`
2. Replace `updateWorldEntry` with `updateStoryCard`
3. Replace `removeWorldEntry` with `removeStoryCard`
4. Replace `sandboxConsole.log` with `log` or `console.log`
5. Use `text` instead of `rawText` on history objects

### For New Scripts

Always use current naming:
- `storyCards` for the array
- `addStoryCard`, `updateStoryCard`, `removeStoryCard` for functions
- `log()` or `console.log()` for logging
- `text` for history action content

## Version Detection

There is no built-in version detection in the scripting API. Scripts should be written to work with current API conventions.

If you need to support very old scripts, you can check for function existence:

```
if (typeof addStoryCard === 'function') {
  // Use current API
} else if (typeof addWorldEntry === 'function') {
  // Fall back to legacy API
}
```

## Related Documentation

- [Global Objects Reference](global-objects.md)
- [Story Cards API](../api/story-cards-api.md)
- [History Array](../api/history-array.md)

## Source References

- https://help.aidungeon.com/scripting
