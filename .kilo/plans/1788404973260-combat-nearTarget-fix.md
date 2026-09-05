# Combat nearTarget Fix Plan

## Problem Statement

The player cannot attack monsters because `state.PS.nearTarget` remains `false`, preventing attack execution. The current proximity tracking system does not properly update `nearTarget` when the player moves closer to monsters.

## Root Cause Analysis

1. **Current Flow:**
   - `playerAttack()` calls `SpatialManager.updateDistance(target, -playerSpeed)` to close distance
   - `SpatialManager.updateProximity()` is NOT called after the distance update
   - `state.PS.nearTarget` never gets updated to `true`
   - Attack code may depend on `nearTarget` being `true` to execute

2. **Missing Update:**
   - After `SpatialManager.updateDistance()` modifies `target.distance`, the proximity flag must be recalculated
   - `SpatialManager.calculateReach()` checks if `attacker.distance <= attacker.baseRange`
   - This check never runs after movement, so `nearTarget` stays stale

## Proposed Solution

### 1. Update `playerAttack()` to Recalculate Proximity After Movement

After closing distance, call `SpatialManager.updateProximity()` to sync the `nearTarget` flag:

```javascript
if (target.distance > playerBaseRange) {
  const oldDistance = target.distance;
  SpatialManager.updateDistance(target, -playerSpeed);
  SpatialManager.updateProximity(state.PS, target); // ← ADD THIS
  console.log(`Closing distance: ${oldDistance} -> ${target.distance} (speed: ${playerSpeed}, range needed: ${playerBaseRange}, nearTarget: ${state.PS.nearTarget})`);
  state.logMessages["Output"].push(`[${PlayerName} closes the distance to ${target.name}.]`);
  return text;
}
```

### 2. Fix `updateProximity()` Logic

Current code (line 7711-7714):
```javascript
if (attacker === state.PS) {
  state.PS.nearTarget = isNear;
} else if (attacker.nearTarget !== "None") {
  attacker.nearTarget = isNear;
}
```

**Issue:** The condition `attacker.nearTarget !== "None"` assumes `nearTarget` is a string, but it's initialized as a boolean (`false` on line 2097).

**Fix:**
```javascript
if (attacker === state.PS) {
  state.PS.nearTarget = isNear;
} else if (attacker.nearTarget !== undefined) {
  attacker.nearTarget = isNear;
}
```

### 3. Add Proximity Update After Player Attacks (Success Case)

After the player deals damage, ensure proximity is still tracked:

```javascript
} else {
  const dmg = getPlayerDamage();
  target.state = "Attacking";
  target.health -= dmg;
  // ... existing damage code ...
  SpatialManager.updateProximity(state.PS, target); // ← ADD THIS
}
```

### 4. Initialize `nearTarget` on Monster Spawn

When monsters spawn, initialize their `nearTarget` flag:

```javascript
monster.nearTarget = false; // Add to createMonster() around line 7435
```

## Implementation Tasks

1. **[Library.js]** Fix `SpatialManager.updateProximity()` condition (line 7713)
   - Change `attacker.nearTarget !== "None"` to `attacker.nearTarget !== undefined`

2. **[Library.js]** Add proximity update in `playerAttack()` after closing distance (line 7846)
   - Call `SpatialManager.updateProximity(state.PS, target)` after `updateDistance()`

3. **[Library.js]** Add proximity update in `playerAttack()` after dealing damage (around line 7851)
   - Call `SpatialManager.updateProximity(state.PS, target)` in the else branch

4. **[Library.js]** Initialize `nearTarget` on monster creation (around line 7435)
   - Add `monster.nearTarget = false` in `createMonster()`

5. **[Library.js]** Add debug logging to track `nearTarget` state
   - Log `state.PS.nearTarget` after proximity updates

## Validation Steps

1. **Test Case 1: Melee Attack Flow**
   - Spawn a melee monster (distance 40)
   - Type "attack Goblin"
   - Verify: Distance decreases each turn (40 → 30 → 20 → 10 → 0)
   - Verify: When distance ≤ 5, `state.PS.nearTarget` becomes `true`
   - Verify: Attack damage is dealt when `nearTarget === true`

2. **Test Case 2: Ranged Attack Flow**
   - Equip a ranged weapon
   - Type "attack Goblin" at distance 40
   - Verify: Attack succeeds immediately (range 40 allows ranged attacks)

3. **Test Case 3: Multiple Monsters**
   - Spawn 2+ monsters
   - Verify: `nearTarget` tracks the current target correctly
   - Verify: Switching targets updates `nearTarget` appropriately

4. **Test Case 4: Console Logging**
   - Check console for: `Closing distance: X -> Y (speed: Z, range needed: 5, nearTarget: true/false)`
   - Verify `nearTarget` transitions from `false` to `true` when in range

## Edge Cases to Handle

- **Monster dies mid-combat:** Ensure `nearTarget` resets or updates to new target
- **Player flees:** `nearTarget` should become `false` when distance increases
- **No monsters:** `playerAttack()` should return early without errors
- **Command input:** `/attack` or other commands should bypass proximity checks

## Open Questions

1. **Should `nearTarget` be a boolean or string?**
   - Current initialization: `false` (boolean)
   - Condition check: `!== "None"` (expects string)
   - **Recommendation:** Use boolean `false`/`true` for clarity

2. **Should proximity be checked per-target or globally?**
   - Current: `state.PS.nearTarget` is a single boolean
   - Issue: With multiple monsters, player might be near one but not another
   - **Recommendation:** Keep current design (nearest target) but document behavior

3. **Should `playerAttack()` accept `text` as a parameter?**
   - Current: Function references global `text` without parameter
   - **Recommendation:** Out of scope for this fix, but note for future refactoring

## Files to Modify

- `RPG ENGINE/Library.js`
  - `SpatialManager.updateProximity()` (line ~7713)
  - `playerAttack()` (lines ~7846, ~7851)
  - `createMonster()` (line ~7435)

## Success Criteria

- Player can successfully attack monsters after closing to melee range
- `state.PS.nearTarget` accurately reflects proximity to current target
- Console logs show correct distance and `nearTarget` values
- No regressions in existing combat flow (monster counter-attacks, death handling)
