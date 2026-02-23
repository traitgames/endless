export function createTerrainHeightSampler({
  getNoiseSeed,
  getTerrain,
  terrainHorizontalScale,
  sampleBiomeTerrainBlend,
  getBiomeTerrainProfile,
}) {
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

  function sampleBiomeTerrainHeight(x, z, terrain, profile) {
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

  const biomeBlendScratch = {
    count: 0,
    biomes: [null, null, null, null],
    weights: [0, 0, 0, 0],
  };

  return function heightAt(x, z) {
    const terrain = getTerrain();
    if (typeof sampleBiomeTerrainBlend !== "function") {
      return sampleBiomeTerrainHeight(x, z, terrain, null);
    }

    const blend = sampleBiomeTerrainBlend(x, z, biomeBlendScratch);
    if (!blend || !blend.count) {
      return sampleBiomeTerrainHeight(x, z, terrain, null);
    }

    let height = 0;
    let totalWeight = 0;
    for (let i = 0; i < blend.count; i += 1) {
      const weight = blend.weights[i];
      if (!(weight > 0)) continue;
      const biome = blend.biomes[i];
      const profile =
        typeof getBiomeTerrainProfile === "function" ? getBiomeTerrainProfile(biome) : biome?.terrainProfile || null;
      height += sampleBiomeTerrainHeight(x, z, terrain, profile) * weight;
      totalWeight += weight;
    }
    if (totalWeight <= 0) {
      return sampleBiomeTerrainHeight(x, z, terrain, null);
    }
    return height / totalWeight;
  };
}
