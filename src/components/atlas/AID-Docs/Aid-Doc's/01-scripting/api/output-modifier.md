# Output Modifier (onOutput Hook)

> The onOutput hook processes AI-generated responses before display, enabling post-processing, information extraction, and response formatting.

## Overview

The Output Modifier executes after the AI has generated its response but before that response is displayed to the player and added to history. This hook enables post-processing of AI output, extraction of structured data, and formatting adjustments.

## Execution Context

**When**: After AI generation completes, before display to player

**Receives via `text`**: The AI's generated response

**Available Objects**:
- `text` - AI output
- `state` - Persistent state
- `info` - Adventure metadata
- `history` - Past actions (does not yet include current AI response)
- `storyCards` - Story Cards array
- `memory` - User memory object

## Return Value

**Pass through unchanged**:
```
return { text };
```

**Modify output**:
```
return { text: modifiedOutput };
```

**Empty string behavior**: Throws "A custom script running on this scenario failed. Please try again or fix the script."

## Important: State Changes

Changes made to `state.memory` during onOutput won't take effect until the next player action. The current turn's context has already been sent to the AI.

However, changes to other `state` properties (custom data) are persisted normally and available on the next turn.

## Common Use Cases

### Text Cleanup

Clean or format AI output:
- Remove unwanted patterns
- Fix common AI mistakes
- Normalize formatting
- Strip debug artifacts

### Information Extraction

Parse the AI output for structured data:
- Detect character names mentioned
- Extract locations visited
- Identify items acquired
- Track events occurred

### State Updates Based on Output

Update game state based on what the AI generated:
- If AI describes damage, update health
- If AI introduces a character, create a Story Card
- If AI mentions a location, track it

### Conditional Post-Processing

Apply different processing based on content:
- Different handling for combat vs. dialogue
- Scene-specific formatting
- Context-aware cleanup

## The stop Flag

Setting `stop: true` in onOutput:
- Changes the displayed output to literally "stop"
- This is not useful behavior
- Avoid using stop in onOutput

## Relationship to Story Cards

The onOutput hook is commonly used to automatically manage Story Cards based on AI output. When the AI introduces new elements:

1. Detect the new element in `text`
2. Call `addStoryCard()` to create a card
3. The card will be available for future turns

See the Auto-Cards mod (LewdLeah/Auto-Cards) for an implementation reference.

## Order of Operations

Within onOutput:
1. Script receives AI text
2. Script can read current history (without this response)
3. Script can modify text
4. Script can update state
5. Script returns modified text
6. Returned text is added to history
7. Returned text is displayed

## Error Handling

If onOutput throws an error:
- The player sees "A custom script running on this scenario failed"
- The unmodified AI output may or may not display (behavior varies)
- The adventure state may be inconsistent

Always ensure onOutput returns a valid text value.

## Related Documentation

- [Hooks Overview](hooks-overview.md)
- [Story Cards API](story-cards-api.md)
- [State Object](state-object.md)

## Source References

- https://help.aidungeon.com/scripting
