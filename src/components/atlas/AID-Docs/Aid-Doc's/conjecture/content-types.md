# Content Types

> Extracted from source code string literals - Medium confidence

## Observed Content Types

The following content type strings appear in the minified source:

| Content Type | Description (Inferred) |
|--------------|----------------------|
| `adventure` | A playthrough/story session |
| `scenario` | A template for starting adventures |
| `world` | A Voyage world (separate from AI Dungeon scenarios) |
| `mod` | A modification/extension for worlds |
| `voyageSave` | A saved game state in Voyage |

## Content Type Checks

From code patterns observed:

```javascript
// Routing logic (reconstructed from minified)
if (contentType === "voyageSave" || (!contentType && "slotNumber" in data)) {
    // Voyage save card
} else if (contentType === "world") {
    // World card
} else if (contentType === "mod") {
    // Mod card
} else {
    // Default scenario/adventure card
}
```

## Voyage vs AI Dungeon Content

The source distinguishes between:

**AI Dungeon content**: `adventure`, `scenario`
- Traditional text adventure format
- Uses Story Cards, Plot Components
- Standard play/read routes

**Voyage content**: `world`, `mod`, `voyageSave`
- Separate product on shared platform
- Feature-flagged (`voyageEnabled`, `voyageFlag`)
- Has its own route patterns (`/world/...`, `/mod/...`)
- Includes character creation (`/create-character`)
- Has "slots" for save games

## Content Filters

Observable filter options:
- `deleted` - Deleted content
- `saved` - Saved/bookmarked content

## Default Values

From string literals:
- Default scenario short ID referenced as `QUICKSTART_SHORT_ID`
- Default title: "New Adventure"
- Default image: `https://latitude-standard-pull-zone-1.b-cdn.net/site_assets/aidungeon/client/Dungeon.jpg`
