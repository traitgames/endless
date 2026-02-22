import { buildTerrainDetailFragmentChunk } from "./terrainDetailShader.js";

export function configureTerrainMaterial({ material, state, getDetailRenderDistance, THREE }) {
  const shaderState = { shader: null };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterLevel = { value: state.world.water.level };
    shader.uniforms.uTint = { value: new THREE.Color(state.world.terrainColor) };
    shader.uniforms.uDetailRenderDistance = { value: getDetailRenderDistance() };
    shader.uniforms.uDetailIntensity = { value: state.world?.terrainDetail?.intensity ?? 1 };
    shaderState.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vWorldPos;
      varying vec3 vObjectNormal;
      attribute float detailBiome;
      varying float vDetailBiome;
      `
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vObjectNormal = normal;
      vDetailBiome = detailBiome;
      `
      );
    const terrainDetailFragmentChunk = buildTerrainDetailFragmentChunk();
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
${terrainDetailFragmentChunk}
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
      baseColor = mix(sand, baseColor, smoothstep(uWaterLevel - 0.4, uWaterLevel + 2.4, h));
      #ifdef USE_COLOR
      float biomeColorBlend = smoothstep(uWaterLevel + 0.2, uWaterLevel + 7.5, h);
      baseColor = mix(baseColor, vColor.rgb, 0.58 * biomeColorBlend);
      #endif
      baseColor = mix(baseColor, snow, smoothstep(38.0, 56.0, h));
      baseColor = mix(baseColor, baseColor * uTint, 0.16);
      baseColor = applyDetailLayer(baseColor, vWorldPos, vDetailBiome, uWaterLevel);
      vec4 diffuseColor = vec4(baseColor, opacity);
      `
      );
  };
  material.needsUpdate = true;
  return shaderState;
}
