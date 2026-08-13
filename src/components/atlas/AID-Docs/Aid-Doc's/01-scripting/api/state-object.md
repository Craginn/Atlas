# State Object

> The state object provides persistent storage across turns for custom script data and includes special memory properties that affect context assembly.

## Overview

The `state` object is the primary mechanism for scripts to store data that persists between turns. Unlike regular variables (which reset each turn), values stored in `state` survive across the entire adventure session.

The state object also contains the special `state.memory` sub-object and `state.message` property for interacting with the platform.

## Structure

```
state = {
  memory: {
    context: string,      // Plot Essentials override
    authorsNote: string,  // Author's Note override
    frontMemory: string   // Hidden end-of-context injection
  },
  message: string,        // Player-visible message
  // ... any custom properties
}
```

## state.memory

The `state.memory` object contains three special properties that affect context assembly:

### state.memory.context

**Purpose**: Replaces or supplements Plot Essentials

**Behavior**: Text set here appears where Plot Essentials would appear in context (beginning of context, after AI Instructions)

**Notes**: 
- Takes priority over UI-configured Plot Essentials if set
- Changes take effect on the next generation (not current turn if set in onOutput)

### state.memory.authorsNote

**Purpose**: Replaces or supplements Author's Note

**Behavior**: Text set here appears where Author's Note would appear (near end of context, before last action)

**Notes**:
- Takes priority over UI-configured Author's Note if set
- Commonly used for dynamic narrative guidance

### state.memory.frontMemory

**Purpose**: Inject hidden text at the very end of context

**Behavior**: Text set here appears after the last player action, at the very end of context

**Notes**:
- Not visible in the UI—only accessible via scripts
- Powerful position for immediate AI guidance
- Use sparingly as it has strong influence on generation

## state.message

**Purpose**: Display a message to the player

**Type**: string

**Behavior**: When set, the message is shown to the player (typically as an alert or notification)

**Common Uses**:
- Confirming command execution
- Displaying stats or status
- Error messages
- Game feedback

**Clearing**: Set to empty string or delete to clear

## Custom Properties

Any additional properties can be added to state for custom data:

```
state.playerHealth = 100;
state.inventory = ["sword", "potion"];
state.visitedLocations = { tavern: true, castle: false };
```

### Data Types

State can store:
- Strings
- Numbers
- Booleans
- Arrays
- Objects (nested structures)

### Serialization

State is serialized between turns. Complex objects with methods or circular references may not serialize properly. Stick to plain data structures.

## Initialization Pattern

Since state persists but may not have your properties on first run:

```
if (!state.hasOwnProperty('initialized')) {
  state.initialized = true;
  state.health = 100;
  state.inventory = [];
}
```

Or use nullish coalescing:
```
state.health = state.health ?? 100;
```

## Priority: state.memory vs memory Object

Two objects can affect memory-related context:
- `state.memory` (creator-defined, script-controlled)
- `memory` (user-defined, UI-controlled)

`state.memory` takes priority. If `state.memory.context` is set, it overrides the user's Plot Essentials.

## Timing Considerations

Changes to `state.memory` during different hooks:

| Hook | Effect |
|------|--------|
| onInput | Affects context assembly for current generation |
| onModelContext | Does NOT affect current turn (context already assembled) |
| onOutput | Affects next turn's generation |

For immediate context control in onModelContext, modify the `text` variable directly instead.

## Related Documentation

- [Hooks Overview](hooks-overview.md)
- [Info Object](info-object.md)
- [Plot Essentials](../../05-plot-components/plot-essentials.md)

## Source References

- https://help.aidungeon.com/scripting
