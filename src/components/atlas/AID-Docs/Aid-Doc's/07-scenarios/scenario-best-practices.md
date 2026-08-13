# Scenario Best Practices

> Guidelines for creating polished, engaging Scenarios that provide great player experiences.

## Overview

Creating effective Scenarios requires attention to writing quality, technical implementation, and player experience. These best practices help you create Scenarios that engage players and showcase AI Dungeon's capabilities.

## Writing Quality

### Evocative Openings

Start with impact:
- Immediately engaging content
- Establishes tone quickly
- Gives players something to react to

### Consistent Voice

Maintain style throughout:
- Prompt, Story Cards, and Plot Components should match
- Consistent perspective (usually second person)
- Unified tone

### Clear Information

Convey essential details:
- Players should understand their situation
- Key relationships and goals clear
- Setting rules established

### Avoid Walls of Text

Break up long content:
- Paragraph breaks
- Vary sentence length
- Mix description with dialogue/action

## Technical Implementation

### Story Card Coverage

Create cards for key elements:
- Main characters
- Important locations
- Core concepts/lore
- Recurring themes

### Trigger Testing

Verify triggers work:
- Play test and check Context Viewer
- Ensure important cards activate
- Fix overlapping or failing triggers

### Plot Essentials Focus

Keep Plot Essentials essential:
- Only always-relevant information
- Update guidance in Description for players
- Don't duplicate Story Card content

### Script Testing

If using scripts:
- Test all code paths
- Handle edge cases (first action, empty input)
- Provide meaningful feedback via state.message

## Player Experience

### Clear Player Agency

Help players understand options:
- What can they do?
- What role are they playing?
- What are their goals?

### Avoid Over-Specification

Let players define their character:
- Use placeholders for customization
- Don't force specific appearance/personality
- Accommodate player creativity

### Meaningful Choices

If using Scenario Options:
- Make options distinct and appealing
- Each path should feel viable
- No obviously "right" answer

### Quick Engagement

Get to gameplay fast:
- Don't bury the hook in backstory
- Establish conflict or interest early
- Let players take action quickly

## Quality Assurance

### Playtesting

Play your Scenario multiple times:
- From start as a new player
- Checking different paths/choices
- Verifying AI behavior

### Proofreading

Check for errors:
- Typos and grammar
- Consistency errors
- Missing information

### Feedback Gathering

Before wide release:
- Share with beta testers
- Gather feedback on experience
- Iterate based on input

## Metadata Quality

### Descriptive Title

Choose a title that:
- Indicates genre/type
- Is memorable and searchable
- Stands out in lists

### Informative Description

Description should include:
- What the Scenario is about
- What players will experience
- Any special features or notes

### Appropriate Tags

Add helpful tags:
- Genre (fantasy, sci-fi, mystery)
- Themes (combat, romance, exploration)
- Mood (dark, humorous, epic)

### NSFW Flagging

Mark mature content appropriately:
- Required for compliance
- Helps players find appropriate content
- Protects your Scenario from reports

## Advanced Techniques

### Interconnected Story Cards

Create card networks:
- Cards reference each other's triggers
- Related content surfaces together
- Rich, consistent world-building

### Dynamic Plot Components

Use scripts to update Plot Components:
- Evolving Plot Essentials based on state
- Context-appropriate Author's Notes
- Adaptive AI guidance

### Balanced Complexity

Match complexity to audience:
- Simple for casual players
- Complex for invested players
- Indicate complexity in Description

## Common Mistakes to Avoid

1. **Giant Prompt, No Story Cards**: Put stable lore in cards
2. **Empty Plot Components**: Provide AI guidance
3. **Untested Scripts**: Broken scripts ruin experience
4. **Vague Opening**: Players need context
5. **Overcomplicated Options**: Keep choices manageable
6. **Missing Character Information**: Key NPCs need cards

## Related Documentation

- [Scenario Structure](scenario-structure.md)
- [Opening and Setup](opening-and-setup.md)
- [Story Card Best Practices](../04-story-cards/card-best-practices.md)

## Source References

- https://help.aidungeon.com/faq/what-are-scenarios
