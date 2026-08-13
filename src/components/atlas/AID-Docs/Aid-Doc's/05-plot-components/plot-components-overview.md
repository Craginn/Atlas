# Plot Components Overview

> Plot Components are persistent text elements that shape AI behavior, always included in context to guide story generation.

## Overview

Plot Components are powerful tools for guiding AI storytelling. Unlike Story Cards (which activate on triggers), Plot Components are always included in context. They establish behavioral rules, story facts, and narrative guidance that persist throughout the adventure.

## The Five Plot Components

| Component | Purpose | Position in Context |
|-----------|---------|---------------------|
| AI Instructions | Behavioral rules for the AI | Very beginning |
| Story Summary | Running plot overview | After Story Cards |
| Plot Essentials | Key story facts | Beginning (after AI Instructions) |
| Author's Note | Short-term tone/style guidance | Near end (before last action) |
| Third Person | Character name handling | N/A (affects formatting) |

## Adding Plot Components

Plot Components can be added to:
- **Scenarios**: Set up for all Adventures using the Scenario
- **Adventures**: Customized per playthrough

### How to Add

1. Open Scenario or Adventure editor
2. Look for Plot Components section
3. Click "+ Add Plot Component"
4. Select the component type
5. Enter content

## Context Behavior

Plot Components are part of Required Elements:
- Prioritized for inclusion (up to 70% of context)
- Always present unless trimmed for space
- Information here is available to the AI every generation

## Comparison Chart

| Component | When to Use | Content Type | Update Frequency |
|-----------|-------------|--------------|------------------|
| AI Instructions | Always | Behavioral directives | Rarely |
| Story Summary | Long adventures | Plot events | Continuous |
| Plot Essentials | Always | Key facts | Occasionally |
| Author's Note | Always | Tone/style | Per scene |
| Third Person | Multiplayer | N/A | Once |

## Plot Components vs. Story Cards

| Aspect | Plot Components | Story Cards |
|--------|-----------------|-------------|
| In context | Always | When triggered |
| Best for | Essential info | Conditional lore |
| Space impact | Constant | Variable |
| Control | Full text | Entry only |

Use Plot Components for information the AI should always know. Use Story Cards for information only relevant when mentioned.

## Gameplay Without Plot Components

Plot Components are optional. Without them:
- The AI relies on recent history alone
- No persistent behavioral guidance
- No guaranteed memory of key facts
- Works fine for casual play

With Plot Components:
- More consistent AI behavior
- Better story coherence
- More control for creators
- Essential for complex scenarios

## Scripting Integration

Scripts can modify Plot Components via `state.memory`:
- `state.memory.context` → Plot Essentials
- `state.memory.authorsNote` → Author's Note
- `state.memory.frontMemory` → Hidden end injection

This allows dynamic content that persists across turns.

## Deprecated: Banned Words

The Banned Words feature has been deprecated. Use AI Instructions to guide the AI away from unwanted words or topics. AI Instructions are more effective across modern models.

## Related Documentation

- [AI Instructions](ai-instructions.md)
- [Plot Essentials](plot-essentials.md)
- [Author's Note](authors-note.md)
- [Third Person Mode](third-person-mode.md)
- [Story Summary Component](../03-memory-system/story-summary-component.md)

## Source References

- https://help.aidungeon.com/faq/plot-components
