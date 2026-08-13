# Card Import/Export

> Story Cards can be exported to JSON and imported from JSON, enabling external creation, sharing, and backup.

## Overview

AI Dungeon supports importing and exporting Story Cards as JSON files. This enables:
- Creating cards using external tools (GPT-4, scripts, etc.)
- Sharing card libraries between Scenarios
- Backing up your cards
- Bulk card management

## Platform Limitation

Import/Export is **only available on web**. The native iOS and Android apps do not support this feature.

## Accessing Import/Export

1. Open a Scenario or Adventure in the editor (web only)
2. Navigate to the Details tab
3. Scroll to find "Story Cards" section
4. Look for Import/Export buttons at the bottom

## Export Format

Story Cards export as a JSON array:

```json
[
  {
    "keys": "Fairy",
    "value": "You are Larry, a fairy living in the kingdom of Larion...",
    "type": "class",
    "title": "Fairy",
    "description": "Optional notes about this card",
    "useForCharacterCreation": false
  }
]
```

### Export Field Mapping

| Export Field | Card Field |
|--------------|------------|
| `keys` | Triggers |
| `value` | Entry |
| `type` | Type |
| `title` | Name |
| `description` | Notes |
| `useForCharacterCreation` | Character Creator flag |

## Import Format

Import files must be valid JSON arrays with Story Card objects.

### Required Fields

Only two fields are strictly required:
- `keys` (Triggers)
- `value` (Entry)

### Optional Fields

- `type` - Defaults if not provided
- `title` - Sets the Name
- `description` - Sets Notes
- `useForCharacterCreation` - For Character Creator

### Minimal Valid Import

```json
[
  {
    "keys": "dragon,wyrm",
    "value": "Dragons are ancient creatures with scales and fire breath."
  }
]
```

## Import Behavior

### Full Replacement

**Warning**: Importing replaces ALL existing Story Cards with the imported set.

- Previous cards are deleted
- New cards from the file are created
- This is not a merge or append operation

### To Add Cards Without Losing Existing

1. Export your current cards
2. Add new cards to the exported JSON
3. Import the combined file

### Duplicate Handling

If the import file contains cards with identical keys AND types:
- Only the first card for each keys/type combination is used
- Subsequent duplicates are ignored

**Note**: Cards can share some keywords if the complete `keys` string differs:
- "dragon,red" and "dragon,blue" → Both allowed
- "dragon" and "dragon" → Second is ignored

## Creating Cards Externally

You can use external tools to generate cards:

### Using GPT-4 or Similar

1. Prompt the AI to generate cards in the JSON format
2. Validate the JSON
3. Import into AI Dungeon

### Using Scripts

Write scripts in any language to generate JSON:
- Process world-building documents
- Convert from other formats
- Batch generate based on templates

## Validation

Before importing:

1. **Valid JSON**: Use a validator like [jsonlint.com](https://jsonlint.com/)
2. **Array Structure**: Must be an array, not an object
3. **Required Fields**: Each card needs at least `keys` and `value`

If import fails:
- Check JSON syntax
- Verify array structure
- Look for missing required fields

## Use Cases

### Scenario Sharing

Export cards from one Scenario, import to another:
- Share card libraries between your Scenarios
- Build up reusable lore collections

### Backup

Export cards periodically:
- Protect against accidental deletion
- Maintain version history

### External Editing

For large card sets:
- Export to JSON
- Edit in a text editor or IDE
- Reimport when finished

### Batch Creation

For scenarios needing many cards:
- Generate cards programmatically
- Use templates and scripts
- Import the batch

## Related Documentation

- [Story Cards Overview](story-cards-overview.md)
- [Card Anatomy](card-anatomy.md)
- [Story Cards API](../01-scripting/api/story-cards-api.md)

## Source References

- https://help.aidungeon.com/story-cards-import-and-export
