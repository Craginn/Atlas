# Story Cards API

> Scripts can programmatically create, update, and remove Story Cards using global functions and access the current cards via the storyCards array.

## Overview

The scripting API provides full programmatic control over Story Cards. Scripts can read existing cards, create new ones, modify cards, and remove cards. This enables dynamic world-building, automated character tracking, and adaptive storytelling.

## storyCards Array

The `storyCards` global variable is an array of all Story Cards in the current adventure.

### Story Card Object Structure

```
{
  id: string,                    // Unique identifier (usually numeric string)
  title: string,                 // NAME field in UI
  keys: string,                  // TRIGGERS field (comma-separated)
  type: string,                  // TYPE: Character, Class, Race, Location, Faction, Custom
  entry: string,                 // Main content (value when exported)
  description: string,           // NOTES field in UI
  createdAt: string,             // ISO timestamp (after creation)
  updatedAt: string,             // ISO timestamp (after update)
  useForCharacterCreation: boolean  // For character creator scenarios
}
```

### Accessing Cards

```
// All cards
const allCards = storyCards;

// First card
const firstCard = storyCards[0];

// Find by title
const card = storyCards.find(c => c.title === "Sir Theo");

// Find by keys containing a trigger
const card = storyCards.find(c => c.keys.includes("dragon"));

// Filter by type
const characters = storyCards.filter(c => c.type === "Character");
```

## addStoryCard()

Creates a new Story Card.

### Signature

```
addStoryCard(keys, entry, type?) → number
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| keys | string | Yes | Trigger keywords (also sets title) |
| entry | string | Yes | Main card content |
| type | string | No | Card type (default: "Custom") |

### Returns

The new length of the storyCards array (number).

### Behavior

- Creates a new Story Card with the provided values
- Sets both `keys` and `title` to the `keys` parameter value
- If a card with identical keys already exists, returns `false`
- The new card is appended to storyCards

### Legacy Alias

`addWorldEntry(keys, entry)` works for backward compatibility but is deprecated.

## updateStoryCard()

Updates an existing Story Card.

### Signature

```
updateStoryCard(index, keys, entry, type) → void
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| index | number or string | Yes | Index in storyCards array |
| keys | string | Yes | New trigger keywords |
| entry | string | Yes | New card content |
| type | string | Yes | New card type |

### Behavior

- Replaces the card at the specified index
- Throws an error if the card doesn't exist
- Updates the `updatedAt` timestamp

### Legacy Alias

`updateWorldEntry(index, keys, entry)` works for backward compatibility but is deprecated.

## removeStoryCard()

Removes a Story Card.

### Signature

```
removeStoryCard(index) → void
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| index | number or string | Yes | Index in storyCards array |

### Behavior

- Removes the card at the specified index
- Throws an error if the card doesn't exist
- Remaining cards shift to fill the gap (indexes change!)

### Legacy Alias

`removeWorldEntry(index)` works for backward compatibility but is deprecated.

## Common Patterns

### Find and Get Card
```
function getStoryCard(keys, entry, type = 'Custom') {
  const card = storyCards.find(c => 
    c.entry === entry && 
    c.type === type && 
    (c.keys === keys || c.title === keys)
  );
  
  if (card) {
    return { 
      index: storyCards.indexOf(card), 
      card 
    };
  }
  
  return null;
}
```

### Find or Create Card
```
function getOrCreateCard(keys, entry, type = 'Custom') {
  let result = getStoryCard(keys, entry, type);
  
  if (!result) {
    addStoryCard(keys, entry, type);
    result = getStoryCard(keys, entry, type);
  }
  
  return result;
}
```

### Remove Card by Title
```
function removeCardByTitle(title) {
  const index = storyCards.findIndex(c => c.title === title);
  if (index !== -1) {
    removeStoryCard(index);
  }
}
```

### Update Card Content
```
function updateCardEntry(title, newEntry) {
  const index = storyCards.findIndex(c => c.title === title);
  if (index !== -1) {
    const card = storyCards[index];
    updateStoryCard(index, card.keys, newEntry, card.type);
  }
}
```

## Index Shifting Warning

When removing cards, array indexes shift. If removing multiple cards, process from highest index to lowest:

```
// WRONG - indexes shift after each removal
indicesToRemove.forEach(i => removeStoryCard(i));

// CORRECT - remove from end first
indicesToRemove
  .sort((a, b) => b - a)
  .forEach(i => removeStoryCard(i));
```

## Duplicate Keys Prevention

The `addStoryCard` function prevents exact duplicate keys. Two cards can have overlapping triggers as long as the complete `keys` string is different:
- "dragon" and "dragon" → Duplicate (prevented)
- "dragon,red" and "dragon,blue" → Allowed
- "dragon" and "dragon,fire" → Allowed

## Related Documentation

- [Story Cards Overview](../../04-story-cards/story-cards-overview.md)
- [Card Anatomy](../../04-story-cards/card-anatomy.md)
- [Hooks Overview](hooks-overview.md)

## Source References

- https://help.aidungeon.com/scripting
- https://github.com/LewdLeah/Auto-Cards (implementation reference)
