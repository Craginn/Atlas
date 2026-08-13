# How AI Dungeon Works

> AI Dungeon generates story content by sending assembled context to large language models and processing their responses for display to players.

## Overview

AI Dungeon's generation pipeline transforms player input into AI-generated story content through a multi-stage process. Understanding this pipeline is essential for creating effective scenarios, writing useful Plot Components, and developing scripts that enhance gameplay.

The system acts as an intermediary between players and AI language models, handling context management, formatting, and response processing.

## Generation Pipeline

### Stage 1: Player Input Capture

When a player submits an action, the system captures:
- The input text
- The input mode (Do, Say, Story, or See)
- The player identity (for multiplayer)

For Do and Say modes, automatic formatting is applied:
- **Do**: Prepends "You" and converts I/me/my/mine to you/your
- **Say**: Wraps text in dialogue formatting

### Stage 2: Script Processing (onInput)

If the scenario has scripts, the `onInput` hook executes. Scripts can:
- Modify the input text
- Set the `stop` flag to prevent AI generation
- Update state variables
- Display messages to the player

### Stage 3: Context Assembly

The system compiles all relevant information into a context window. This is the most complex stage, involving:

1. **Required Elements** (capped at 70% of context):
   - AI Instructions
   - Plot Essentials
   - Story Summary
   - Author's Note
   - Front Memory
   - Last Action

2. **Dynamic Elements** (remaining 30%):
   - Triggered Story Cards (~25%)
   - Adventure History (~50%, or 75% if Memory Bank disabled)
   - Retrieved Memories from Memory Bank (~25%)

Elements are assembled in a specific order and trimmed if they exceed allocation limits.

### Stage 4: Script Processing (onModelContext)

The `onModelContext` hook allows scripts to modify the assembled context before it's sent to the AI. Scripts can:
- Inject additional context
- Remove or replace sections
- Access context metadata (maxChars, memoryLength)

### Stage 5: AI Model Inference

The assembled context is sent to the selected language model. The model generates a continuation based on:
- The full context provided
- Generation parameters (temperature, top-p, etc.)
- Model-specific behavior characteristics

The response is generated token-by-token until:
- The response length limit is reached
- A natural stopping point is detected
- The model outputs a stop sequence

### Stage 6: Script Processing (onOutput)

The `onOutput` hook allows scripts to process the AI's response before display. Scripts can:
- Modify the output text
- Extract information for state updates
- Trigger side effects based on content

### Stage 7: Response Display

The processed output is:
- Added to the adventure history
- Displayed to the player(s)
- Made available for the next generation cycle

## Memory Creation (Background)

Parallel to the main generation pipeline, the Memory System operates:

- Every 4 actions (starting at action 8), the oldest 4 non-summarized actions are sent to a summarization model
- The resulting memory is stored in the Memory Bank
- Memories are embedded for semantic retrieval
- If Auto Summarization is enabled, the Story Summary is updated

## Generation Parameters

Players can adjust how the AI generates responses:

| Parameter | Effect |
|-----------|--------|
| Temperature | Controls randomness (higher = more creative/unpredictable) |
| Top-K | Limits choices to K most likely tokens |
| Top-P | Limits choices to tokens within cumulative probability P |
| Response Length | Maximum tokens in AI response |
| Context Length | Maximum tokens sent to AI |
| Repetition Penalty | Reduces probability of repeated tokens |

## Model Selection

AI Dungeon supports multiple models with different characteristics:
- Smaller models (8B-12B parameters): Faster, less expensive
- Medium models (24B-70B parameters): Balanced performance
- Large models (405B+ parameters): Highest capability, premium tier

The Dynamic model options automatically select appropriate models based on context.

## Related Documentation

- [Context Window Explained](context-window-explained.md)
- [Context Assembly Order](../02-context/context-assembly-order.md)
- [Generation Parameters](../06-ai-behavior/generation-parameters.md)

## Source References

- https://help.aidungeon.com/faq/how-are-ai-responses-generated
- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
- https://help.aidungeon.com/faq/what-are-advanced-settings
