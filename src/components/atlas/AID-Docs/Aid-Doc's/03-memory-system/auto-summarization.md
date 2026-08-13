# Auto Summarization

> Auto Summarization automatically maintains a running plot summary by periodically summarizing adventure content into the Story Summary.

## Overview

Auto Summarization is the "compression" half of the Memory System. It works by periodically taking chunks of adventure content and distilling them into concise summaries. These summaries are then appended to the Story Summary Plot Component, keeping the AI aware of overall story developments even as specific actions fall out of context.

## How It Works

### The Summarization Cycle

1. **Memory Creation**: Every 4 actions, the oldest 4 un-summarized actions are sent to a summarization AI model
2. **Memory Output**: The summarization model returns a condensed version highlighting key events
3. **Appending**: The new memory is appended to the Story Summary
4. **Re-Summarization**: When Story Summary gets too long, it's re-summarized to compress further

### Timeline Example

| Action # | Event |
|----------|-------|
| 1-4 | Adventure begins |
| 5-7 | More actions |
| 8 | First memory created (actions 1-4 summarized) |
| 9-11 | More actions |
| 12 | Second memory created (actions 5-8 summarized) |
| 16 | Third memory created (actions 9-12 summarized) |
| ... | Pattern continues every 4 actions |

### The 8-Action Buffer

Your most recent 4 actions are never summarized. This creates a buffer:
- Actions 1-4: Summarized at action 8
- Actions 5-8: Still in buffer at action 8
- Current 4 actions: Always preserved

This buffer allows editing/undoing recent actions without affecting memories.

## Story Summary Plot Component

Auto Summarization uses the Story Summary Plot Component to store its output.

**Adding Story Summary**:
1. In Scenario or Adventure editor
2. Click "+ Add Plot Component"
3. Select Story Summary

**Position in Context**: After Story Cards, before Memory Bank

**Manual Use**: You can manually write Story Summary content even without Auto Summarization—it's a standard Plot Component.

## Enabling Auto Summarization

1. Open Adventure settings
2. Navigate to Gameplay → AI Models → Memory System
3. Toggle "Auto Summarization" on

## Interaction with Editing

**Edits to Recent Actions**: If you edit your most recent 4 actions (the buffer), the changes are considered when those actions are eventually summarized.

**Edits to Older Actions**: Changes to actions already summarized do NOT automatically update the summary. You would need to manually edit the Story Summary.

**Undo/Redo**: Using Undo on recent actions (within the 4-action buffer) works normally. Undoing actions that have already been summarized doesn't remove the memory.

**Erase to Here**: Erasing to a point after summarization doesn't remove those summaries.

## Summary Quality

The summarization model:
- Extracts key plot points, character actions, and setting details
- Removes prose and descriptive flourishes
- Creates information-dense content

**Typical Summary Content**:
- Who did what
- Where events occurred
- Key dialogue or decisions
- Story-relevant outcomes

## Existing Adventures

When enabling Auto Summarization on an existing adventure:
- The system summarizes the last ~8000 tokens of content
- This creates an initial Story Summary
- Future summarization proceeds normally from that point

For very long existing adventures, you may want to manually write an initial summary for better coverage.

## Manual Editing

Even with Auto Summarization enabled, you can edit the Story Summary:

**Why Edit**:
- Correct summarization errors
- Emphasize important points the AI missed
- Remove irrelevant content
- Add context the summarizer didn't capture

**How Edits Persist**: Your edits ARE sent to the summarization AI when it re-summarizes. The model incorporates your changes into future summaries.

## Limitations

**Context Constraints**: The summarization model has its own context limit. Very long Story Summaries may lose early content during re-summarization.

**Summarization Quality**: AI summarization isn't perfect. Important details may occasionally be missed or mischaracterized.

**No Retroactive Updates**: Editing old actions doesn't update their summaries automatically.

## Related Documentation

- [Memory System Overview](memory-system-overview.md)
- [Memory Bank](memory-bank.md)
- [Story Summary Component](story-summary-component.md)

## Source References

- https://help.aidungeon.com/faq/the-memory-system
