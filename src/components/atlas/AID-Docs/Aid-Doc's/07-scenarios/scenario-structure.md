# Scenario Structure

> Scenarios are templates containing prompts, Plot Components, Story Cards, and configuration that define the starting point for Adventures.

## Overview

A Scenario is a reusable template for starting new Adventures. When players "play" a Scenario, a new Adventure is created with all the Scenario's content and settings. This enables creators to design custom experiences that can be played repeatedly or shared with others.

## Scenario vs. Adventure

| Scenario | Adventure |
|----------|-----------|
| Template | Instance |
| Reusable | Unique playthrough |
| Created in editor | Created from Scenario |
| Static (until edited) | Evolves with play |

## Scenario Components

### Title

The name displayed in searches and My Stuff. Make it descriptive and searchable.

### Description

Detailed information about the Scenario:
- First lines appear in search results
- Later sections can contain instructions or notes
- AI does not see the Description

### Prompt

The initial text of the Adventure:
- Becomes the first action (type: "start")
- Sets up the opening situation
- Can be very long (the longer the better for setup)
- May contain placeholders for player input

### Plot Components

All Plot Components can be pre-configured:
- AI Instructions
- Plot Essentials
- Story Summary
- Author's Note
- Third Person mode

### Story Cards

Story Cards defined in the Scenario transfer to Adventures:
- Characters, locations, factions, lore
- All with triggers and entries
- Foundation for world-building

### Scenario Options

Optional branching setup (covered separately):
- Multiple paths/choices before gameplay
- Nested sub-scenarios

### Scripts

JavaScript code in four tabs:
- Library
- Input Modifier (onInput)
- Context Modifier (onModelContext)
- Output Modifier (onOutput)

Scripts only accessible via web.

### Tags

Keywords for discoverability in search.

### Configuration

Various settings:
- Visibility (Private, Unlisted, Published)
- NSFW flag
- Allow Comments
- Third Person default

## Creating a Scenario

1. Go to My Stuff → Scenarios tab
2. Click "Create Scenario"
3. Fill in components
4. Test by playing
5. Publish when ready

## What Transfers to Adventures

When a player starts an Adventure from your Scenario:

**Copied to Adventure**:
- Prompt (as first action)
- Plot Components
- Story Cards
- Scripts
- Title and Description (as defaults)
- AI settings configured in Scenario

**Not Copied**:
- Scenario metadata (author info, play counts)
- Comments
- Scenario Options structure (resolved to single path)

## Scenario as First Action

The Prompt becomes the Adventure's first action:
- Type is "start"
- Sets initial context
- Player takes next action

Unlike player actions, the Prompt doesn't trigger AI generation—it establishes the starting point.

## Quick Start vs. Custom Scenarios

AI Dungeon's built-in Quick Start options are themselves Scenarios:
- Fantasy, Mystery, Apocalyptic, etc.
- Use Scenario Options for branching setup
- Demonstrate Scenario capabilities

Custom Scenarios can be just as sophisticated.

## Related Documentation

- [Opening and Setup](opening-and-setup.md)
- [Placeholders](placeholders.md)
- [Scenario Options](scenario-options.md)
- [Publishing and Visibility](publishing-visibility.md)

## Source References

- https://help.aidungeon.com/faq/what-are-scenarios
