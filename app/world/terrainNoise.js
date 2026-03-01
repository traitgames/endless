export function createTerrainHeightSampler({
  getNoiseSeed,
  getTerrain,
  terrainHorizontalScale,
  sampleBiomeTerrainBlend,
  getBiomeTerrainProfile,
  getWaterLevel,
  getDefaultBiomeTerrainProfile,
  biomeEdgeSmooth,
}) {
  const EDGE_SMOOTH_MAX = Number.isFinite(biomeEdgeSmooth?.max) ? biomeEdgeSmooth.max : 64;
  const EDGE_SMOOTH_START = Number.isFinite(biomeEdgeSmooth?.start) ? biomeEdgeSmooth.start : 3;
  function hash2(x, z) {
    const h = Math.sin(x * 127.1 + z * 311.7 + getNoiseSeed()) * 43758.5453;
    return h - Math.floor(h);
  }

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function clamp01(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }

  function smoothstep(edge0, edge1, x) {
    if (edge0 === edge1) return x >= edge1 ? 1 : 0;
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  const WETLAND_WATERLINE_COMPRESS = 0.45;
  const WETLAND_WATERLINE_BIAS = -0.35;
  const WETLAND_FLATTEN_START_METERS = 1.5;
  const WETLAND_FLATTEN_END_METERS = 6.5;
  const WETLAND_FLATTEN_DEPTH_SCALE = 0.6;
  const WETLAND_FLATTEN_DEPTH_BIAS = 0.9;

  function getWetlandWeight(blend) {
    if (!blend || !blend.count) return 0;
    let weight = 0;
    for (let i = 0; i < blend.count; i += 1) {
      const biome = blend.biomes[i];
      if (biome?.id === "wetland") {
        weight += blend.weights[i];
      }
    }
    return weight;
  }

  function applyWetlandWaterline(height, waterLevel, wetlandWeight) {
    if (!(wetlandWeight > 0) || !Number.isFinite(waterLevel)) return height;
    const relative = height - waterLevel + WETLAND_WATERLINE_BIAS;
    let adjusted = waterLevel + relative * WETLAND_WATERLINE_COMPRESS;
    if (adjusted < waterLevel) {
      const depth = waterLevel - adjusted;
      const flatten = smoothstep(WETLAND_FLATTEN_START_METERS, WETLAND_FLATTEN_END_METERS, depth);
      const targetDepth = Math.min(depth, depth * WETLAND_FLATTEN_DEPTH_SCALE + WETLAND_FLATTEN_DEPTH_BIAS);
      adjusted = waterLevel - lerp(depth, targetDepth, flatten);
    }
    return lerp(height, adjusted, clamp01(wetlandWeight));
  }

  function valueNoise(x, z) {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;

    const n00 = hash2(xi, zi);
    const n10 = hash2(xi + 1, zi);
    const n01 = hash2(xi, zi + 1);
    const n11 = hash2(xi + 1, zi + 1);

    const u = fade(xf);
    const v = fade(zf);

    const x1 = lerp(n00, n10, u);
    const x2 = lerp(n01, n11, u);

    return lerp(x1, x2, v) * 2 - 1;
  }

  function fbm(x, z, octaves, lacunarity, gain) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    for (let i = 0; i < octaves; i += 1) {
      sum += valueNoise(x * freq, z * freq) * amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum;
  }

  function billow(x, z, octaves, lacunarity, gain) {
    return Math.abs(fbm(x, z, octaves, lacunarity, gain)) * 2 - 1;
  }

  function ridgedNoise(x, z, octaves, lacunarity, gain) {
    return 1 - Math.abs(fbm(x, z, octaves, lacunarity, gain));
  }

  const MOUNTAIN_BIOME_THRESHOLD_METERS = 50;
  const mountainScratch = {
    gentleAdditiveHeight: 0,
    mountainAdditiveHeight: 0,
    totalAdditiveHeight: 0,
    rangeMask: 0,
    rangeClass: 0,
    peakPotential: 0,
  };
  const mountainCache = {
    valid: false,
    x: 0,
    z: 0,
    gentleAdditiveHeight: 0,
    mountainAdditiveHeight: 0,
    totalAdditiveHeight: 0,
    rangeMask: 0,
    rangeClass: 0,
    peakPotential: 0,
  };

  function copyMountainSample(target, source) {
    const out = target || {};
    out.gentleAdditiveHeight = source.gentleAdditiveHeight;
    out.mountainAdditiveHeight = source.mountainAdditiveHeight;
    out.totalAdditiveHeight = source.totalAdditiveHeight;
    out.rangeMask = source.rangeMask;
    out.rangeClass = source.rangeClass;
    out.peakPotential = source.peakPotential;
    return out;
  }

  function fillMountainAdditiveSample(x, z, target = mountainScratch) {
    if (mountainCache.valid && mountainCache.x === x && mountainCache.z === z) {
      return copyMountainSample(target, mountainCache);
    }

    const macroScale = 1 / (terrainHorizontalScale * 3000);
    const subScale = 1 / (terrainHorizontalScale * 1200);
    const ridgeScale = 1 / (terrainHorizontalScale * 3800);
    const shapeScale = 1 / (terrainHorizontalScale * 2200);
    const gentleScale = 1 / (terrainHorizontalScale * 5200);
    const phase = 0;

    let mx = x * macroScale;
    let mz = z * macroScale;
    const macroWarpX = fbm(mx * 1.6 + 13.7, mz * 1.6 - 7.9, 3, 2.05, 0.52);
    const macroWarpZ = fbm(mx * 1.6 - 11.1, mz * 1.6 + 9.3, 3, 2.05, 0.52);
    mx += macroWarpX * 0.22;
    mz += macroWarpZ * 0.22;

    const coarseField = clamp01(
      0.5 +
        fbm(mx + phase, mz - phase * 0.7, 4, 1.95, 0.52) * 0.19 +
        billow(mx * 0.63 - 21.4, mz * 0.63 + 8.2, 3, 2.0, 0.5) * 0.14 +
        fbm(mx * 0.27 + 4.1, mz * 0.27 - 3.8, 2, 2.1, 0.5) * 0.08
    );
    let sx = x * subScale;
    let sz = z * subScale;
    const subWarpX = fbm(sx * 1.9 + 6.3, sz * 1.9 - 12.7, 2, 2.1, 0.55);
    const subWarpZ = fbm(sx * 1.9 - 14.2, sz * 1.9 + 3.5, 2, 2.1, 0.55);
    sx += subWarpX * 0.2;
    sz += subWarpZ * 0.2;

    const lobeField = clamp01(
      0.5 +
        fbm(sx - phase * 0.3, sz + phase * 0.2, 3, 1.9, 0.54) * 0.18 +
        billow(sx * 0.9 + 17.1, sz * 0.9 - 5.4, 2, 2.0, 0.5) * 0.18
    );
    const mountainSelector = clamp01(coarseField * 0.2 + lobeField * 0.8);
    const mountainRegion = Math.pow(smoothstep(0.4, 0.82, mountainSelector), 1.5);
    const lobeMask = smoothstep(0.36, 0.8, lobeField);
    const macroMass = smoothstep(0.5, 0.74, coarseField);
    const rangeMask = clamp01(Math.pow(mountainRegion, 0.92) * (0.68 + 0.48 * lobeMask));
    const rangeClass = clamp01(macroMass * 0.25 + mountainRegion * 0.75);

    const gx = x * gentleScale;
    const gz = z * gentleScale;
    const gentleFbm = fbm(gx + phase * 0.4, gz - phase * 0.2, 3, 1.95, 0.5);
    const gentleBillow = billow(gx * 1.8 - 3.1, gz * 1.8 + 2.2, 2, 2.0, 0.52);
    const gentleAdditiveHeight = (gentleFbm * 2.8 + gentleBillow * 1.6) * (1 - rangeMask * 0.35);

    let shx = x * shapeScale;
    let shz = z * shapeScale;
    const shapeWarpX = fbm(shx * 1.5 + 22.4, shz * 1.5 - 10.5, 2, 2.1, 0.55);
    const shapeWarpZ = fbm(shx * 1.5 - 8.7, shz * 1.5 + 19.8, 2, 2.1, 0.55);
    shx += shapeWarpX * 0.34;
    shz += shapeWarpZ * 0.34;

    const massif = clamp01(0.5 + fbm(shx, shz, 4, 1.92, 0.5) * 0.32);
    const enclosure = clamp01(0.5 + fbm(shx * 0.62 + 9.8, shz * 0.62 - 12.1, 3, 1.9, 0.53) * 0.34);
    const calderaRingField = billow(shx * 0.78 - 5.2, shz * 0.78 + 14.6, 3, 2.0, 0.52);
    const calderaRing = 1 - clamp01(Math.abs(calderaRingField - 0.42) / 0.18);
    const valleyCarve = smoothstep(0.36, 0.88, billow(shx * 1.35 + 18.2, shz * 1.35 - 6.7, 3, 2.05, 0.5));

    let rx = x * ridgeScale;
    let rz = z * ridgeScale;
    const ridgeWarpX = fbm(rx * 1.7 - 7.4, rz * 1.7 + 11.6, 2, 2.15, 0.55);
    const ridgeWarpZ = fbm(rx * 1.7 + 16.8, rz * 1.7 - 9.1, 2, 2.15, 0.55);
    rx += ridgeWarpX * 0.28;
    rz += ridgeWarpZ * 0.28;

    const ridgeNetwork = ridgedNoise(rx + phase * 0.1, rz - phase * 0.1, 3, 1.95, 0.56);
    const ridgeSecondary = ridgedNoise(rx * 0.58 - 13.5, rz * 0.58 + 4.7, 3, 1.98, 0.55);
    const shoulderNoise = clamp01(0.5 + fbm(rx * 0.55 + 3.2, rz * 0.55 - 8.9, 3, 1.9, 0.52) * 0.28);
    const smoothRelief = clamp01(
      massif * 0.44 +
        enclosure * 0.22 +
        calderaRing * 0.16 +
        shoulderNoise * 0.18 -
        valleyCarve * 0.12
    );
    const ridgeRelief = clamp01(ridgeNetwork * 0.72 + ridgeSecondary * 0.28);
    const highRangeMask = Math.pow(rangeMask, 2.4);
    const upliftPotential =
      80 +
      Math.pow(mountainRegion, 1.0) * 170 +
      Math.pow(macroMass, 2.8) * 160 +
      highRangeMask * 260;
    const uplift = upliftPotential * Math.pow(smoothRelief, 0.95) * rangeMask;
    const ridgeBonus =
      12 * ridgeRelief * Math.pow(rangeMask, 2.2) * (0.2 + 0.8 * smoothRelief) * (0.55 + 0.45 * rangeClass);
    const valleyPenalty = 24 * valleyCarve * Math.pow(rangeMask, 1.15) * (0.35 + 0.65 * (1 - calderaRing));
    const mountainAdditiveHeight = Math.min(500, Math.max(0, uplift + ridgeBonus - valleyPenalty));
    const peakPotential = upliftPotential + 115 * Math.pow(rangeMask, 1.7);
    const totalAdditiveHeight = gentleAdditiveHeight + mountainAdditiveHeight;

    mountainCache.valid = true;
    mountainCache.x = x;
    mountainCache.z = z;
    mountainCache.gentleAdditiveHeight = gentleAdditiveHeight;
    mountainCache.mountainAdditiveHeight = mountainAdditiveHeight;
    mountainCache.totalAdditiveHeight = totalAdditiveHeight;
    mountainCache.rangeMask = rangeMask;
    mountainCache.rangeClass = rangeClass;
    mountainCache.peakPotential = peakPotential;

    return copyMountainSample(target, mountainCache);
  }

  function sampleBiomeTerrainHeightRaw(x, z, terrain, profile) {
    const noiseScaleMultiplier = profile?.noiseScaleMultiplier ?? 1;
    const baseHeightMultiplier = profile?.baseHeightMultiplier ?? 1;
    const ridgeScaleMultiplier = profile?.ridgeScaleMultiplier ?? 1;
    const ridgeHeightMultiplier = profile?.ridgeHeightMultiplier ?? 1;
    const octaves = Math.max(1, Math.floor(profile?.octaves ?? 4));
    const lacunarity = Number.isFinite(profile?.lacunarity) ? profile.lacunarity : 1.9;
    const gain = Number.isFinite(profile?.gain) ? profile.gain : 0.5;
    const warpStrength = Number.isFinite(profile?.warpStrength) ? profile.warpStrength : 0;
    const warpScaleMultiplier = Number.isFinite(profile?.warpScaleMultiplier) ? profile.warpScaleMultiplier : 1.7;
    const secondaryAmount = Number.isFinite(profile?.secondaryAmount) ? profile.secondaryAmount : 0;
    const algorithm = typeof profile?.noiseAlgorithm === "string" ? profile.noiseAlgorithm : "fbm_ridged";

    const scaledNoise = (terrain.noiseScale * noiseScaleMultiplier) / terrainHorizontalScale;
    const ridgeScale = terrain.ridgeScale * ridgeScaleMultiplier;
    const baseHeight = terrain.baseHeight * baseHeightMultiplier;
    const ridgeHeight = terrain.ridgeHeight * ridgeHeightMultiplier;

    let sampleX = x * scaledNoise;
    let sampleZ = z * scaledNoise;

    if (warpStrength > 0) {
      const warpFreq = warpScaleMultiplier;
      const wx = fbm(sampleX * warpFreq + 17.3, sampleZ * warpFreq - 9.2, 2, 2.1, 0.5);
      const wz = fbm(sampleX * warpFreq - 12.7, sampleZ * warpFreq + 23.4, 2, 2.1, 0.5);
      sampleX += wx * warpStrength;
      sampleZ += wz * warpStrength;
    }

    const baseFbm = fbm(sampleX, sampleZ, octaves, lacunarity, gain);
    const ridgeSample = ridgedNoise(sampleX * ridgeScale, sampleZ * ridgeScale, 3, 2.2, 0.6);
    const billowSample = billow(sampleX, sampleZ, octaves, lacunarity, gain);

    let base = baseFbm;
    let ridge = ridgeSample;

    switch (algorithm) {
      case "billow":
        base = billowSample;
        ridge = Math.abs(baseFbm);
        break;
      case "ridged":
        base = ridgeSample * 2 - 1;
        ridge = ridgeSample;
        break;
      case "warped":
        base = baseFbm;
        ridge = Math.abs(fbm(sampleX * ridgeScale, sampleZ * ridgeScale, 3, 2.05, 0.58));
        break;
      case "hybrid":
        base = baseFbm * 0.6 + billowSample * 0.4;
        ridge = ridgeSample * 0.7 + Math.abs(baseFbm) * 0.3;
        break;
      case "fbm_ridged":
      default:
        base = baseFbm;
        ridge = Math.abs(fbm(sampleX * ridgeScale, sampleZ * ridgeScale, 3, 2.2, 0.6));
        break;
    }

    if (secondaryAmount !== 0) {
      const secondary = fbm(sampleX * 2.8 + 31.7, sampleZ * 2.8 - 14.6, 2, 2.15, 0.55);
      base += secondary * secondaryAmount;
    }

    return base * baseHeight + ridge * ridgeHeight;
  }

  function sampleBiomeTerrainHeight(x, z, terrain, profile) {
    const center = sampleBiomeTerrainHeightRaw(x, z, terrain, profile);
    const gradientCap = Number.isFinite(profile?.gradientCap) ? Math.max(0, profile.gradientCap) : null;
    if (!Number.isFinite(gradientCap) || gradientCap == null) return center;

    const sampleMeters = Number.isFinite(profile?.gradientSampleMeters)
      ? Math.max(1, profile.gradientSampleMeters)
      : 4;
    const allowedDelta = gradientCap * sampleMeters;
    const left = sampleBiomeTerrainHeightRaw(x - sampleMeters, z, terrain, profile);
    const right = sampleBiomeTerrainHeightRaw(x + sampleMeters, z, terrain, profile);
    const down = sampleBiomeTerrainHeightRaw(x, z - sampleMeters, terrain, profile);
    const up = sampleBiomeTerrainHeightRaw(x, z + sampleMeters, terrain, profile);

    let lower = -Infinity;
    let upper = Infinity;
    const bounds = [left, right, down, up];
    for (let i = 0; i < bounds.length; i += 1) {
      const neighbor = bounds[i];
      lower = Math.max(lower, neighbor - allowedDelta);
      upper = Math.min(upper, neighbor + allowedDelta);
    }

    if (lower <= upper) return clamp(center, lower, upper);
    return (lower + upper) * 0.5;
  }

  const biomeBlendScratch = {
    count: 0,
    biomes: Array(8).fill(null),
    weights: Array(8).fill(0),
  };

  function sampleHeightWithBlend(x, z, blend) {
    const terrain = getTerrain();
    if (!blend || !blend.count) {
      const additive = fillMountainAdditiveSample(x, z);
      return sampleBiomeTerrainHeight(x, z, terrain, null) + additive.totalAdditiveHeight;
    }

    let height = 0;
    let totalWeight = 0;
    let dominantBiome = null;
    let dominantWeight = 0;
    for (let i = 0; i < blend.count; i += 1) {
      const weight = blend.weights[i];
      if (!(weight > 0)) continue;
      const biome = blend.biomes[i];
      const profile =
        typeof getBiomeTerrainProfile === "function" ? getBiomeTerrainProfile(biome) : biome?.terrainProfile || null;
      height += sampleBiomeTerrainHeight(x, z, terrain, profile) * weight;
      totalWeight += weight;
      if (!dominantBiome || weight > dominantWeight) {
        dominantBiome = biome;
        dominantWeight = weight;
      }
    }
    if (totalWeight <= 0) {
      const additive = fillMountainAdditiveSample(x, z);
      return sampleBiomeTerrainHeight(x, z, terrain, null) + additive.totalAdditiveHeight;
    }

    // Optional biome-edge smoothing: blend toward a default biome near borders to avoid cliffs.
    let defaultBiomeBlend = 0;
    if (Number.isFinite(EDGE_SMOOTH_MAX) && EDGE_SMOOTH_MAX > 0 && dominantBiome) {
      // Use drop in dominant weight as a proxy for proximity to a biome edge.
      const edgeWeight = clamp01(1 - dominantWeight); // 0 deep inside biome, approaches 1 near hard border.
      const easedEdge = edgeWeight * edgeWeight; // reduce smoothing effect when still solidly inside a biome
      const edgeMeters = easedEdge * EDGE_SMOOTH_MAX;
      defaultBiomeBlend = clamp01((edgeMeters - EDGE_SMOOTH_START) / (EDGE_SMOOTH_MAX - EDGE_SMOOTH_START));
    }
    const additive = fillMountainAdditiveSample(x, z);
    let blendedHeight = height / totalWeight + additive.totalAdditiveHeight;

    if (defaultBiomeBlend > 0 && typeof getDefaultBiomeTerrainProfile === "function") {
      const defaultProfile = getDefaultBiomeTerrainProfile();
      if (defaultProfile) {
        const defaultHeight = sampleBiomeTerrainHeight(x, z, terrain, defaultProfile) + additive.totalAdditiveHeight;
        // edgeT: 0 at border (full default), 1 deep inside dominant biome.
        const edgeT = 1 - defaultBiomeBlend;
        blendedHeight = lerp(defaultHeight, blendedHeight, edgeT);
      }
    }
    const wetlandWeight = getWetlandWeight(blend);
    if (wetlandWeight > 0 && typeof getWaterLevel === "function") {
      blendedHeight = applyWetlandWaterline(blendedHeight, getWaterLevel(), wetlandWeight);
    }
    return blendedHeight;
  }

  function heightAt(x, z) {
    if (typeof sampleBiomeTerrainBlend !== "function") {
      return sampleHeightWithBlend(x, z, null);
    }
    const blend = sampleBiomeTerrainBlend(x, z, biomeBlendScratch);
    return sampleHeightWithBlend(x, z, blend);
  }

  heightAt.sampleTerrainAdditive = (x, z, target) => fillMountainAdditiveSample(x, z, target);
  heightAt.sampleWithBiomeBlend = (x, z, blend) => sampleHeightWithBlend(x, z, blend);
  heightAt.mountainBiomeThresholdMeters = MOUNTAIN_BIOME_THRESHOLD_METERS;
  return heightAt;
}
