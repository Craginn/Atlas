# Voyage Platform

> Extracted from source code patterns - Medium confidence

## Overview

Voyage appears to be a separate product from AI Dungeon, running on the same platform. It is feature-flagged and has distinct functionality.

## Evidence of Separation

1. **Feature Flags**: `voyageEnabled`, `voyageFlag` control access
2. **Access Gate**: "Voyage Access Required" message with recheck functionality
3. **Separate Routes**: `/voyage`, `/world/...`, `/mod/...`
4. **Distinct Content Types**: `world`, `mod`, `voyageSave`
5. **Separate CDN**: `visuals.share.voyage` domain for Voyage assets

## Voyage-Specific Features

### Worlds
- Distinct from AI Dungeon scenarios
- Have their own edit flow (`/create/world/[shortId]/edit`)
- Support character creation (`/world/.../create-character`)
- Have "mods" that can extend them

### Save System
- `voyageSave` content type
- `slotNumber` property for save slots
- Distinct from adventure history

### Heroes System
Observable references to "Heroes" functionality:
- `heroesWorlds` - World listing
- `HeroesCommand` - Command system
- `HeroesLoadGame`, `HeroesSaveGame` - Save/load
- `HeroesRunAITask` - AI task execution
- `HeroesWebSocketServer` - Real-time communication
- `HeroesWorldConfig` - World configuration

## Feature Flag Checks

From code patterns:
```javascript
// Voyage content type filtering (reconstructed)
voyageEnabled && ("create" === screen || "profile" === screen)
    ? ["adventure", "scenario", "world", "mod"]
    : ["adventure", "scenario"]
```

## Image Delivery

Voyage uses its own Cloudflare image delivery:
- URL base: `https://visuals.share.voyage/cdn-cgi/imagedelivery/...`
- Distinct from AI Dungeon's `latitude-standard-pull-zone-1.b-cdn.net`

## Access Control

The Discover page shows an access gate for Voyage content:
- Checks `voyageFlag` 
- Shows "Voyage Access Required" if flag is false
- Provides "Recheck Access" button
- Filters `world` and `mod` content types when not enabled
