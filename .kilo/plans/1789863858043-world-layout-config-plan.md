# World Layout Configuration Plan

## Goal
Add a `World Layout` setting to RPG config that unifies world and dungeon structure:
- **Open** (default): world and dungeon structured openly — node-based world locations with dungeon integrated as special locations
- **Ascii Dungeon**: world and dungeon built as ASCII grid map (placeholder for now)

Game Mode determines default World Layout:
- `open-world` → `Open`
- `rogue-like` → `Ascii Dungeon`

Only Open layout is implemented initially; Ascii is a structural placeholder.

---

## Current Architecture

### Config (Library.js:50-56)
```js
const RPG_CONFIG_DEFAULTS = {
  Enabled: false,
  "Game Mode": "open-world", // open-world | rogue-like
  Difficulty: "medium",
  Permadeath: false,
  Survival: true,
};
```

### World State (Library.js:8411-8484)
```js
function ensureWorldState() {
  if (!state.world) {
    state.world = {
      LocalLocation: {},      // node-based world locations
      time: {...},
      weather: {...},
      worldRegistry: {...},
      dungeon: {              // separate grid-based dungeon
        levels: {},
        currentLevel: null,
        activeMap: null,
        grid: null,
        rows: 8,
        cols: 5,
        floor: 1,
        playerPosition: { row: 1, col: "A" },
        generatedAt: 0,
        currentLevelName: null,
        dugfloor: 1,
      },
    };
  }
  // ... defensive initializers
}
```

### Game Mode Usage
- `getRpgConfig().gameMode === "rogue-like"` → permadeath, dungeon start (Library.js:186, 196)
- Open-world starts in safe haven, rogue-like starts in dungeon (Library.js:3673-3674)

---

## Plan

### 1. Add World Layout to Config Defaults
**File:** `RPG ENGINE/Library.js` (around line 50)

```js
const RPG_CONFIG_DEFAULTS = {
  Enabled: false,
  "Game Mode": "open-world",     // open-world | rogue-like
  "World Layout": "Open",        // Open | Ascii Dungeon
  Difficulty: "medium",
  Permadeath: false,
  Survival: true,
};
```

Update header (line 61) and `buildRpgConfigEntry`/`readRpgSetting`/`repairRpgConfigCard` to include the new field.

### 2. Derive Default World Layout from Game Mode
**File:** `RPG ENGINE/Library.js` in `getRpgConfig()` (around line 115)

Add logic:
```js
const derivedLayout = cfg.gameMode === "rogue-like" ? "Ascii Dungeon" : "Open";
const worldLayout = readRpgSetting(card, "World Layout", derivedLayout);
```

Store in `cfg.worldLayout` and `state.rpgConfig.worldLayout`.

### 3. Update ensureWorldState() to Branch on World Layout
**File:** `RPG ENGINE/Library.js` (around line 8411)

```js
function ensureWorldState() {
  const layout = (state.rpgConfig && state.rpgConfig.worldLayout) || "Open";
  
  if (!state.world) {
    state.world = {
      LocalLocation: {},
      time: {...},
      weather: {...},
      worldRegistry: {...},
    };
    
    if (layout === "Ascii Dungeon") {
      // ASCII GRID WORLD — placeholder structure
      state.world.asciiWorld = {
        grid: null,
        rows: 50,
        cols: 50,
        playerPosition: { x: 25, y: 25 },
        regions: {},
        generatedAt: 0,
      };
      // Dungeon is a sub-region of asciiWorld
      state.world.dungeon = null; // or integrated into asciiWorld
    } else {
      // OPEN WORLD — unified structure (current default)
      state.world.dungeon = {
        levels: {},
        currentLevel: null,
        activeMap: null,
        grid: null,
        rows: 8,
        cols: 5,
        floor: 1,
        playerPosition: { row: 1, col: "A" },
        generatedAt: 0,
        currentLevelName: null,
        dugfloor: 1,
      };
    }
  }
  // ... existing defensive initializers
}
```

### 4. Add World Layout Accessor
**File:** `RPG ENGINE/Library.js` (after `getRpgConfig`)

```js
function getWorldLayout() {
  return (state.rpgConfig && state.rpgConfig.worldLayout) || "Open";
}
```

### 5. Update Game Start Location Logic
**File:** `RPG ENGINE/Library.js` (around line 194, `rpgStartingLocation`)

Currently uses Game Mode. Keep that behavior or enhance to also respect World Layout if different.

### 6. Placeholder: Ascii Dungeon Systems (Future)
Mark these as TODO/placeholder:
- `generateAsciiWorld()` — procedural ASCII grid generation
- `asciiMovement()` — N/S/E/W grid movement with fog of war
- `asciiDungeonIntegration()` — dungeon as sub-grid or region
- `asciiMonsterSpawning()` — grid-based spawns
- `asciiMapRendering()` — ASCII map display in story cards

For now: only skeleton structure in `ensureWorldState`, no behavior.

---

## Migration / Compatibility

- Existing saves without `World Layout` default to `Open` (via derived default from Game Mode)
- `rogue-like` Game Mode gets `Ascii Dungeon` by default but can be overridden in config card
- No breaking changes to existing Open world behavior

---

## Validation

1. **Config card** — verify "World Layout" appears in RPG Config story card with correct default
2. **Open layout** — start new game, verify `state.world.dungeon` initializes, `LocalLocation` works
3. **Ascii layout** — temporarily set `World Layout: Ascii Dungeon` in config, verify `state.world.asciiWorld` initializes, `dungeon` is null/integrated
4. **Game Mode coupling** — create rogue-like game, verify World Layout defaults to Ascii Dungeon
5. **Override** — set Game Mode: open-world but World Layout: Ascii Dungeon in config, verify override works

---

## Out of Scope (Future Work)

- Full ASCII world generation
- Grid-based movement system
- Fog of war / room discovery
- ASCII map rendering in story cards
- Unified world/dungeon spawning for Ascii layout
- Migration of existing dungeon logic to Ascii structure

---

## Files to Modify

1. `RPG ENGINE/Library.js`
   - `RPG_CONFIG_DEFAULTS` (line ~50)
   - `RPG_CONFIG_HEADER` (line ~61)
   - `buildRpgConfigEntry` / `readRpgSetting` / `repairRpgConfigCard` (lines ~64-168)
   - `getRpgConfig()` (lines ~107-137) — add worldLayout derivation
   - `ensureWorldState()` (lines ~8411-8484) — branch on layout
   - Add `getWorldLayout()` helper
   - `rpgStartingLocation()` (line ~194) — optional enhancement

---

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking existing open-world saves | Default to Open; only new struct field added |
| Game Mode / World Layout confusion | Clear naming; derive default but allow override |
| Ascii placeholder used accidentally | No code paths call asciiWorld yet; guarded by layout check |
| Config card format migration | `repairRpgConfigCard` handles format upgrade |

---

## Next Steps (Implementation Order)

1. Add `World Layout` to `RPG_CONFIG_DEFAULTS` and config card plumbing
2. Update `getRpgConfig()` to read/derive `worldLayout`
3. Update `ensureWorldState()` to branch on layout
4. Add `getWorldLayout()` accessor
5. Test both layouts initialize correctly
6. (Optional) Update `rpgStartingLocation()` to respect layout