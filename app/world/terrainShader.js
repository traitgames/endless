import { buildTerrainDetailFragmentChunk } from "./terrainDetailShader.js";

export function configureTerrainMaterial({
  material,
  state,
  getDetailRenderDistance,
  THREE,
  fade = null,
  fadeSecondary = null,
  night = null,
  fog = null,
}) {
  const shaderState = { shader: null };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterLevel = { value: state.world.water.level };
    shader.uniforms.uTint = { value: new THREE.Color(state.world.terrainColor) };
    shader.uniforms.uDetailRenderDistance = { value: getDetailRenderDistance() };
    shader.uniforms.uDetailIntensity = { value: state.world?.terrainDetail?.intensity ?? 1 };
    if (fade) {
      shader.uniforms.uFadeStart = { value: fade.start };
      shader.uniforms.uFadeEnd = { value: fade.end };
      shader.uniforms.uFadeOpacity = { value: fade.opacity ?? 1 };
      shader.uniforms.uFadeInvert = { value: fade.invert ? 1 : 0 };
      shader.defines = shader.defines || {};
      shader.defines.USE_TERRAIN_FADE = "";
    }
    if (fadeSecondary) {
      shader.uniforms.uFadeStart2 = { value: fadeSecondary.start };
      shader.uniforms.uFadeEnd2 = { value: fadeSecondary.end };
      shader.uniforms.uFadeOpacity2 = { value: fadeSecondary.opacity ?? 1 };
      shader.uniforms.uFadeInvert2 = { value: fadeSecondary.invert ? 1 : 0 };
      shader.defines = shader.defines || {};
      shader.defines.USE_TERRAIN_FADE_SECONDARY = "";
    }
    if (night) {
      const nightAmount = typeof night.amount === "function" ? night.amount() : night.amount;
      shader.uniforms.uNightAmount = { value: nightAmount ?? 0 };
      shader.uniforms.uNightStrength = { value: night.strength ?? 0 };
      shader.uniforms.uNightStart = { value: night.start ?? 0 };
      shader.uniforms.uNightEnd = { value: night.end ?? 1 };
      shader.uniforms.uNightTint = { value: night.tint ?? new THREE.Color("#0b111a") };
      shader.uniforms.uNightFogStrength = { value: night.fogStrength ?? 0 };
      shader.defines = shader.defines || {};
      shader.defines.USE_TERRAIN_NIGHT = "";
    }
    if (fog) {
      shader.uniforms.uFogIntensity = { value: fog.intensity ?? 1 };
    }
    shaderState.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vWorldPos;
      varying vec3 vObjectNormal;
      attribute float detailBiome;
      attribute float detailBiomeFade;
      varying float vDetailBiome;
      varying float vDetailBiomeFade;
      `
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vObjectNormal = normal;
      vDetailBiome = detailBiome;
      vDetailBiomeFade = detailBiomeFade;
      `
      );
    const terrainDetailFragmentChunk = buildTerrainDetailFragmentChunk();
    const terrainFadeChunk = fade
      ? `
      uniform float uFadeStart;
      uniform float uFadeEnd;
      uniform float uFadeOpacity;
      uniform float uFadeInvert;
      `
      : "";
    const terrainFadeSecondaryChunk = fadeSecondary
      ? `
      uniform float uFadeStart2;
      uniform float uFadeEnd2;
      uniform float uFadeOpacity2;
      uniform float uFadeInvert2;
      `
      : "";
    const terrainNightChunk = night
      ? `
      uniform float uNightAmount;
      uniform float uNightStrength;
      uniform float uNightStart;
      uniform float uNightEnd;
      uniform vec3 uNightTint;
      uniform float uNightFogStrength;
      `
      : "";
    const terrainFogUniformChunk = fog
      ? `
      uniform float uFogIntensity;
      `
      : "";
    const terrainFogFragmentChunk = fog
      ? `
      #ifdef USE_FOG
        float fogFactor = 0.0;
        #ifdef FOG_EXP2
          float fogDistance = vFogDepth;
          fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDistance * fogDistance );
        #else
          fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
        #endif
        fogFactor *= clamp(uFogIntensity, 0.0, 1.0);
        vec3 fogColorOut = fogColor;
        #ifdef USE_TERRAIN_NIGHT
          float nightFog = clamp(uNightAmount * uNightFogStrength, 0.0, 1.0);
          fogColorOut = mix(fogColorOut, uNightTint, nightFog);
        #endif
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColorOut, fogFactor );
      #endif
      `
      : null;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
${terrainDetailFragmentChunk}
${terrainFadeChunk}
${terrainFadeSecondaryChunk}
${terrainNightChunk}
${terrainFogUniformChunk}
      `
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
      float h = vWorldPos.y;
      float slope = 1.0 - clamp(abs(normalize(vObjectNormal).y), 0.0, 1.0);
      float n = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 grass = vec3(0.34, 0.57, 0.30);
      vec3 denseGrass = vec3(0.23, 0.45, 0.22);
      vec3 rock = vec3(0.44, 0.42, 0.39);
      vec3 sand = vec3(0.71, 0.65, 0.50);
      vec3 snow = vec3(0.85, 0.88, 0.9);
      vec3 baseColor = mix(grass, denseGrass, smoothstep(0.0, 1.0, n));
      baseColor = mix(baseColor, rock, smoothstep(0.26, 0.72, slope));
      // Keep shoreline tint tightly coupled to the actual water plane.
      baseColor = mix(sand, baseColor, smoothstep(uWaterLevel - 0.15, uWaterLevel + 0.85, h));
      #ifdef USE_COLOR
      float biomeColorBlend = smoothstep(uWaterLevel + 0.15, uWaterLevel + 2.6, h);
      baseColor = mix(baseColor, vColor.rgb, 0.58 * biomeColorBlend);
      #endif
      baseColor = mix(baseColor, snow, smoothstep(38.0, 56.0, h));
      baseColor = mix(baseColor, baseColor * uTint, 0.16);
      baseColor = applyDetailLayer(baseColor, vWorldPos, vDetailBiome, uWaterLevel);
      #ifdef USE_TERRAIN_NIGHT
      float nightAmount = clamp(uNightAmount, 0.0, 1.0);
      float nightFade = smoothstep(uNightStart, uNightEnd, length(vWorldPos.xz - cameraPosition.xz));
      float nightMix = clamp(nightAmount * uNightStrength * nightFade, 0.0, 1.0);
      baseColor = mix(baseColor, uNightTint, nightMix);
      #endif
      vec4 diffuseColor = vec4(baseColor, opacity);
      #ifdef USE_TERRAIN_FADE
      float terrainFade = smoothstep(uFadeStart, uFadeEnd, length(vWorldPos.xz - cameraPosition.xz));
      terrainFade = mix(terrainFade, 1.0 - terrainFade, clamp(uFadeInvert, 0.0, 1.0));
      diffuseColor.a *= clamp(terrainFade * uFadeOpacity, 0.0, 1.0);
      #endif
      #ifdef USE_TERRAIN_FADE_SECONDARY
      float terrainFade2 = smoothstep(uFadeStart2, uFadeEnd2, length(vWorldPos.xz - cameraPosition.xz));
      terrainFade2 = mix(terrainFade2, 1.0 - terrainFade2, clamp(uFadeInvert2, 0.0, 1.0));
      diffuseColor.a *= clamp(terrainFade2 * uFadeOpacity2, 0.0, 1.0);
      #endif
      `
      );
    if (terrainFogFragmentChunk) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <fog_fragment>", terrainFogFragmentChunk);
    }
  };
  material.needsUpdate = true;
  return shaderState;
}
