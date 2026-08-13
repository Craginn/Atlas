# Card Generation

> AI Dungeon can generate Story Card content using AI, streamlining the creation of characters, locations, and other story elements.

## Overview

While you can write Story Cards manually, AI Dungeon offers AI-assisted generation to help create cards quickly. The generator can create names, entries, and triggers based on your guidance.

## Accessing the Generator

1. Open Story Cards panel (in Scenario editor or Adventure)
2. Click to create a new Story Card
3. In the card editor, you'll see "Generate New" buttons

## Generator Settings

Before generating, configure settings in the "Generator Settings" tab:

### Use Beta Model

Toggle this on to use the latest fine-tuned model for generation. Recommended for better results.

### Speed Create Mode

When enabled, the "Finish" button becomes "Next," letting you save the current card and immediately create another of the same type. Useful for creating many cards quickly.

### Include Story Summary

When on, the generator considers your Story Summary when creating cards. This helps new cards fit the context of your existing story.

### Log Generation in Notes

When on, every AI generation (including retries) is saved to the card's Notes field. Useful for comparing options and picking the best parts.

### AI Instructions

Tell the generator what kind of card you want:
- Style and tone preferences
- Content guidelines
- Specific details to include or avoid

**Examples**:
- "Write in a noir style with short, punchy sentences"
- "Focus on creating morally ambiguous characters"
- "Describe a type of knight that uses unconventional weapons"

### Story Information

Provide key details about your story for context:
- Setting and lore
- Character relationships
- Relevant themes

The generator uses this to create cards that fit your world.

## Generating Cards

In the "Details" tab:

### Type Selection

Choose from: Character, Class, Race, Location, Faction, or Custom

The type influences the generator's output style.

### Name Generation

- Enter a name manually, OR
- Click "Generate New" to have AI create a name
- Generating a name also creates an Entry and Triggers automatically

### Entry Generation

- With a Name entered, click "Generate New" to create an Entry
- The generator uses the Name and your settings to write appropriate content

### Triggers

- If generated with Name, triggers are auto-populated
- You can edit or add triggers after generation

## Generation Tips

### Provide Context

The more context you give (via AI Instructions and Story Information), the better the results:
- Specify the genre and setting
- Mention relevant existing characters or locations
- Describe the role this element plays in your story

### Iterate

Generate multiple times and combine the best elements:
- With "Log Generation in Notes" on, all versions are saved
- Pick and combine the best descriptions, traits, and details

### Use Appropriate Types

Match the Type to what you're creating:
- Character for NPCs and PCs
- Location for places
- Faction for groups and organizations
- Custom for anything else

### Edit After Generation

AI-generated content is a starting point:
- Edit for accuracy to your vision
- Remove irrelevant details
- Add specific information the generator missed

## Example Generation Workflows

### Fantasy Character

1. Set AI Instructions: "Create a mysterious forest dweller"
2. Set Story Information: "High fantasy world, magic is rare and feared"
3. Type: Character
4. Generate Name → AI creates name, entry, and triggers
5. Edit entry to add specific plot-relevant details

### Sci-Fi Location

1. Set AI Instructions: "Design a bustling spaceport"
2. Set Story Information: "Far future, multiple alien species coexist"
3. Type: Location
4. Enter Name: "Nebula Nexus"
5. Generate Entry → AI writes description based on name
6. Review and edit

## Related Documentation

- [Story Cards Overview](story-cards-overview.md)
- [Card Anatomy](card-anatomy.md)
- [Card Best Practices](card-best-practices.md)

## Source References

- https://help.aidungeon.com/faq/story-cards
