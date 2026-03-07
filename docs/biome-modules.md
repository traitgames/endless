# Biome + Terrain Modularization Plan

## Goal
Move biome definitions and biome/terrain generation logic out of `app/main.js` into focused modules, with one source file per biome ID (authored and currently generated) containing default parameters, colors, terrain profile, and texture/settings metadata.

## Target end state
- `app/main.js` only wires scene/runtime and calls biome/terrain APIs.
- Biome defaults live in `app/world/biomes/definitions/**/*` (one file per biome ID).
- Terrain/climate/biome blending logic lives in `app/world/biomes/*` modules.
- Behavior stays equivalent (same biome selection, colors, height profiles, mountain/wetland/subdivision behavior).

## Proposed module layout
```text
app/world/
  biomes/
    constants.js                # thresholds, blend widths, suffixes
    climate.js                  # sampleBiomeClimate + sampleBiomeClimateFields
    mappings.js                 # BIOME_VARIANTS, humidity lookups, mountain lookups
    blend.js                    # fillBiomeBlendSample + weight math + edge blending
    variants/
      mountains.js              # createMountainTerrainProfile + createMountainBiomeVariant
      subdivisions.js           # bumpy subdivision selectors + variant builders
      wetlands.js               # wetland retention/demotion helpers
    visuals.js                  # terrain/fog/water color blending helpers
    registry.js                 # builds BIOME_DEFS from explicit biome definitions
    definitions/
      authored/
        <biome-id>.js
      generated/
        <generated-biome-id>.js
      index.js                  # export all biome defs
```

## Biome definition file contract (per biome)
Each `definitions/<biome-id>.js` should export plain data:
- `id`, `label`, `category`
- `colors`: `ground`, `water`, `fog`, optional `trunk`, `canopy` (hex strings)
- `terrainProfile`: noise algorithm + multipliers + octave params
- `vegetation`: `hasTrees`, `treeStyle`, `treeDensityMultiplier`
- `settings`: `fogDensityMultiplier`, optional `waterlineMode`, `humidityBand`, `wetlandRetentionGroup`, `isMountainVariant`, `baseBiomeId`
- `textures`: `detailTextureId`

`registry.js` converts color hex to `THREE.Color`, validates IDs, and assembles the final `BIOME_DEFS`.

## One-file-per-biome list
Create these files under `app/world/biomes/definitions/`.

### Authored biome IDs
Path: `app/world/biomes/definitions/authored/*.js`

```text
alpine_mire.js
alpine_steppe.js
alpine_tundra.js
badlands.js
cloudforest_hot.js
cloudforest_temperate.js
desert.js
forest.js
glacier.js
icefield.js
marsh.js
meadow.js
monsoon_forest.js
montane.js
montane_woodland.js
mire.js
muskeg.js
polar_desert.js
rainforest_hot.js
rainforest_temperate.js
rockydesert.js
rocky_mountains.js
saltflat.js
savanna.js
savanna_mesic.js
scrubland.js
shrubland.js
steppe.js
subalpine.js
taiga.js
thorn_forest.js
tundra.js
tundra_mesic.js
wetland.js
wetland_hydric.js
woodland_cold.js
woodland_temperate.js
```

### Generated biome IDs (currently created in `main.js`)
Path: `app/world/biomes/definitions/generated/*.js`

Mountain variants (`*_mountains`):
```text
badlands_mountains.js
desert_mountains.js
forest_mountains.js
glacier_mountains.js
icefield_mountains.js
marsh_mountains.js
meadow_mountains.js
mire_mountains.js
monsoon_forest_mountains.js
muskeg_mountains.js
polar_desert_mountains.js
rainforest_hot_mountains.js
rainforest_temperate_mountains.js
saltflat_mountains.js
savanna_mesic_mountains.js
savanna_mountains.js
scrubland_mountains.js
shrubland_mountains.js
steppe_mountains.js
taiga_mountains.js
thorn_forest_mountains.js
tundra_mesic_mountains.js
tundra_mountains.js
wetland_hydric_mountains.js
wetland_mountains.js
woodland_cold_mountains.js
woodland_temperate_mountains.js
```

Bumpy subdivision variants (`jagged_*`, `smooth_*`):
```text
jagged_alpine_mire.js
jagged_alpine_steppe.js
jagged_alpine_tundra.js
jagged_badlands.js
jagged_badlands_mountains.js
jagged_cloudforest_hot.js
jagged_cloudforest_temperate.js
jagged_desert.js
jagged_glacier.js
jagged_glacier_mountains.js
jagged_icefield.js
jagged_montane.js
jagged_polar_desert.js
jagged_rocky_mountains.js
jagged_rockydesert.js
jagged_saltflat.js
jagged_scrubland.js
jagged_thorn_forest.js
smooth_alpine_mire.js
smooth_alpine_steppe.js
smooth_alpine_tundra.js
smooth_badlands.js
smooth_badlands_mountains.js
smooth_cloudforest_hot.js
smooth_cloudforest_temperate.js
smooth_desert.js
smooth_glacier.js
smooth_glacier_mountains.js
smooth_icefield.js
smooth_montane.js
smooth_polar_desert.js
smooth_rocky_mountains.js
smooth_rockydesert.js
smooth_saltflat.js
smooth_scrubland.js
smooth_thorn_forest.js
```

## Migration phases
1. Baseline safety
- Snapshot current `main.js` biome constants/logic.
- Add a tiny deterministic sampling harness (seed + fixed coordinates -> biome id, height, colors) to compare before/after.

2. Extract constants + mappings
- Move climate thresholds, blend constants, humidity/mountain lookup maps to `constants.js` and `mappings.js`.
- Keep exports identical to current names first to minimize churn.

3. Split biome data into per-biome files
- Create one definition file for every authored ID and every currently generated ID.
- Move `detailTextureId`, `waterlineMode`, `humidityBand`, `wetlandRetentionGroup` into each biome file (remove post-merge assignment tables in `main.js`).
- Add `definitions/index.js` that exports all biome definitions.

4. Build biome registry
- Implement `registry.js` to build `BIOME_DEFS` from definitions.
- Replace runtime biome-ID generation with explicit generated-definition files so each generated ID can carry its own settings.
- Keep the same final ID set and selection behavior as today.
- Remove the `wetland_mountains -> rocky_mountains` hard alias once `wetland_mountains` has its own explicit definition.

5. Extract biome selection/blend logic
- Move climate sampling, weight blending, humidity mapping, mountain/wetland/subdivision finalization, and `getBiomeAt` helpers from `main.js` into biome modules.
- Expose a compact API, e.g. `createBiomeSystem({ noiseSeedRef, heightSamplerRef, stateRef })`.

6. Rewire `main.js`
- Replace in-file biome constants/functions with imports from `app/world/biomes`.
- Keep existing state keys (`world.biomeStyles`, `world.biomeSettings`) and override behavior unchanged.

7. Verify behavior + performance
- Run coordinate regression harness and compare outputs.
- Manual smoke checks: biome transitions, mountain boundaries, wetland demotion, `/tp <biome>`, `/world style`, `/world detail`.
- Run `npm test` in `server/`.

## Acceptance criteria
- `main.js` no longer contains biome definition objects or biome generation internals.
- Every biome ID used at runtime (authored + generated) has a dedicated definition file.
- Texture/settings metadata is colocated with its biome definition.
- No state reset; saved worlds continue loading and rendering correctly.
- Existing commands that depend on `BIOME_DEFS` continue to work.

## Risks and mitigations
- Risk: hidden coupling between `BIOME_DEFS` shape and command/runtime code.
  - Mitigation: `registry.js` emits a compatibility-normalized shape matching current fields.
- Risk: subtle terrain/biome transition drift.
  - Mitigation: fixed-coordinate regression comparisons before/after extraction.
- Risk: duplicate source of truth during migration.
  - Mitigation: move maps first, then delete legacy constants immediately after each module is wired.
