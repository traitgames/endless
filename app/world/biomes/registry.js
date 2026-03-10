import {
  BUMPY_BIOME_SUBDIVISION_TARGET_IDS,
  BIOME_SUBDIVISION_PREFIX_JAGGED,
  BIOME_SUBDIVISION_PREFIX_SMOOTH,
  JAGGED_BIOME_HEIGHT_SCALE_MULTIPLIER,
  JAGGED_BIOME_NOISE_SCALE_ADJUST,
  MOUNTAIN_BIOME_SUFFIX,
} from "./constants.js";
import { AUTHORED_BIOME_DEFINITIONS, GENERATED_BIOME_DEFINITIONS } from "./definitions/index.js";

function toColor(THREE, hex, fallback = "#808080") {
  return new THREE.Color(typeof hex === "string" && hex.trim() ? hex : fallback);
}

function cloneColor(THREE, color, fallbackHex = "#808080") {
  if (color instanceof THREE.Color) return color.clone();
  return new THREE.Color(fallbackHex);
}

function tintColor(THREE, clampNumber, color, tintHex, amount) {
  return cloneColor(THREE, color).lerp(new THREE.Color(tintHex), clampNumber(amount, 0, 1, 0));
}

function cloneBiome(THREE, source, idOverride = null) {
  const next = {
    ...source,
    terrainProfile:
      source?.terrainProfile && typeof source.terrainProfile === "object"
        ? { ...source.terrainProfile }
        : source?.terrainProfile,
  };
  if (idOverride) next.id = idOverride;

  if (source?.groundColor instanceof THREE.Color) next.groundColor = source.groundColor.clone();
  if (source?.waterColor instanceof THREE.Color) next.waterColor = source.waterColor.clone();
  if (source?.fogColor instanceof THREE.Color) next.fogColor = source.fogColor.clone();
  if (source?.trunkTint instanceof THREE.Color) next.trunkTint = source.trunkTint.clone();
  if (source?.canopyTint instanceof THREE.Color) next.canopyTint = source.canopyTint.clone();
  return next;
}

function applyBiomeDefinitionFields(THREE, base, definition) {
  const next = base ? cloneBiome(THREE, base) : {};

  const settings = definition?.settings && typeof definition.settings === "object" ? definition.settings : null;

  if (typeof definition?.id === "string" && definition.id.trim()) next.id = definition.id;
  if (typeof definition?.label === "string") next.label = definition.label;
  if (typeof definition?.category === "string") next.category = definition.category;

  const colors = definition?.colors && typeof definition.colors === "object" ? definition.colors : null;
  if (typeof colors?.ground === "string") next.groundColor = toColor(THREE, colors.ground, "#808080");
  if (typeof colors?.water === "string") next.waterColor = toColor(THREE, colors.water, "#808080");
  if (typeof colors?.fog === "string") next.fogColor = toColor(THREE, colors.fog, "#808080");
  if (typeof colors?.trunk === "string") next.trunkTint = toColor(THREE, colors.trunk, "#808080");
  if (typeof colors?.canopy === "string") next.canopyTint = toColor(THREE, colors.canopy, "#808080");

  if (definition?.terrainProfile && typeof definition.terrainProfile === "object") {
    next.terrainProfile = {
      ...(next.terrainProfile && typeof next.terrainProfile === "object" ? next.terrainProfile : {}),
      ...definition.terrainProfile,
    };
  }

  const directCopyKeys = [
    "hasTrees",
    "fogDensityMultiplier",
    "humidityBand",
    "waterlineMode",
    "wetlandRetentionGroup",
    "isMountainVariant",
    "baseBiomeId",
    "treeStyle",
    "treeDensityMultiplier",
    "detailTextureId",
  ];

  for (const key of directCopyKeys) {
    if (definition?.[key] !== undefined) next[key] = definition[key];
    else if (settings?.[key] !== undefined) next[key] = settings[key];
  }

  if (settings?.terrainProfile && typeof settings.terrainProfile === "object") {
    next.terrainProfile = {
      ...(next.terrainProfile && typeof next.terrainProfile === "object" ? next.terrainProfile : {}),
      ...settings.terrainProfile,
    };
  }

  if (settings?.colors && typeof settings.colors === "object") {
    if (typeof settings.colors.ground === "string") next.groundColor = toColor(THREE, settings.colors.ground);
    if (typeof settings.colors.water === "string") next.waterColor = toColor(THREE, settings.colors.water);
    if (typeof settings.colors.fog === "string") next.fogColor = toColor(THREE, settings.colors.fog);
    if (typeof settings.colors.trunk === "string") next.trunkTint = toColor(THREE, settings.colors.trunk);
    if (typeof settings.colors.canopy === "string") next.canopyTint = toColor(THREE, settings.colors.canopy);
  }

  return next;
}

function createMountainTerrainProfile(profile) {
  const source = { ...(profile || {}) };
  const baseOctaves = Math.max(1, Math.floor(source.octaves ?? 4));
  return {
    ...source,
    noiseAlgorithm: source.noiseAlgorithm === "billow" ? "hybrid" : source.noiseAlgorithm ?? "fbm_ridged",
    noiseScaleMultiplier: (source.noiseScaleMultiplier ?? 1) * 0.9,
    baseHeightMultiplier: (source.baseHeightMultiplier ?? 1) * 1.16,
    ridgeScaleMultiplier: (source.ridgeScaleMultiplier ?? 1) * 1.18,
    ridgeHeightMultiplier: (source.ridgeHeightMultiplier ?? 1) * 1.35,
    octaves: Math.min(6, baseOctaves + 1),
    lacunarity: Number.isFinite(source.lacunarity) ? source.lacunarity : 1.95,
    gain: Number.isFinite(source.gain) ? source.gain : 0.5,
    warpStrength: Math.max(0.12, Number(source.warpStrength) || 0),
    warpScaleMultiplier: Number.isFinite(source.warpScaleMultiplier) ? source.warpScaleMultiplier : 1.7,
    secondaryAmount: (source.secondaryAmount ?? 0) + 0.05,
  };
}

function blendColorToMountain(THREE, clampNumber, color, amount, lift = 0) {
  const out = cloneColor(THREE, color);
  out.lerp(new THREE.Color("#7d8790"), amount);
  if (lift !== 0) {
    out.r = clampNumber(out.r + lift, 0, 1, out.r);
    out.g = clampNumber(out.g + lift, 0, 1, out.g);
    out.b = clampNumber(out.b + lift, 0, 1, out.b);
  }
  return out;
}

function createMountainBiomeVariant(THREE, clampNumber, baseBiome) {
  const mountainId = `${baseBiome.id}${MOUNTAIN_BIOME_SUFFIX}`;
  return {
    ...baseBiome,
    id: mountainId,
    baseBiomeId: baseBiome.id,
    isMountainVariant: true,
    label: `${baseBiome.label} Mountains`,
    groundColor: blendColorToMountain(THREE, clampNumber, baseBiome.groundColor, 0.28, 0.015),
    waterColor: blendColorToMountain(THREE, clampNumber, baseBiome.waterColor, 0.12, 0.02),
    fogColor: blendColorToMountain(THREE, clampNumber, baseBiome.fogColor, 0.16, 0.025),
    fogDensityMultiplier: (baseBiome.fogDensityMultiplier ?? 1) * 1.08,
    terrainProfile: createMountainTerrainProfile(baseBiome.terrainProfile),
    treeDensityMultiplier: (baseBiome.treeDensityMultiplier ?? 1) * 0.7,
    trunkTint: baseBiome.trunkTint ? blendColorToMountain(THREE, clampNumber, baseBiome.trunkTint, 0.1) : baseBiome.trunkTint,
    canopyTint: baseBiome.canopyTint ? blendColorToMountain(THREE, clampNumber, baseBiome.canopyTint, 0.2) : baseBiome.canopyTint,
  };
}

function createSubdivisionTerrainProfile(sourceProfile, mode) {
  const source = { ...(sourceProfile || {}) };
  const baseOctaves = Math.max(1, Math.floor(source.octaves ?? 4));

  if (mode === "jagged") {
    return {
      ...source,
      noiseScaleMultiplier: (source.noiseScaleMultiplier ?? 1) * JAGGED_BIOME_NOISE_SCALE_ADJUST,
      baseHeightMultiplier: (source.baseHeightMultiplier ?? 1) * JAGGED_BIOME_HEIGHT_SCALE_MULTIPLIER,
      ridgeScaleMultiplier: (source.ridgeScaleMultiplier ?? 1) * JAGGED_BIOME_NOISE_SCALE_ADJUST,
      ridgeHeightMultiplier: (source.ridgeHeightMultiplier ?? 1) * JAGGED_BIOME_HEIGHT_SCALE_MULTIPLIER,
      warpScaleMultiplier:
        (Number.isFinite(source.warpScaleMultiplier) ? source.warpScaleMultiplier : 1.7) *
        JAGGED_BIOME_NOISE_SCALE_ADJUST,
    };
  }

  if (mode === "smooth") {
    return {
      ...source,
      noiseAlgorithm: source.noiseAlgorithm === "ridged" ? "hybrid" : source.noiseAlgorithm ?? "hybrid",
      noiseScaleMultiplier: (source.noiseScaleMultiplier ?? 1) * 1.12,
      baseHeightMultiplier: (source.baseHeightMultiplier ?? 1) * 0.62,
      ridgeScaleMultiplier: (source.ridgeScaleMultiplier ?? 1) * 0.84,
      ridgeHeightMultiplier: (source.ridgeHeightMultiplier ?? 1) * 0.14,
      octaves: Math.max(2, baseOctaves - 2),
      lacunarity: Number.isFinite(source.lacunarity) ? source.lacunarity : 1.85,
      gain: Number.isFinite(source.gain) ? source.gain : 0.52,
      warpStrength: (source.warpStrength ?? 0) * 0.45,
      warpScaleMultiplier: Number.isFinite(source.warpScaleMultiplier) ? source.warpScaleMultiplier : 1.55,
      secondaryAmount: (source.secondaryAmount ?? 0) * 0.2,
      gradientCap: 0.05,
      gradientSampleMeters: 6,
    };
  }

  return {
    ...source,
    noiseAlgorithm: source.noiseAlgorithm === "ridged" ? "hybrid" : source.noiseAlgorithm ?? "hybrid",
    noiseScaleMultiplier: (source.noiseScaleMultiplier ?? 1) * 1.04,
    baseHeightMultiplier: (source.baseHeightMultiplier ?? 1) * 0.8,
    ridgeScaleMultiplier: (source.ridgeScaleMultiplier ?? 1) * 0.92,
    ridgeHeightMultiplier: (source.ridgeHeightMultiplier ?? 1) * 0.36,
    octaves: Math.max(2, baseOctaves - 1),
    lacunarity: Number.isFinite(source.lacunarity) ? source.lacunarity : 1.9,
    gain: Number.isFinite(source.gain) ? source.gain : 0.5,
    warpStrength: (source.warpStrength ?? 0) * 0.7,
    warpScaleMultiplier: Number.isFinite(source.warpScaleMultiplier) ? source.warpScaleMultiplier : 1.65,
    secondaryAmount: (source.secondaryAmount ?? 0) * 0.45,
    gradientCap: 0.3,
    gradientSampleMeters: 5,
  };
}

function buildBumpyBiomeSubdivisionVariants(THREE, clampNumber, baseBiome) {
  const jaggedId = `${BIOME_SUBDIVISION_PREFIX_JAGGED}${baseBiome.id}`;
  const smoothId = `${BIOME_SUBDIVISION_PREFIX_SMOOTH}${baseBiome.id}`;

  const jaggedBiome = {
    ...baseBiome,
    id: jaggedId,
    label: `Jagged ${baseBiome.label}`,
    groundColor: tintColor(THREE, clampNumber, baseBiome.groundColor, "#5e6570", 0.08),
    waterColor: tintColor(THREE, clampNumber, baseBiome.waterColor, "#6b7f96", 0.07),
    fogColor: tintColor(THREE, clampNumber, baseBiome.fogColor, "#c4d0de", 0.06),
    fogDensityMultiplier: (baseBiome.fogDensityMultiplier ?? 1) * 1.05,
    terrainProfile: createSubdivisionTerrainProfile(baseBiome.terrainProfile, "jagged"),
  };

  const normalBiome = {
    ...baseBiome,
    id: baseBiome.id,
    label: baseBiome.label,
    groundColor: tintColor(THREE, clampNumber, baseBiome.groundColor, "#d7ddd1", 0.05),
    waterColor: tintColor(THREE, clampNumber, baseBiome.waterColor, "#9eb2c4", 0.04),
    fogColor: tintColor(THREE, clampNumber, baseBiome.fogColor, "#f0f4f8", 0.05),
    fogDensityMultiplier: (baseBiome.fogDensityMultiplier ?? 1) * 0.98,
    terrainProfile: createSubdivisionTerrainProfile(baseBiome.terrainProfile, "normal"),
  };

  const smoothBiome = {
    ...baseBiome,
    id: smoothId,
    label: `Smooth ${baseBiome.label}`,
    groundColor: tintColor(THREE, clampNumber, baseBiome.groundColor, "#d8dfdc", 0.14),
    waterColor: tintColor(THREE, clampNumber, baseBiome.waterColor, "#bfd0e0", 0.13),
    fogColor: tintColor(THREE, clampNumber, baseBiome.fogColor, "#f4f7fb", 0.16),
    fogDensityMultiplier: (baseBiome.fogDensityMultiplier ?? 1) * 0.92,
    terrainProfile: createSubdivisionTerrainProfile(baseBiome.terrainProfile, "smooth"),
  };

  return { jaggedBiome, normalBiome, smoothBiome };
}

function buildGeneratedBiomeFromDefinition(THREE, clampNumber, def, biomeDefs) {
  const derive = def?.derive;
  if (!derive || typeof derive !== "object") return null;
  const fromId = String(derive.from || "").trim();
  if (!fromId) return null;
  const source = biomeDefs[fromId];
  if (!source) return null;

  if (derive.type === "mountain") {
    const variant = createMountainBiomeVariant(THREE, clampNumber, source);
    if (def.id && def.id !== variant.id) variant.id = def.id;
    return variant;
  }

  if (derive.type === "subdivision") {
    const mode = derive.mode === "jagged" ? "jagged" : derive.mode === "smooth" ? "smooth" : "normal";
    const variants = buildBumpyBiomeSubdivisionVariants(THREE, clampNumber, source);
    if (mode === "jagged") return variants.jaggedBiome;
    if (mode === "smooth") return variants.smoothBiome;
    return variants.normalBiome;
  }

  if (derive.type === "copy") {
    return cloneBiome(THREE, source, typeof def.id === "string" ? def.id : source.id);
  }

  return null;
}

export function buildBiomeRegistry({ THREE, clampNumber }) {
  if (!THREE?.Color) {
    throw new Error("buildBiomeRegistry requires THREE with Color support.");
  }
  const clamp =
    typeof clampNumber === "function"
      ? clampNumber
      : (value, min, max, fallback = min) => {
          const n = Number(value);
          if (!Number.isFinite(n)) return fallback;
          if (n < min) return min;
          if (n > max) return max;
          return n;
        };

  const BIOME_DEFS = {};

  for (const definition of AUTHORED_BIOME_DEFINITIONS) {
    const biome = applyBiomeDefinitionFields(THREE, null, definition);
    if (!biome?.id) continue;
    BIOME_DEFS[biome.id] = biome;
  }

  for (const biome of Object.values({ ...BIOME_DEFS })) {
    if (biome?.isMountainVariant) continue;
    const mountainBiome = createMountainBiomeVariant(THREE, clamp, biome);
    BIOME_DEFS[mountainBiome.id] = mountainBiome;
  }

  const BUMPY_BIOME_SUBDIVISIONS = {};
  for (const biomeId of BUMPY_BIOME_SUBDIVISION_TARGET_IDS) {
    const baseBiome = BIOME_DEFS[biomeId];
    if (!baseBiome) continue;
    const variants = buildBumpyBiomeSubdivisionVariants(THREE, clamp, baseBiome);
    BIOME_DEFS[biomeId] = variants.normalBiome;
    BIOME_DEFS[variants.jaggedBiome.id] = variants.jaggedBiome;
    BIOME_DEFS[variants.smoothBiome.id] = variants.smoothBiome;
    BUMPY_BIOME_SUBDIVISIONS[biomeId] = {
      normalId: variants.normalBiome.id,
      jaggedId: variants.jaggedBiome.id,
      smoothId: variants.smoothBiome.id,
    };
  }

  for (const definition of GENERATED_BIOME_DEFINITIONS) {
    if (!definition?.id) continue;
    const existing = BIOME_DEFS[definition.id];
    const generated = existing || buildGeneratedBiomeFromDefinition(THREE, clamp, definition, BIOME_DEFS);
    if (!generated) continue;
    BIOME_DEFS[definition.id] = applyBiomeDefinitionFields(THREE, generated, definition);
  }

  for (const biome of Object.values(BIOME_DEFS)) {
    const terrainProfile =
      biome?.terrainProfile && typeof biome.terrainProfile === "object" ? { ...biome.terrainProfile } : {};
    terrainProfile.heightMultiplier = Number.isFinite(terrainProfile.heightMultiplier) ? terrainProfile.heightMultiplier : 1;
    terrainProfile.heightOffset = Number.isFinite(terrainProfile.heightOffset) ? terrainProfile.heightOffset : 0;
    biome.terrainProfile = terrainProfile;
  }

  return {
    BIOME_DEFS,
    BUMPY_BIOME_SUBDIVISIONS,
  };
}
