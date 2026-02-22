export function createTerrainHeightSampler({ getNoiseSeed, getTerrain, terrainHorizontalScale }) {
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

  return function heightAt(x, z) {
    const terrain = getTerrain();
    const scaledNoise = terrain.noiseScale / terrainHorizontalScale;
    const base = fbm(x * scaledNoise, z * scaledNoise, 4, 1.9, 0.5);
    const ridged = Math.abs(fbm(x * scaledNoise * terrain.ridgeScale, z * scaledNoise * terrain.ridgeScale, 3, 2.2, 0.6));
    return base * terrain.baseHeight + ridged * terrain.ridgeHeight;
  };
}
