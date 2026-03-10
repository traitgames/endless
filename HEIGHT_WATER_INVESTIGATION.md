# Player Height vs Water Level Investigation (2026-02-27)

## Summary
We tracked a mismatch between the displayed player height (HUD) and the perceived water plane height. The water plane was correct (`state.world.water.level = 1.5`), but the player’s eye height was effectively offset by an extra `+1.7`, and the HUD was not reliably reflecting the actual runtime state.

The core issue was **stale cached code** in `app/player/movement.js`. The browser was continuing to use an older version of the movement module, which:
- Left the player marked as grounded even when floating.
- Left `player.position.y` offset above the terrain.
- Caused the camera to appear at the wrong height relative to the water plane.

Once the movement module cache was busted, the corrected grounding logic took effect and the values aligned:
- Feet Y = 1.5
- Player Y = 1.5
- Eye Y = 3.2 (Feet + 1.7)
- Water Y = 1.5

## Observed Symptoms
- Water plane appeared to be at `+1.7` vs the HUD Y.
- HUD showed Eye Y ≈ 5.4 when Feet Y = 1.5 (implying Player Y = 3.7).
- `Grounded` was `true` even though the player was floating 2.2m above the ground.
- Camera Y matched Player Y (no explicit extra offset applied at runtime).

## Investigation Timeline (Condensed)
1. Verified water plane placement: `water.position.y = state.world.water.level`.
2. Verified HUD Y was ground sample under player.
3. Added HUD readouts for Feet Y, Eye Y, Water Y, Player Y, Camera Y.
4. Found a mismatch: Player Y was +2.2 above Feet Y, yet Grounded stayed true.
5. Updated grounding logic to explicitly set `grounded = false` when above ground.
6. Symptoms persisted: values unchanged after server restart and hard refresh.
7. Added cache-busting import for `movement.js` and a visible `Move v` HUD tag.
8. Confirmed updated code loaded (`Move v: 2026-02-27-1`).
9. Values aligned correctly; issue resolved.

## Root Cause
**Browser module caching** prevented new movement logic from loading. The system uses dynamic imports for `main.js` with cache busting, but `main.js` imported `movement.js` without a query param. The browser reused the old module.

This made it appear as if the runtime logic was wrong, when the actual issue was stale code.

## Changes Made
- Added HUD values for Feet Y, Eye Y, Water Y, Player Y, Camera Y, Vel Y, Grounded, and a movement version string.
- Fixed grounding logic to explicitly reset `player.grounded = false` when above ground.
- Cache-busted the `movement.js` import using a query parameter.

## Recommendations for Maintainability
### 1. Codify Coordinate Semantics
Define (and document in code) what `player.position.y` represents:
- Option A: **Feet position** (recommended)
- Option B: **Eye position**
Whichever you choose, enforce it everywhere. Add a single constant and a comment at the player model definition.

### 2. Centralize Height Derivations
Create helper functions to avoid subtle mismatches:
- `getFeetY(player)`  
- `getEyeY(player, playerHeight)`  
- `getGroundYAt(x, z)`
Then use those helpers in both physics and HUD.

### 3. Unify HUD Sampling With Physics
The HUD should read the same ground height that physics used for that frame.
We used `player._lastGroundHeight` to guarantee this; keep that pattern or formalize it.

### 4. Explicit Grounding State
Always set `player.grounded` every frame. Avoid only setting it in one branch.
This prevents stale state from masking real physics issues.

### 5. Cache Busting Policy
Ensure any module imported by a cache-busted entry point also gets a cache-busting query param in local dev.
Better: add a single `APP_BUILD_ID` and append it to all local imports when `window.isLocalHost` is true.

### 6. Consider a Player “Capsule” Abstraction
Even without a physics engine, define a small player model:
- `feetY`
- `eyeY`
- `height`
- `radius`
This makes it obvious how water/terrain tests should behave, and reduces confusion when refactoring.

## Optional Refactor Targets
- `app/player/movement.js`
  - Separate integration, collision/grounding, and camera update into named functions.
- `app/main.js`
  - Move HUD updates into a small “hud” module that reads a typed `PlayerState`.

## Notes
This issue looked like a geometry/water mismatch, but the root was **stale JS module caching**. If similar “impossible” mismatches show up again, check cache-related behavior first (especially for module imports that are not explicitly cache-busted).
