# Input Modifier (onInput Hook)

> The onInput hook processes player input before context assembly, enabling command parsing, input transformation, and state updates.

## Overview

The Input Modifier executes immediately after a player submits an action, before any context is assembled or sent to the AI. This is the primary hook for implementing custom commands, validating input, and updating game state based on player actions.

## Execution Context

**When**: After player input is captured and formatted (Do/Say modes apply their formatting first)

**Receives via `text`**: The player's input string

**Available Objects**:
- `text` - Player input
- `state` - Persistent state
- `info` - Adventure metadata (actionCount, characters)
- `history` - Past actions array
- `storyCards` - Story Cards array
- `memory` - User memory object
- `stop` - Halt flag

## Return Value

The hook must return an object. Common patterns:

**Pass through unchanged**:
```
return { text };
```

**Modify input**:
```
return { text: modifiedText };
```

**Stop generation** (for commands):
```
return { text: null, stop: true };
```

## The stop Flag

Setting `stop: true` prevents AI generation from occurring. This is essential for command processing where you want to respond to the player without the AI generating content.

When stop is true:
- Context assembly is skipped
- AI generation does not occur
- The turn ends after onInput

To communicate with the player when stopping, use `state.message`:
```
state.message = "Command processed!";
return { text: null, stop: true };
```

## Empty Text Behavior

Returning an empty string (`""`) throws an error displayed to the player: "Unable to run scenario scripts."

To stop without error display, return `null` or the original text with `stop: true`.

## Common Use Cases

### Command Detection

Detect special commands in player input (commonly using `/` prefix or `{}` syntax):
- Check if input starts with command prefix
- Parse command and arguments
- Execute command logic
- Return with `stop: true` to prevent AI generation

### Input Transformation

Modify player input before it reaches the AI:
- Expand abbreviations
- Apply formatting rules
- Inject additional context
- Remove unwanted content

### State Updates

Update persistent state based on player actions:
- Track statistics
- Record player choices
- Manage inventory or resources
- Update character information

### Validation

Check player input for issues:
- Required formatting
- Restricted content
- Input length limits

## Text Variable Details

The `text` variable contains the player's input after mode-specific formatting:

| Mode | Input | `text` Value |
|------|-------|--------------|
| Do | "open door" | "You open door" |
| Say | "Hello" | 'You say "Hello"' |
| Story | "The door opens." | "The door opens." |

Note: The exact formatting may vary. Do mode converts first-person to second-person.

## Action Type Detection

Check `history[history.length - 1]` after the action is added, but during onInput the current action is not yet in history. To detect the current action type, you may need to infer from the text formatting or use other indicators.

## Error Handling

If your script throws an error:
- The error message is logged
- "Unable to run scenario scripts" is displayed to the player
- Generation may proceed with unmodified input (behavior may vary)

Wrap risky operations in try-catch blocks and ensure a return statement always executes.

## Related Documentation

- [Hooks Overview](hooks-overview.md)
- [State Object](state-object.md)
- [Info Object](info-object.md)

## Source References

- https://help.aidungeon.com/scripting
