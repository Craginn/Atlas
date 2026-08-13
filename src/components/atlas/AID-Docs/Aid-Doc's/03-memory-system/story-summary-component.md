# Story Summary Component

> Story Summary is a Plot Component that holds a running summary of your adventure's plot, either manually written or automatically maintained.

## Overview

The Story Summary is a Plot Component designed to hold high-level plot information. It can be used in two ways:
1. **Manually**: Write your own summary of events
2. **Automatically**: Let Auto Summarization maintain it

Regardless of how it's populated, Story Summary provides the AI with plot context that persists across the adventure.

## Adding Story Summary

### In Scenarios

1. Open Scenario editor
2. Click "+ Add Plot Component"
3. Select Story Summary
4. Enter initial summary content (or leave blank for Auto Summarization)

### In Adventures

1. Open Adventure settings
2. Navigate to Plot Components
3. Add Story Summary
4. Enter or edit content

## Position in Context

Story Summary appears:
- After Story Cards
- Before Memory Bank
- As part of Required Elements (with lower priority)

## Manual Use

You can write and maintain Story Summary manually:

**Best For**:
- Scenario backstory that players should know
- Key events you want guaranteed in context
- Correcting or supplementing Auto Summarization

**Content Guidelines**:
- Focus on plot-relevant events
- Keep it information-dense
- Update as the story progresses
- Remove outdated information

**Example Manual Summary**:
```
Elara discovered the ancient map in Act 1. She recruited Marcus the mage 
in Thornwood Village. They learned the Crystal Caves hold the Sunstone. 
Lord Varen is hunting them. Currently traveling through the Misty Marshes.
```

## Auto Summarization Use

With Auto Summarization enabled:

1. Story Summary starts empty (or with your initial content)
2. Every 4 actions, new memories are appended
3. When it gets long, the system re-summarizes it
4. The process continues indefinitely

**Your Role**:
- Enable the feature
- Optionally provide initial content
- Optionally edit to correct errors

## Editing with Auto Summarization

Even with Auto Summarization on, you can edit:

**Your Edits Are Preserved**: The re-summarization model considers your edits. Your additions and corrections are incorporated into future summaries.

**When to Edit**:
- AI missed something important
- Summarization was inaccurate
- You want to emphasize something
- Outdated information should be removed

## Content Characteristics

**What Story Summary Contains**:
- Major plot events
- Character introductions and developments
- Location changes
- Key decisions and outcomes
- Story-relevant discoveries

**What It Doesn't Contain** (typically):
- Detailed descriptions
- Specific dialogue
- Atmospheric prose
- Minor events

## Token Considerations

Story Summary is part of Required Elements:
- Competes for the 70% cap
- Very long summaries reduce space for other elements
- Re-summarization helps control length

**Recommendation**: Trust the system's length management. Very long manual summaries may get trimmed.

## Comparison with Other Components

| Component | Purpose | Update Frequency |
|-----------|---------|-----------------|
| Story Summary | Running plot overview | Continuous |
| Plot Essentials | Static key facts | Rarely |
| Author's Note | Current scene guidance | Per scene |
| AI Instructions | Behavioral rules | Rarely |

## Scenarios: Pre-populating Summary

For scenarios, you might pre-populate Story Summary with:
- World history relevant to the plot
- Background events before gameplay starts
- Scenario-specific context

This gives the AI starting context even before the player takes actions.

## Without Story Summary

If you don't add Story Summary:
- No high-level plot tracking (unless you use Plot Essentials)
- Memory Bank still works independently
- History provides recent context
- Long adventures may lose plot coherence

## Related Documentation

- [Memory System Overview](memory-system-overview.md)
- [Auto Summarization](auto-summarization.md)
- [Plot Components Overview](../05-plot-components/plot-components-overview.md)

## Source References

- https://help.aidungeon.com/faq/the-memory-system
- https://help.aidungeon.com/faq/plot-components
