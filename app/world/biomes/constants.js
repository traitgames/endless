export const BIOME_VARIANTS = Object.freeze({
  cold: Object.freeze(["glacier", "tundra", "taiga"]),
  temperate: Object.freeze(["meadow", "forest", "wetland"]),
  hot: Object.freeze(["desert", "savanna", "badlands"]),
});

export const OCEAN_BIOME_VARIANTS = Object.freeze({
  coastal: Object.freeze({
    hot: Object.freeze(["mangrove", "seagrass_meadow", "tropical_lagoon"]),
    temperate: Object.freeze(["kelp_shore", "mudflat", "salt_marsh"]),
    cold: Object.freeze(["kelp_shore_cold", "rocky_shore", "coastal_tundra"]),
  }),
  open: Object.freeze({
    hot: Object.freeze(["tropical_ocean", "deep_tropical_ocean", "coral_reef"]),
    temperate: Object.freeze(["ocean", "deep_ocean", "kelp_forest"]),
    cold: Object.freeze(["cold_ocean", "deep_cold_ocean", "kelp_forest_cold"]),
  }),
});

export const OCEAN_BIOME_COASTAL_MAX_MOUNTAIN_ADDITIVE_HEIGHT = 1;
export const OCEAN_BIOME_OPEN_MAX_MOUNTAIN_ADDITIVE_HEIGHT = 0.35;
export const OCEAN_BIOME_OPEN_COASTAL_BLEND_HALF_WIDTH_METERS = 0.35;
export const OCEAN_BIOME_OPEN_BLEND_PRECHECK_HEIGHT = 0.6;
export const OCEAN_BIOME_LAND_BLEND_HALF_WIDTH_METERS = 1.25;
export const OCEAN_BIOME_LAND_BLEND_PRECHECK_HEIGHT = 2;
export const OCEAN_DEEP_BIOME_COAST_RANGE_MASK_SCALE = 28;
export const OCEAN_DEEP_BIOME_COAST_SIGNAL_START = 0.04;
export const OCEAN_DEEP_BIOME_COAST_SIGNAL_END = 0.24;

export const HUMIDITY_ZONE_KEYS = Object.freeze(["xeric", "mesic", "hydric"]);

export const HUMIDITY_ZONE_LABELS = Object.freeze({
  xeric: "Xeric",
  mesic: "Mesic",
  hydric: "Hydric",
});

export const CLIMATE_ZONE_THRESHOLD_LOW = 0.37;
export const CLIMATE_ZONE_THRESHOLD_HIGH = 0.63;
export const HUMIDITY_ZONE_THRESHOLD_LOW = 0.23;
export const HUMIDITY_ZONE_THRESHOLD_HIGH = 0.555;

export const BIOME_HUMIDITY_LOOKUP = Object.freeze({
  wetland: Object.freeze({ xeric: "saltflat", mesic: "wetland", hydric: "wetland_hydric" }),
  forest: Object.freeze({ xeric: "woodland_temperate", mesic: "forest", hydric: "rainforest_temperate" }),
  meadow: Object.freeze({ xeric: "steppe", mesic: "meadow", hydric: "marsh" }),
  glacier: Object.freeze({ xeric: "polar_desert", mesic: "glacier", hydric: "icefield" }),
  taiga: Object.freeze({ xeric: "woodland_cold", mesic: "taiga", hydric: "muskeg" }),
  tundra: Object.freeze({ xeric: "tundra", mesic: "tundra_mesic", hydric: "mire" }),
  savanna: Object.freeze({ xeric: "savanna", mesic: "savanna_mesic", hydric: "monsoon_forest" }),
  badlands: Object.freeze({ xeric: "badlands", mesic: "scrubland", hydric: "thorn_forest" }),
  desert: Object.freeze({ xeric: "desert", mesic: "shrubland", hydric: "rainforest_hot" }),
});

export const ROCKY_MOUNTAIN_HUMIDITY_LOOKUP = Object.freeze({
  temperate: Object.freeze({ xeric: "alpine_steppe", mesic: "montane", hydric: "cloudforest_temperate" }),
  cold: Object.freeze({ xeric: "alpine_tundra", mesic: "subalpine", hydric: "alpine_mire" }),
  hot: Object.freeze({ xeric: "rockydesert", mesic: "montane_woodland", hydric: "cloudforest_hot" }),
});

export const HIGH_ALTITUDE_BIOME_THRESHOLD_METERS = 260;

export const HIGH_ALTITUDE_MOUNTAIN_HUMIDITY_LOOKUP = Object.freeze({
  hot: Object.freeze({ xeric: "arid_summit", mesic: "mountain_grassland", hydric: "paramo" }),
  temperate: Object.freeze({ xeric: "barren_highlands", mesic: "alpine_summit", hydric: "icy_summit" }),
  cold: Object.freeze({ xeric: "polar_scree", mesic: "frost_peak", hydric: "glacial_summit" }),
});

export const BIOME_BLEND_TRANSITION_WIDTH_METERS = 30;
export const BIOME_BLEND_HALF_WIDTH_METERS = BIOME_BLEND_TRANSITION_WIDTH_METERS * 0.5;
export const BIOME_BLEND_GRADIENT_STEP_METERS = 2;
export const BIOME_BLEND_PRECHECK_MARGIN = 0.05;

export const DETAIL_BIOME_FADE_OUT_METERS = 2;
export const DETAIL_BIOME_EDGE_DISTANCE_FACTOR = (4 * BIOME_BLEND_HALF_WIDTH_METERS) / 3;

export const BIOME_EDGE_SMOOTH_MAX_METERS = 200;
export const BIOME_EDGE_SMOOTH_START_METERS = 100;

export const DEFAULT_TRANSITION_BIOME_ID = "forest";

export const MOUNTAIN_BIOME_BORDER_BLEND_HEIGHT_METERS = 24;
export const HIGH_ALTITUDE_BIOME_BORDER_BLEND_HEIGHT_METERS = MOUNTAIN_BIOME_BORDER_BLEND_HEIGHT_METERS;
export const WETLAND_MOUNTAIN_HEIGHT_MAX_METERS = 10;
export const WETLAND_ELEVATION_FADE_BAND_METERS = 8;

export const BIOME_BLEND_MAX_SLOTS = 24;

export const MOUNTAIN_BIOME_SUFFIX = "_mountains";
export const BIOME_SUBDIVISION_PREFIX_JAGGED = "jagged_";
export const BIOME_SUBDIVISION_PREFIX_SMOOTH = "smooth_";

export const BUMPY_BIOME_SUBDIVISION_TARGET_IDS = Object.freeze([
  "badlands",
  "badlands_mountains",
  "scrubland",
  "thorn_forest",
  "desert",
  "saltflat",
  "glacier",
  "glacier_mountains",
  "icefield",
  "polar_desert",
  "rocky_mountains",
  "alpine_steppe",
  "alpine_tundra",
  "alpine_mire",
  "rockydesert",
  "montane",
  "cloudforest_temperate",
  "cloudforest_hot",
  "arid_summit",
  "mountain_grassland",
  "paramo",
  "barren_highlands",
  "alpine_summit",
  "icy_summit",
  "polar_scree",
  "frost_peak",
  "glacial_summit",
]);

export const BUMPY_BIOME_SUBDIVISION_THRESHOLD_SMOOTH = 0.33;
export const BUMPY_BIOME_SUBDIVISION_THRESHOLD_JAGGED = 0.67;
export const BUMPY_BIOME_SUBDIVISION_PRIMARY_SCALE = 0.00082;
export const BUMPY_BIOME_SUBDIVISION_SECONDARY_SCALE = 0.00174;
export const BUMPY_BIOME_SUBDIVISION_PRECHECK_MARGIN = 0.06;

export const JAGGED_BIOME_WIDTH_SCALE_MULTIPLIER = 1.3;
export const JAGGED_BIOME_HEIGHT_SCALE_MULTIPLIER = 0.8;
export const JAGGED_BIOME_NOISE_SCALE_ADJUST = 1 / JAGGED_BIOME_WIDTH_SCALE_MULTIPLIER;
