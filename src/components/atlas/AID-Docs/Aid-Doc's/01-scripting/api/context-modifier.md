# Context Modifier (onModelContext Hook)

> The onModelContext hook intercepts the assembled context before it's sent to the AI, enabling context injection, modification, or replacement.

## Overview

The Context Modifier executes after the system has assembled all context elements (Plot Components, Story Cards, history, memories) but before this context is sent to the AI model. This hook provides the most direct control over what the AI "sees" for each generation.

## Execution Context

**When**: After context assembly, before AI model inference

**Receives via `text`**: The complete assembled context string

**Available Objects**:
- `text` - Full assembled context
- `state` - Persistent state
- `info` - Adventure metadata (includes maxChars, memoryLength)
- `history` - Past actions array
- `storyCards` - Story Cards array
- `memory` - User memory object
- `stop` - Halt flag

## Additional Info Properties

The onModelContext hook has access to extended `info` properties:

| Property | Type | Description |
|----------|------|-------------|
| `info.maxChars` | number | Estimated maximum characters that can fit in context |
| `info.memoryLength` | number | Characters used by memory/Plot Essentials |
| `info.contextTokens` | number | Total tokens in current context |

These values help scripts make informed decisions about content length.

## Return Value

**Pass through unchanged**:
```
return { text };
```

**Modify context**:
```
return { text: modifiedContext };
```

**Empty string behavior**: Returns context as if script didn't run (no error, uses original)

## Context Structure

The assembled context follows this order:

1. AI Instructions
2. Plot Essentials
3. Story Cards (triggered entries, prefixed with "World Lore:")
4. Story Summary
5. Memory Bank (retrieved memories)
6. History (recent actions)
7. Author's Note
8. Last Action
9. Front Memory
10. Buffer Tokens

When modifying context, be aware of this structure. Arbitrary modifications may disrupt the AI's understanding of the narrative format.

## Common Use Cases

### Context Injection

Add information to context that wouldn't otherwise be included:
- Dynamic lore based on game state
- Calculated values or statistics
- Conditional narrative guidance
- Real-time generated content

### Context Filtering

Remove or redact portions of context:
- Strip certain patterns
- Remove outdated information
- Reduce context size for specific purposes

### Context Replacement

Replace the entire context with custom-built content:
- Complete context overhaul
- Alternative formatting systems
- Specialized prompt engineering

### Context Analysis

Read and analyze context without modification:
- Debug context assembly
- Log context for review
- Gather metrics

## The stop Flag

Setting `stop: true` in onModelContext:
- Halts AI generation
- Displays "Sorry, the AI is stumped. Edit/retry your previous action, or write something to help it along."

This is rarely useful intentionally but may occur if a script determines generation should not proceed.

## State.memory Integration

Note that `state.memory.context`, `state.memory.authorsNote`, and `state.memory.frontMemory` affect context assembly *before* onModelContext runs. Changes to these in onModelContext won't affect the current generation—they'll apply to the next turn.

To modify context in the current turn, modify the `text` variable directly in onModelContext.

## Performance Considerations

Context manipulation involves string operations on potentially large text blocks:
- The context may be thousands of characters
- String operations are relatively fast but avoid excessive complexity
- Keep replacements and transformations efficient

## Related Documentation

- [Hooks Overview](hooks-overview.md)
- [Info Object](info-object.md)
- [Context Assembly Order](../../02-context/context-assembly-order.md)

## Source References

- https://help.aidungeon.com/scripting
