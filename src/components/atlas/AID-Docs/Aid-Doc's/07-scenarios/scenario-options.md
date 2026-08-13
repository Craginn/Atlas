# Scenario Options

> Scenario Options create branching setup flows where players make choices that determine their Adventure's starting configuration.

## Overview

Scenario Options allow you to create multi-step selection processes before gameplay begins. Players choose from options at each level, drilling down until they reach the final Scenario that starts their Adventure. This is how AI Dungeon's Quick Start menu works internally.

## How Options Work

### Parent Scenario

The top-level Scenario:
- Prompt introduces the choices
- Options list available paths
- Doesn't start Adventures directly (if it has options)

### Sub-Scenarios

Each option is itself a Scenario:
- Has its own Prompt, Story Cards, etc.
- Can have further nested options
- The bottom level starts Adventures

### Selection Flow

1. Player sees parent Scenario's Prompt
2. Options are displayed (by Title)
3. Player selects an option
4. If that option has sub-options, repeat
5. Final selection's Prompt starts the Adventure

## Creating Options

1. Open parent Scenario editor
2. Scroll to Scenario Options section
3. Click "+ create new option"
4. New sub-Scenario is created
5. Edit the sub-Scenario with its own content

## Sub-Scenario Properties

Each option/sub-Scenario has:
- **Title**: Shown as the option label
- **Description**: Appears with the option (or as Adventure default)
- **Prompt**: Either introduces more options OR starts the Adventure
- **All other Scenario properties**: Story Cards, Plot Components, etc.

## What Transfers to Adventures

Only the **final selected Scenario** contributes to the Adventure:
- Its Prompt becomes the first action
- Its Story Cards are included
- Its Plot Components apply
- Its Scripts run

**Parent Scenarios contribute nothing** to the final Adventure. Information in parent Prompts is only seen during selection, not during play.

## Design Patterns

### Genre → Character

Level 1: Choose genre (Fantasy, Sci-Fi, Mystery)
Level 2: Choose character within that genre

### Setting → Role → Details

Level 1: Choose world/setting
Level 2: Choose role/class
Level 3: Choose specific background

### Simple Two-Level

Level 1: Introduce concept, offer variations
Level 2: Start Adventure

## Sharing Content Across Options

If multiple options need the same Story Cards or Plot Components:
- They must each include the content
- No automatic inheritance from parent
- Copy content to each sub-Scenario that needs it

## Example Structure

```
Fantasy Scenario (Parent)
├── Warrior (Option)
│   ├── Noble Knight (Final - starts Adventure)
│   └── Mercenary (Final - starts Adventure)
├── Mage (Option)
│   ├── Court Wizard (Final)
│   └── Hedge Mage (Final)
└── Rogue (Option)
    ├── Thief (Final)
    └── Assassin (Final)
```

## Best Practices

### Clear Option Titles

Titles are what players see:
- Make them descriptive
- Indicate what they'll get
- Keep consistent style

### Parent Prompt as Introduction

Use parent Prompt to set the stage:
- Explain the choice being made
- Set expectations
- Don't include gameplay content

### Complete Final Scenarios

Final-level sub-Scenarios need everything:
- Full Prompt with engaging opening
- All necessary Story Cards
- Appropriate Plot Components

### Test All Paths

Play through every option combination:
- Does each path work?
- Is content complete?
- Are experiences distinct?

## Limitations

- Can't dynamically change options based on player choices
- No random option selection
- Complex trees can be hard to maintain
- Parent content doesn't inherit downward

## Related Documentation

- [Scenario Structure](scenario-structure.md)
- [Character Creator](character-creator.md)
- [Opening and Setup](opening-and-setup.md)

## Source References

- https://help.aidungeon.com/faq/how-do-scenario-options-work
