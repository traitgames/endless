export function buildTerrainDetailFragmentChunk() {
  return `
      uniform float uWaterLevel;
      uniform vec3 uTint;
      uniform float uDetailRenderDistance;
      uniform float uDetailIntensity;
      varying vec3 vWorldPos;
      varying vec3 vObjectNormal;
      varying float vDetailBiome;
      varying float vDetailBiomeFade;

      float detailHash12(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float detailNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = detailHash12(i);
        float b = detailHash12(i + vec2(1.0, 0.0));
        float c = detailHash12(i + vec2(0.0, 1.0));
        float d = detailHash12(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float detailWeight(float amount, float mask, float intensity) {
        return clamp(amount * mask * intensity, 0.0, 1.0);
      }

      vec3 applyDetailLayer(vec3 color, vec3 worldPos, float biomeType, float waterLevel) {
        float maxDist = max(uDetailRenderDistance, 0.0);
        if (maxDist <= 0.01) return color;
        float intensity = clamp(uDetailIntensity, 0.0, 3.0);
        if (intensity <= 0.001) return color;
        float distXZ = length(worldPos.xz - cameraPosition.xz);
        float fade = 1.0 - smoothstep(maxDist * 0.72, maxDist, distXZ);
        if (fade <= 0.001) return color;

        float biomeId = floor(biomeType + 0.5);
        vec2 p = worldPos.xz;
        float moistureMask = smoothstep(waterLevel + 0.25, waterLevel + 3.2, worldPos.y);
        float boundaryFade = smoothstep(0.08, 0.95, clamp(vDetailBiomeFade, 0.0, 1.0));
        float mask = clamp(fade * moistureMask * boundaryFade, 0.0, 1.0);
        if (mask <= 0.001) return color;

        if (biomeId == 1.0) {
          float crackA = abs(sin(p.x * 1.35 + detailNoise(p * 0.3) * 6.0));
          float crackB = abs(cos(p.y * 1.2 + detailNoise(p * 0.25 + 17.0) * 5.4));
          float facets = 1.0 - smoothstep(0.08, 0.22, crackA * crackB);
          float glitter = smoothstep(0.78, 0.96, detailNoise(p * 4.4)) * 0.5;
          vec3 iceTint = vec3(0.7, 0.86, 1.0);
          vec3 frostTint = vec3(0.85, 0.92, 1.0);
          color = mix(color, color * 0.74 + iceTint * 0.38, detailWeight(facets * 0.75, mask, intensity));
          color += frostTint * glitter * 0.18 * mask * intensity;
          return color;
        }

        if (biomeId == 2.0) {
          float mottled = detailNoise(p * 1.45) * 0.7 + detailNoise(p * 4.6) * 0.3;
          float patches = smoothstep(0.46, 0.78, mottled);
          float pebble = smoothstep(0.72, 0.92, detailNoise(p * 7.2));
          vec3 lichenTint = vec3(0.32, 0.34, 0.22);
          vec3 soilTint = vec3(0.22, 0.2, 0.14);
          color = mix(color, color * 0.68 + soilTint * 0.38, detailWeight(patches * 0.6, mask, intensity));
          color = mix(color, color * 0.8 + lichenTint * 0.3, detailWeight(pebble * 0.5, mask, intensity));
          return color;
        }

        if (biomeId == 3.0) {
          float needle = smoothstep(0.5, 0.85, detailNoise(p * 3.0 + vec2(4.3, 1.2)));
          float streak = abs(sin(p.y * 3.5 + detailNoise(p * 0.25) * 8.0));
          float bands = smoothstep(0.4, 0.78, streak);
          vec3 pineTint = vec3(0.12, 0.22, 0.14);
          vec3 soilTint = vec3(0.2, 0.18, 0.12);
          color = mix(color, color * 0.64 + pineTint * 0.42, detailWeight(needle * 0.72, mask, intensity));
          color = mix(color, color * 0.78 + soilTint * 0.32, detailWeight(bands * 0.45, mask, intensity));
          return color;
        }

        if (biomeId == 4.0) {
          float flowers = smoothstep(0.65, 0.9, detailNoise(p * 6.6));
          float clumps = smoothstep(0.4, 0.7, detailNoise(p * 1.35));
          vec3 bloomTint = vec3(0.2, 0.55, 0.28);
          vec3 sunTint = vec3(0.72, 0.74, 0.34);
          color = mix(color, color * 0.7 + bloomTint * 0.38, detailWeight(clumps * 0.65, mask, intensity));
          color = mix(color, color * 0.86 + sunTint * 0.24, detailWeight(flowers * 0.5, mask, intensity));
          return color;
        }

        if (biomeId == 5.0) {
          float leafLitter = smoothstep(0.48, 0.78, detailNoise(p * 2.1));
          float flecks = smoothstep(0.7, 0.92, detailNoise(p * 7.8 + leafLitter * 2.4));
          vec3 leafTint = vec3(0.25, 0.15, 0.08);
          vec3 mulchTint = vec3(0.14, 0.1, 0.06);
          color = mix(color, color * 0.6 + mulchTint * 0.44, detailWeight(leafLitter * 0.72, mask, intensity));
          color = mix(color, color * 0.78 + leafTint * 0.3, detailWeight(flecks * 0.5, mask, intensity));
          return color;
        }

        if (biomeId == 6.0) {
          float pool = smoothstep(0.4, 0.7, detailNoise(p * 1.1));
          float veins = 1.0 - smoothstep(0.15, 0.4, abs(sin(p.x * 2.0 + detailNoise(p * 0.35) * 6.0)));
          vec3 mudTint = vec3(0.1, 0.14, 0.1);
          vec3 mossTint = vec3(0.18, 0.32, 0.22);
          color = mix(color, color * 0.58 + mudTint * 0.48, detailWeight(pool * 0.75, mask, intensity));
          color = mix(color, color * 0.72 + mossTint * 0.34, detailWeight(veins * 0.55, mask, intensity));
          return color;
        }

        if (biomeId == 7.0) {
          float dune = abs(sin(p.x * 1.2 + detailNoise(p * 0.25) * 4.0));
          float ripples = smoothstep(0.2, 0.55, dune);
          float grit = smoothstep(0.55, 0.88, detailNoise(p * 6.2));
          vec3 sandTint = vec3(0.78, 0.65, 0.38);
          vec3 emberTint = vec3(0.78, 0.55, 0.26);
          color = mix(color, color * 0.74 + sandTint * 0.36, detailWeight(ripples * 0.78, mask, intensity));
          color = mix(color, color * 0.86 + emberTint * 0.26, detailWeight(grit * 0.5, mask, intensity));
          return color;
        }

        if (biomeId == 8.0) {
          float straw = detailNoise(vec2(p.x * 2.6 + p.y * 0.55, p.y * 1.1));
          float seeds = smoothstep(0.55, 0.86, detailNoise(p * 5.3));
          float dry = smoothstep(0.5, 0.85, straw) * 0.7 + seeds * 0.3;
          vec3 dryTint = vec3(0.72, 0.58, 0.24);
          vec3 ashTint = vec3(0.45, 0.36, 0.18);
          color = mix(color, color * 0.72 + dryTint * 0.36, detailWeight(dry * 0.7, mask, intensity));
          color = mix(color, color * 0.8 + ashTint * 0.3, detailWeight(seeds * 0.5, mask, intensity));
          return color;
        }

        if (biomeId == 9.0) {
          float striation = abs(sin(p.y * 1.6 + detailNoise(p * 0.25) * 7.0));
          float bands = smoothstep(0.25, 0.7, striation);
          float cracks = 1.0 - smoothstep(0.18, 0.32, detailNoise(p * 2.2));
          vec3 clayTint = vec3(0.56, 0.24, 0.18);
          vec3 rustTint = vec3(0.78, 0.35, 0.2);
          color = mix(color, color * 0.64 + clayTint * 0.46, detailWeight(bands * 0.78, mask, intensity));
          color = mix(color, color * 0.78 + rustTint * 0.34, detailWeight(cracks * 0.5, mask, intensity));
          return color;
        }

        return color;
      }
  `;
}
