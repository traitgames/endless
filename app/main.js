import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("scene");
const seedEl = document.getElementById("seed");
const chunkEl = document.getElementById("chunk");
let backendModeEl = document.getElementById("backend-mode");
const stateEl = document.getElementById("state");
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatClear = document.getElementById("chat-clear");
const chatPanel = document.getElementById("chat");
const chatMinimizeBtn = document.getElementById("chat-minimize");
const hudEl = document.getElementById("hud");
const resetSaveBtn = document.getElementById("reset-save");
const traceLog = document.getElementById("trace-log");

if (!backendModeEl) {
  const metrics = document.querySelector("#status .metrics");
  if (metrics) {
    const line = document.createElement("div");
    line.textContent = "Backend: ";
    backendModeEl = document.createElement("span");
    backendModeEl.id = "backend-mode";
    backendModeEl.textContent = "connecting";
    line.appendChild(backendModeEl);
    metrics.appendChild(line);
  }
}

const STORAGE_KEY = "endless_state_v1";
let resetInProgress = false;
const LEGACY_WORLD = {
  terrainColor: "#1d3b35",
  trees: {
    trunkColor: "#4c3826",
    canopyColor: "#2f6a3e",
  },
  water: {
    colorHex: "#0f2b2f",
  },
  fog: {
    colorHex: "#0b1112",
  },
};
const DEFAULT_WORLD = {
  terrain: {
    noiseScale: 0.03,
    baseHeight: 14,
    ridgeScale: 1.8,
    ridgeHeight: 6,
  },
  terrainColor: "#4f8b50",
  trees: {
    density: 0.22,
    trunkColor: "#5f4632",
    canopyColor: "#4a8953",
  },
  water: {
    level: 1.5,
    colorHex: "#4a93c7",
    opacity: 0.6,
  },
  fog: {
    colorHex: "#c5ddf4",
    density: 0.0012,
  },
  landmarks: [],
};

const DEFAULT_STATE = {
  seed: Math.floor(Math.random() * 1e9),
  world: DEFAULT_WORLD,
  timeOfDay: hash2(19, 47),
  ui: {
    chatOpen: false,
  },
  player: {
    position: { x: 0, y: 12, z: 0 },
    yaw: 0,
    pitch: 0,
  },
  chat: [],
};

const state = loadState();
seedEl.textContent = state.seed;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(state.world.fog.colorHex, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(state.world.fog.colorHex, state.world.fog.density);
scene.background = new THREE.Color("#8fc4ff");

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const hemiLight = new THREE.HemisphereLight(0xc6e0ff, 0x7f9974, 0.62);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.42);
sunLight.position.set(140, 180, 90);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -260;
sunLight.shadow.camera.right = 260;
sunLight.shadow.camera.top = 260;
sunLight.shadow.camera.bottom = -260;
sunLight.shadow.bias = -0.00015;
sunLight.shadow.normalBias = 0.03;
scene.add(sunLight);
scene.add(sunLight.target);
const moonLight = new THREE.DirectionalLight(0x9cb7e6, 0.2);
moonLight.position.set(-120, 60, -90);
moonLight.castShadow = false;
scene.add(moonLight);
scene.add(moonLight.target);
const shadowFillLight = new THREE.DirectionalLight(0x9bb3ce, 0.18);
shadowFillLight.position.set(-80, 90, -60);
shadowFillLight.castShadow = false;
scene.add(shadowFillLight);
scene.add(shadowFillLight.target);
const ambientLight = new THREE.AmbientLight(0xd2e6ff, 0.16);
scene.add(ambientLight);
const playerGlowLight = new THREE.PointLight(0x9ebcff, 0, 22, 1.05);
playerGlowLight.castShadow = false;
scene.add(playerGlowLight);
const playerGroundFill = new THREE.SpotLight(0xaec6ff, 0, 20, Math.PI * 0.52, 0.5, 1.1);
playerGroundFill.castShadow = false;
scene.add(playerGroundFill);
scene.add(playerGroundFill.target);

const skyUniforms = {
  topColor: { value: new THREE.Color("#66a9ff") },
  horizonColor: { value: new THREE.Color("#cde6ff") },
  groundColor: { value: new THREE.Color("#e6f2ff") },
  sunColor: { value: new THREE.Color("#fff6d9") },
  sunDirection: { value: new THREE.Vector3(0.6, 0.8, 0.2).normalize() },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(6000, 48, 24),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 groundColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPosition;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float heightMix = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        float nearHorizon = 1.0 - abs(dir.y);
        float horizonBoost = smoothstep(0.0, 0.7, nearHorizon);
        vec3 col = mix(groundColor, horizonColor, smoothstep(0.04, 0.56, heightMix));
        col = mix(col, topColor, smoothstep(0.5, 1.0, heightMix));
        float sunAmount = pow(max(dot(dir, normalize(sunDirection)), 0.0), 256.0);
        float sunGlow = pow(max(dot(dir, normalize(sunDirection)), 0.0), 10.0) * 0.34;
        col += sunColor * (sunAmount + sunGlow);
        col += vec3(0.09, 0.12, 0.16) * horizonBoost * 0.12;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
scene.add(sky);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(16, 20, 20),
  new THREE.MeshBasicMaterial({
    color: "#d5e3ff",
    transparent: true,
    opacity: 0.9,
  })
);
scene.add(moon);

function createCloudTexture(size = 256) {
  const cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = size;
  cloudCanvas.height = size;
  const ctx = cloudCanvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 18; i += 1) {
    const cx = size * (0.2 + Math.random() * 0.6);
    const cy = size * (0.24 + Math.random() * 0.5);
    const radius = size * (0.14 + Math.random() * 0.16);
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.72)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(cloudCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const cloudTexture = createCloudTexture();
const cloudGroup = new THREE.Group();
const CLOUD_FIELD_RADIUS = 1900;
const CLOUD_COUNT = 90;
if (cloudTexture) {
  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.32 + hash2(i * 29 + 17, i * 31 + 11) * 0.26,
        depthWrite: false,
      })
    );
    const spreadX = (hash2(i * 89 + 2, i * 43 + 7) - 0.5) * CLOUD_FIELD_RADIUS * 2;
    const spreadZ = (hash2(i * 61 + 5, i * 101 + 19) - 0.5) * CLOUD_FIELD_RADIUS * 2;
    const y = 110 + hash2(i * 17 + 13, i * 71 + 23) * 90;
    const size = 120 + hash2(i * 97 + 29, i * 37 + 31) * 180;
    sprite.position.set(spreadX, y, spreadZ);
    sprite.scale.set(size * 1.7, size, 1);
    cloudGroup.add(sprite);
  }
  scene.add(cloudGroup);
}

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshPhysicalMaterial({
    color: state.world.water.colorHex,
    transparent: true,
    opacity: state.world.water.opacity,
    roughness: 0.2,
    metalness: 0.03,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = state.world.water.level;
water.receiveShadow = true;
scene.add(water);

const atmosphereBase = {
  fogColor: new THREE.Color(state.world.fog.colorHex),
};
const DAY_NIGHT = {
  dayLengthSeconds: 240,
  sunDistance: 230,
  moonDistance: 210,
};
let worldTime = clampNumber(state.timeOfDay, 0, 1, hash2(19, 47)) * DAY_NIGHT.dayLengthSeconds;
const atmosphericColors = {
  dayTop: new THREE.Color("#66a9ff"),
  dayHorizon: new THREE.Color("#d9ecff"),
  dayGround: new THREE.Color("#ecf4ff"),
  sunsetTop: new THREE.Color("#4e6da8"),
  sunsetHorizon: new THREE.Color("#ff9d62"),
  sunsetGround: new THREE.Color("#efc086"),
  nightTop: new THREE.Color("#061426"),
  nightHorizon: new THREE.Color("#112743"),
  nightGround: new THREE.Color("#1a2436"),
  moonTint: new THREE.Color("#b2c8f4"),
};
const atmosphereTemp = {
  sunVector: new THREE.Vector3(),
  moonVector: new THREE.Vector3(),
  fillVector: new THREE.Vector3(),
  sunPos: new THREE.Vector3(),
  moonPos: new THREE.Vector3(),
  fillPos: new THREE.Vector3(),
  skyTop: new THREE.Color(),
  skyHorizon: new THREE.Color(),
  skyGround: new THREE.Color(),
  fogMix: new THREE.Color(),
};
const dynamicLightColors = {
  warmSun: new THREE.Color("#ff8f52"),
  daySun: new THREE.Color("#fff6da"),
  softSunset: new THREE.Color("#ffbf7d"),
  warmDirectSun: new THREE.Color("#ff965d"),
  dayDirectSun: new THREE.Color("#fff1cf"),
  sunsetDirectSun: new THREE.Color("#ffb777"),
  nightHemi: new THREE.Color("#7488ac"),
  dayHemi: new THREE.Color("#cfe6ff"),
  sunsetHemi: new THREE.Color("#ffc389"),
  nightGroundHemi: new THREE.Color("#242b36"),
  dayGroundHemi: new THREE.Color("#8aa078"),
  sunsetGroundHemi: new THREE.Color("#8f6e55"),
  nightAmbient: new THREE.Color("#7d98bf"),
  dayAmbient: new THREE.Color("#e4efff"),
  dayShadowFill: new THREE.Color("#c8defa"),
  sunsetShadowFill: new THREE.Color("#ffbf92"),
  nightShadowFill: new THREE.Color("#6c85b3"),
  moonWarm: new THREE.Color("#f7f2de"),
  mutedNight: new THREE.Color("#5f6f86"),
};

const terrainMaterial = new THREE.MeshStandardMaterial({
  color: state.world.terrainColor,
  roughness: 0.95,
  metalness: 0.05,
});
const terrainShaderState = { shader: null };
terrainMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uWaterLevel = { value: state.world.water.level };
  shader.uniforms.uTint = { value: new THREE.Color(state.world.terrainColor) };
  terrainShaderState.shader = shader;
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vWorldPos;
      varying vec3 vObjectNormal;
      `
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vObjectNormal = normal;
      `
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      uniform float uWaterLevel;
      uniform vec3 uTint;
      varying vec3 vWorldPos;
      varying vec3 vObjectNormal;
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
      baseColor = mix(baseColor, snow, smoothstep(38.0, 56.0, h));
      baseColor *= uTint;
      vec4 diffuseColor = vec4(baseColor, opacity);
      `
    );
};
terrainMaterial.needsUpdate = true;

const CHUNK_SIZE = 64;
const CHUNK_RES = 32;
const CHUNK_RADIUS = 8;
const chunks = new Map();
const treeChunks = new Map();
const landmarkGroup = new THREE.Group();
scene.add(landmarkGroup);
const treeTrunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 5.2, 8);
const treeCanopyConeGeometry = new THREE.ConeGeometry(1.05, 5.2, 10);
const treeCanopySphereGeometry = new THREE.SphereGeometry(1.45, 10, 8);
const treeTrunkMaterial = new THREE.MeshStandardMaterial({
  color: state.world.trees.trunkColor,
  roughness: 0.94,
  metalness: 0.02,
});
const treeCanopyMaterials = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.01 }));
const TERRAIN_HORIZONTAL_SCALE = 3;

function buildCanopyPalette(baseHex) {
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const darker = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.max(0, hsl.l * 0.78));
  const mid = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.0), Math.min(1, hsl.l * 0.98));
  const lighter = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.94), Math.min(1, hsl.l * 1.22));
  return [darker, mid, lighter];
}

function syncTreeMaterials() {
  treeTrunkMaterial.color.set(state.world.trees.trunkColor);
  const palette = buildCanopyPalette(state.world.trees.canopyColor);
  palette.forEach((color, index) => {
    treeCanopyMaterials[index].color.copy(color);
  });
}
syncTreeMaterials();

function syncTerrainShaderUniforms() {
  if (!terrainShaderState.shader) return;
  terrainShaderState.shader.uniforms.uWaterLevel.value = state.world.water.level;
  terrainShaderState.shader.uniforms.uTint.value.set(state.world.terrainColor);
}

function syncAtmosphereFromState() {
  atmosphereBase.fogColor.set(state.world.fog.colorHex);
  scene.fog.color.set(atmosphereBase.fogColor);
  renderer.setClearColor(atmosphereBase.fogColor, 1);
}
syncAtmosphereFromState();

function smoothstep(edge0, edge1, x) {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1, 0);
  return t * t * (3 - 2 * t);
}

function updateDayNightCycle(dt) {
  worldTime = (worldTime + dt) % DAY_NIGHT.dayLengthSeconds;
  const cycle = worldTime / DAY_NIGHT.dayLengthSeconds;
  state.timeOfDay = cycle;
  const sunAngle = cycle * Math.PI * 2 - Math.PI / 2;
  const moonAngle = sunAngle + Math.PI;

  const sunVector = atmosphereTemp.sunVector.set(
    Math.cos(sunAngle),
    Math.sin(sunAngle),
    Math.sin(sunAngle * 0.7 + 1.1) * 0.55
  ).normalize();
  const moonVector = atmosphereTemp.moonVector.set(
    Math.cos(moonAngle),
    Math.sin(moonAngle),
    Math.sin(moonAngle * 0.66 + 0.4) * 0.5
  ).normalize();

  const dayAmount = smoothstep(-0.08, 0.2, sunVector.y);
  const nightAmount = 1 - dayAmount;
  const nightMute = smoothstep(0.2, 1, nightAmount);
  const twilightBand = 1 - clampNumber(Math.abs(sunVector.y) / 0.28, 0, 1, 1);
  const twilight = twilightBand * (0.35 + 0.65 * nightAmount);

  const sunPos = atmosphereTemp.sunPos.copy(sunVector).multiplyScalar(DAY_NIGHT.sunDistance).add(player.position);
  const moonPos = atmosphereTemp.moonPos.copy(moonVector).multiplyScalar(DAY_NIGHT.moonDistance).add(player.position);
  const fillVector = atmosphereTemp.fillVector
    .set(-sunVector.x * 0.85, Math.max(0.2, 0.28 + nightAmount * 0.52), -sunVector.z * 0.85)
    .normalize();
  const fillPos = atmosphereTemp.fillPos.copy(fillVector).multiplyScalar(DAY_NIGHT.sunDistance * 0.78).add(player.position);
  sunLight.position.copy(sunPos);
  moonLight.position.copy(moonPos);
  shadowFillLight.position.copy(fillPos);
  moon.position.copy(moonPos);
  moon.position.y = Math.max(moon.position.y, 14);
  sunLight.target.position.set(player.position.x, 0, player.position.z);
  moonLight.target.position.set(player.position.x, 0, player.position.z);
  shadowFillLight.target.position.set(player.position.x, 0, player.position.z);
  skyUniforms.sunDirection.value.copy(sunVector);

  const skyTop = atmosphereTemp.skyTop
    .copy(atmosphericColors.nightTop)
    .lerp(atmosphericColors.dayTop, dayAmount)
    .lerp(atmosphericColors.sunsetTop, twilight * 0.8);
  const skyHorizon = atmosphereTemp.skyHorizon
    .copy(atmosphericColors.nightHorizon)
    .lerp(atmosphericColors.dayHorizon, dayAmount)
    .lerp(atmosphericColors.sunsetHorizon, twilight);
  const skyGround = atmosphereTemp.skyGround
    .copy(atmosphericColors.nightGround)
    .lerp(atmosphericColors.dayGround, dayAmount)
    .lerp(atmosphericColors.sunsetGround, twilight * 0.75);
  const fogMix = atmosphereTemp.fogMix.copy(atmosphereBase.fogColor).lerp(skyHorizon, 0.42 + dayAmount * 0.26);
  skyTop.lerp(dynamicLightColors.mutedNight, nightMute * 0.26);
  skyHorizon.lerp(dynamicLightColors.mutedNight, nightMute * 0.2);
  skyGround.lerp(dynamicLightColors.mutedNight, nightMute * 0.34);
  fogMix.lerp(dynamicLightColors.mutedNight, nightMute * 0.28);

  skyUniforms.topColor.value.copy(skyTop);
  skyUniforms.horizonColor.value.copy(skyHorizon);
  skyUniforms.groundColor.value.copy(skyGround);
  skyUniforms.sunColor.value
    .copy(dynamicLightColors.warmSun)
    .lerp(dynamicLightColors.daySun, dayAmount)
    .lerp(dynamicLightColors.softSunset, twilight * 0.8);
  scene.fog.color.copy(fogMix);
  scene.background.copy(skyHorizon);

  sunLight.intensity = 0.05 + dayAmount * 1.28 + twilight * 0.22;
  sunLight.color
    .copy(dynamicLightColors.warmDirectSun)
    .lerp(dynamicLightColors.dayDirectSun, dayAmount)
    .lerp(dynamicLightColors.sunsetDirectSun, twilight * 0.85);
  sunLight.castShadow = dayAmount > 0.12;

  moonLight.intensity = 0.02 + nightAmount * 0.31;
  shadowFillLight.intensity = 0.05 + dayAmount * 0.12 + twilight * 0.1 + nightAmount * 0.16;
  shadowFillLight.color
    .copy(dynamicLightColors.nightShadowFill)
    .lerp(dynamicLightColors.dayShadowFill, dayAmount)
    .lerp(dynamicLightColors.sunsetShadowFill, twilight * 0.5);
  hemiLight.intensity = 0.11 + dayAmount * 0.68 + twilight * 0.12;
  hemiLight.color.copy(dynamicLightColors.nightHemi).lerp(dynamicLightColors.dayHemi, dayAmount).lerp(dynamicLightColors.sunsetHemi, twilight * 0.3);
  hemiLight.groundColor
    .copy(dynamicLightColors.nightGroundHemi)
    .lerp(dynamicLightColors.dayGroundHemi, dayAmount)
    .lerp(dynamicLightColors.sunsetGroundHemi, twilight * 0.4);
  ambientLight.intensity = 0.045 + dayAmount * 0.17 + twilight * 0.05;
  ambientLight.color.copy(dynamicLightColors.nightAmbient).lerp(dynamicLightColors.dayAmbient, dayAmount);
  const nightGlow = smoothstep(0.2, 1, nightAmount);
  playerGlowLight.position.set(player.position.x, player.position.y + 1.4, player.position.z);
  playerGlowLight.intensity = 0.06 + twilight * 0.08 + nightGlow * 1.15;
  playerGroundFill.color.copy(dynamicLightColors.nightShadowFill).lerp(dynamicLightColors.dayShadowFill, dayAmount * 0.45);
  playerGroundFill.position.set(player.position.x, player.position.y + 8.8, player.position.z);
  playerGroundFill.target.position.set(player.position.x, player.position.y - 1.6, player.position.z);
  playerGroundFill.intensity = 0.08 + twilight * 0.11 + nightGlow * 1.05;

  moon.material.opacity = clampNumber(0.08 + nightAmount * 0.9, 0.08, 0.95, 0.4);
  moon.material.color
    .copy(atmosphericColors.moonTint)
    .lerp(dynamicLightColors.moonWarm, twilight * 0.2);
}

function heightAt(x, z) {
  const terrain = state.world.terrain;
  const scaledNoise = terrain.noiseScale / TERRAIN_HORIZONTAL_SCALE;
  const base = fbm(x * scaledNoise, z * scaledNoise, 4, 1.9, 0.5);
  const ridged = Math.abs(
    fbm(x * scaledNoise * terrain.ridgeScale, z * scaledNoise * terrain.ridgeScale, 3, 2.2, 0.6)
  );
  return base * terrain.baseHeight + ridged * terrain.ridgeHeight;
}

function ensureChunks(cx, cz) {
  for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz += 1) {
    for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx += 1) {
      const key = `${cx + dx},${cz + dz}`;
      if (!chunks.has(key)) {
        const mesh = buildChunk(cx + dx, cz + dz);
        scene.add(mesh);
        chunks.set(key, mesh);
      }
      ensureTreeChunk(cx + dx, cz + dz, key);
    }
  }

  for (const [key, mesh] of chunks.entries()) {
    const [x, z] = key.split(",").map(Number);
    if (Math.abs(x - cx) > CHUNK_RADIUS + 1 || Math.abs(z - cz) > CHUNK_RADIUS + 1) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      const treeGroup = treeChunks.get(key);
      if (treeGroup) {
        scene.remove(treeGroup);
      }
      treeChunks.delete(key);
      chunks.delete(key);
    }
  }
}

function clearChunks() {
  chunks.forEach((mesh) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
  });
  chunks.clear();
  treeChunks.forEach((treeGroup) => {
    scene.remove(treeGroup);
  });
  treeChunks.clear();
}

function rebuildTerrain() {
  clearChunks();
  const cx = Math.floor(player.position.x / CHUNK_SIZE);
  const cz = Math.floor(player.position.z / CHUNK_SIZE);
  ensureChunks(cx, cz);
  rebuildLandmarks();
}

function rebuildLandmarks() {
  landmarkGroup.clear();
  for (const descriptor of state.world.landmarks) {
    const mesh = createLandmarkMesh(descriptor);
    landmarkGroup.add(mesh);
  }
}

function ensureTreeChunk(cx, cz, key = `${cx},${cz}`) {
  const density = state.world.trees.density;
  if (density <= 0) {
    const existing = treeChunks.get(key);
    if (existing) scene.remove(existing);
    treeChunks.delete(key);
    return;
  }
  if (treeChunks.has(key)) return;
  const group = buildTreeChunk(cx, cz);
  if (!group) return;
  scene.add(group);
  treeChunks.set(key, group);
}

function buildTreeChunk(cx, cz) {
  const density = state.world.trees.density;
  const treesPerChunk = Math.max(0, Math.floor(density * 30));
  if (treesPerChunk < 1) return null;

  const group = new THREE.Group();
  group.position.set(0, 0, 0);
  const chunkWorldX = cx * CHUNK_SIZE;
  const chunkWorldZ = cz * CHUNK_SIZE;

  for (let i = 0; i < treesPerChunk; i += 1) {
    const px = hash2(cx * 71 + i * 17 + 1013, cz * 37 + i * 29 + 2203);
    const pz = hash2(cx * 43 + i * 19 + 3301, cz * 67 + i * 31 + 1109);
    const localX = px * CHUNK_SIZE - CHUNK_SIZE * 0.5;
    const localZ = pz * CHUNK_SIZE - CHUNK_SIZE * 0.5;
    const worldX = chunkWorldX + localX;
    const worldZ = chunkWorldZ + localZ;
    const groundY = heightAt(worldX, worldZ);

    if (groundY <= state.world.water.level + 0.4) continue;
    const slope =
      Math.abs(heightAt(worldX + 1, worldZ) - groundY) + Math.abs(heightAt(worldX, worldZ + 1) - groundY);
    if (slope > 2.4) continue;

    const scale = 0.7 + hash2(cx * 97 + i * 13 + 7, cz * 83 + i * 11 + 17) * 0.9;

    const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
    trunk.position.set(worldX, groundY + 2.0 * scale, worldZ);
    trunk.scale.set(1.5 * scale, scale, 1.5 * scale);
    trunk.receiveShadow = true;
    trunk.castShadow = scale > 0.92;
    group.add(trunk);

    const canopyMaterial =
      treeCanopyMaterials[Math.floor(hash2(cx * 181 + i * 9 + 17, cz * 223 + i * 13 + 43) * treeCanopyMaterials.length)];
    const variant = Math.floor(hash2(cx * 131 + i * 7 + 31, cz * 197 + i * 5 + 61) * 3);

    if (variant === 0) {
      const canopy = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      canopy.position.set(worldX, groundY + 5.6 * scale, worldZ);
      canopy.scale.set(1.95 * scale, scale, 1.95 * scale);
      canopy.receiveShadow = true;
      canopy.castShadow = scale > 0.96;
      group.add(canopy);
    } else if (variant === 1) {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 6.1 * scale, worldZ);
      canopyMain.scale.set(1.5 * scale, 1.16 * scale, 1.5 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.92;
      group.add(canopyMain);

      const canopyCap = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyCap.position.set(worldX + 0.25 * scale, groundY + 7.3 * scale, worldZ - 0.18 * scale);
      canopyCap.scale.set(0.84 * scale, 0.68 * scale, 0.84 * scale);
      canopyCap.receiveShadow = true;
      canopyCap.castShadow = false;
      group.add(canopyCap);
    } else {
      const lower = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      lower.position.set(worldX, groundY + 5.1 * scale, worldZ);
      lower.scale.set(1.9 * scale, 0.88 * scale, 1.9 * scale);
      lower.receiveShadow = true;
      lower.castShadow = scale > 1.0;
      group.add(lower);

      const upper = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      upper.position.set(worldX, groundY + 7.0 * scale, worldZ);
      upper.scale.set(1.2 * scale, 0.78 * scale, 1.2 * scale);
      upper.receiveShadow = true;
      upper.castShadow = false;
      group.add(upper);
    }
  }

  return group.children.length > 0 ? group : null;
}

function createLandmarkMesh(descriptor) {
  const kind = descriptor.kind === "beacon" ? "beacon" : "pillar";
  const scale = clampNumber(descriptor.scale, 0.3, 8, 1);
  const x = clampNumber(descriptor.x, -10000, 10000, 0);
  const z = clampNumber(descriptor.z, -10000, 10000, 0);
  const yOffset = clampNumber(descriptor.yOffset, -20, 100, 2);
  const colorHex = toColorHex(descriptor.colorHex, kind === "beacon" ? "#f1b04f" : "#89e6c7");

  const geometry =
    kind === "beacon"
      ? new THREE.ConeGeometry(0.8 * scale, 3.5 * scale, 10)
      : new THREE.CylinderGeometry(0.7 * scale, 1.0 * scale, 5.2 * scale, 12);
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.35,
    metalness: 0.2,
    emissive: kind === "beacon" ? colorHex : "#000000",
    emissiveIntensity: kind === "beacon" ? 0.22 : 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const y = heightAt(x, z) + yOffset;
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function buildChunk(cx, cz) {
  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_RES, CHUNK_RES);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i += 1) {
    const x = vertices.getX(i) + cx * CHUNK_SIZE;
    const z = vertices.getZ(i) + cz * CHUNK_SIZE;
    const y = heightAt(x, z);
    vertices.setY(i, y);
  }
  vertices.needsUpdate = true;
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, terrainMaterial);
  mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

const player = {
  position: new THREE.Vector3(state.player.position.x, state.player.position.y, state.player.position.z),
  velocity: new THREE.Vector3(),
  yaw: state.player.yaw,
  pitch: state.player.pitch,
  grounded: false,
};

const keys = new Set();
let pointerLocked = false;
let chatOpen = false;
let suppressNextUnlockChatOpen = false;
let resumePointerLockAfterUnlock = false;
let lastEscapeChatCloseAt = -Infinity;
const ESCAPE_CHAT_REOPEN_GUARD_MS = 250;

function isChatFocused() {
  return document.activeElement === chatInput;
}

function setChatOpen(open, { focusInput = false } = {}) {
  chatOpen = open;
  state.ui.chatOpen = open;
  chatPanel.classList.toggle("minimized", !open);
  chatPanel.setAttribute("aria-expanded", String(open));
  hudEl.classList.toggle("compact", !open);
  chatMinimizeBtn.textContent = open ? "Hide" : "Create";
  chatMinimizeBtn.setAttribute("aria-label", open ? "Hide create panel" : "Open create panel");

  if (!open && document.activeElement === chatInput) {
    chatInput.blur();
  }

  if (open && focusInput && document.activeElement !== chatInput) {
    chatInput.focus();
  }
}

function setPaused(paused) {
  if (paused) {
    keys.clear();
    if (pointerLocked) {
      suppressNextUnlockChatOpen = true;
      document.exitPointerLock();
    }
    return;
  }

  if (!pointerLocked && document.activeElement !== chatInput) {
    canvas.requestPointerLock();
  }
}

function toggleChatPause() {
  const nextChatOpen = !chatOpen;
  setChatOpen(nextChatOpen, { focusInput: nextChatOpen });
  setPaused(nextChatOpen);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (!chatOpen) {
      // Ignore stale/late Escape events right after an explicit Escape-close.
      if (performance.now() - lastEscapeChatCloseAt < ESCAPE_CHAT_REOPEN_GUARD_MS) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      setChatOpen(true, { focusInput: true });
    } else {
      lastEscapeChatCloseAt = performance.now();
      if (pointerLocked) {
        suppressNextUnlockChatOpen = true;
        resumePointerLockAfterUnlock = true;
      }
      setChatOpen(false);
      setPaused(false);
    }
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (isChatFocused()) {
    return;
  }

  if (event.code === "Enter") {
    if (document.activeElement !== chatInput) {
      setChatOpen(true, { focusInput: true });
      event.preventDefault();
    }
  }

  keys.add(event.code);

  if (event.code === "KeyR") {
    player.position.set(0, 12, 0);
    player.velocity.set(0, 0, 0);
  }
}, true);

window.addEventListener("keyup", (event) => {
  if (isChatFocused()) return;
  keys.delete(event.code);
});

canvas.addEventListener("click", () => {
  if (!pointerLocked && !chatOpen && document.activeElement !== chatInput) {
    canvas.requestPointerLock();
  }
});

chatInput.addEventListener("focus", () => {
  if (pointerLocked) {
    suppressNextUnlockChatOpen = true;
    document.exitPointerLock();
  }
  keys.clear();
});

chatMinimizeBtn?.addEventListener("click", () => {
  setChatOpen(!chatOpen, { focusInput: !chatOpen });
});

window.addEventListener("mousemove", (event) => {
  if (!pointerLocked) return;
  const sensitivity = 0.002;
  player.yaw -= event.movementX * sensitivity;
  player.pitch -= event.movementY * sensitivity;
  const maxPitch = Math.PI / 2 - 0.02;
  player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch));
});

document.addEventListener("pointerlockchange", () => {
  const wasPointerLocked = pointerLocked;
  pointerLocked = document.pointerLockElement === canvas;
  const suppressAutoOpen = suppressNextUnlockChatOpen;
  suppressNextUnlockChatOpen = false;

  if (resumePointerLockAfterUnlock && wasPointerLocked && !pointerLocked && !chatOpen && document.hasFocus()) {
    resumePointerLockAfterUnlock = false;
    canvas.requestPointerLock();
    return;
  }

  if (pointerLocked) {
    resumePointerLockAfterUnlock = false;
  }

  if (suppressAutoOpen) {
    return;
  }

  if (performance.now() - lastEscapeChatCloseAt < ESCAPE_CHAT_REOPEN_GUARD_MS) {
    return;
  }

  // If pointer lock is released while chat is minimized (e.g. first Escape),
  // open chat immediately so a second Escape isn't required.
  if (wasPointerLocked && !pointerLocked && !chatOpen && document.hasFocus()) {
    setChatOpen(true, { focusInput: true });
  }
});

const clock = new THREE.Clock();

function updatePlayer(dt) {
  const speed = keys.has("ShiftLeft") ? 10 : 6;
  const dir = new THREE.Vector3();
  if (keys.has("KeyW")) dir.z -= 1;
  if (keys.has("KeyS")) dir.z += 1;
  if (keys.has("KeyA")) dir.x -= 1;
  if (keys.has("KeyD")) dir.x += 1;

  if (dir.lengthSq() > 0) {
    dir.normalize();
    const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = forward.multiplyScalar(dir.z).add(right.multiplyScalar(dir.x));
    player.velocity.x = move.x * speed;
    player.velocity.z = move.z * speed;
  } else {
    player.velocity.x *= 0.86;
    player.velocity.z *= 0.86;
  }

  if (keys.has("Space") && player.grounded) {
    player.velocity.y = 9;
    player.grounded = false;
  }

  player.velocity.y -= 18 * dt;

  player.position.addScaledVector(player.velocity, dt);

  const ground = heightAt(player.position.x, player.position.z) + 2.2;
  if (player.position.y <= ground) {
    player.position.y = ground;
    player.velocity.y = 0;
    player.grounded = true;
  }

  const cx = Math.floor(player.position.x / CHUNK_SIZE);
  const cz = Math.floor(player.position.z / CHUNK_SIZE);
  ensureChunks(cx, cz);
  chunkEl.textContent = `${cx},${cz}`;

  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  updateDayNightCycle(dt);
  sky.position.set(player.position.x, 0, player.position.z);
  if (cloudGroup.parent) {
    cloudGroup.position.set(
      player.position.x * 0.34 + Math.sin(clock.elapsedTime * 0.03) * 90,
      0,
      player.position.z * 0.34 + Math.cos(clock.elapsedTime * 0.025) * 90
    );
  }
  const targetOpacity = state.world.water.opacity;
  water.material.opacity = clampNumber(
    targetOpacity + Math.sin(clock.elapsedTime * 0.6) * 0.04,
    0.05,
    1,
    targetOpacity
  );
  water.position.x = player.position.x;
  water.position.z = player.position.z;
  if (water.material instanceof THREE.MeshPhysicalMaterial) {
    water.material.roughness = clampNumber(0.2 + Math.sin(clock.elapsedTime * 0.35) * 0.04, 0.12, 0.3, 0.2);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

ensureChunks(0, 0);
rebuildLandmarks();
animate();
setChatOpen(Boolean(state.ui?.chatOpen));

const chatState = state.chat;
pruneSystemConnectionMessages(chatState);
chatState.forEach((entry) => {
  renderChatEntry(entry);
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addChatEntry({ role: "user", content: message, ts: Date.now() });
  chatInput.value = "";
  sendToCodex(resolveChatCommand(message));
});

resetSaveBtn?.addEventListener("click", () => {
  const confirmed = window.confirm("Reset saved world, player position, and chat history?");
  if (!confirmed) return;
  resetInProgress = true;
  clearInterval(saveTimer);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

chatClear.addEventListener("click", () => {
  chatState.length = 0;
  chatLog.textContent = "";
  saveState();
});

function addChatEntry(entry) {
  chatState.push(entry);
  renderChatEntry(entry);
}

function addTransientChatEntry(entry) {
  renderChatEntry(entry);
}

function renderChatEntry(entry) {
  const node = document.createElement("div");
  node.className = `chat-entry ${entry.role}`;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = entry.role.replace("_", " ");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = entry.content;
  node.append(meta, bubble);
  chatLog.appendChild(node);
  chatLog.scrollTop = chatLog.scrollHeight;
}

let codexWorker = null;
let wsBridge = null;
const ALLOW_WORKER_FALLBACK =
  localStorage.getItem("endless_allow_worker_fallback") === "1" || window.ENABLE_SIM_WORKER === true;
const AUTO_SOFT_REFRESH = localStorage.getItem("endless_auto_soft_refresh") !== "0";
let refreshScheduled = false;

function handleCodexPayload(payload) {
  if (!payload) return;
  if (payload.type === "backend_info") {
    const mode = typeof payload.mode === "string" ? payload.mode : "unknown";
    backendModeEl.textContent = mode;
    return;
  }
  if (payload.type === "route_info") {
    const route = typeof payload.route === "string" ? payload.route : "unknown";
    backendModeEl.textContent = route;
    return;
  }
  if (payload.type === "trace") {
    const phrase = typeof payload.phrase === "string" ? payload.phrase : "trace event";
    addTracePhrase(phrase, payload.status);
    return;
  }
  if (payload.type === "thinking") {
    addChatEntry({ role: "codex_thinking", content: payload.content, ts: Date.now() });
    stateEl.textContent = "thinking";
  }
  if (payload.type === "output") {
    addChatEntry({ role: "codex_output", content: payload.content, ts: Date.now() });
    stateEl.textContent = "ready";
  }
  if (payload.type === "update") {
    applyUpdate(payload.update);
  }
}

function setupWebSocketBridge() {
  if (wsBridge) return wsBridge;
  const url = localStorage.getItem("endless_ws_url") || "ws://localhost:8787";
  if (backendModeEl) backendModeEl.textContent = "connecting";
  let socket = new WebSocket(url);
  let ready = false;
  const pending = new Map();
  let connectWaiters = [];

  const resolveConnectWaiters = (ok) => {
    connectWaiters.forEach((resolve) => resolve(ok));
    connectWaiters = [];
  };

  const waitForOpen = (timeoutMs = 5000) =>
    new Promise((resolve) => {
      if (ready && socket.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }
      connectWaiters.push(resolve);
      setTimeout(() => {
        const idx = connectWaiters.indexOf(resolve);
        if (idx >= 0) {
          connectWaiters.splice(idx, 1);
          resolve(false);
        }
      }, timeoutMs);
    });

  socket.addEventListener("open", () => {
    ready = true;
    if (backendModeEl && backendModeEl.textContent === "connecting") {
      backendModeEl.textContent = "connected";
    }
    resolveConnectWaiters(true);
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.requestId && pending.has(payload.requestId) && payload.type === "final") {
        pending.get(payload.requestId)(payload.reply || null);
        pending.delete(payload.requestId);
        return;
      }
      handleCodexPayload(payload);
    } catch (err) {
      addChatEntry({ role: "codex_output", content: `Codex server message error: ${err.message}`, ts: Date.now() });
    }
  });

  socket.addEventListener("close", () => {
    ready = false;
    resolveConnectWaiters(false);
    backendModeEl.textContent = "offline";
    addTransientChatEntry({ role: "codex_output", content: "Codex server disconnected.", ts: Date.now() });
  });

  socket.addEventListener("error", () => {
    ready = false;
    resolveConnectWaiters(false);
    backendModeEl.textContent = "error";
    addTransientChatEntry({
      role: "codex_output",
      content: `Unable to reach Codex server at ${url}.`,
      ts: Date.now(),
    });
  });

  wsBridge = {
    isReady: () => ready,
    send: async ({ message, state: snapshot }) => {
      if (socket.readyState === WebSocket.CONNECTING) {
        const opened = await waitForOpen(5000);
        if (!opened) throw new Error("Codex server connection timed out");
      }
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error("Codex server is not connected");
      }
      const requestId = crypto.randomUUID();
      const payload = { type: "message", message, snapshot, requestId };
      socket.send(JSON.stringify(payload));
      return new Promise((resolve) => {
        pending.set(requestId, resolve);
        setTimeout(() => {
          if (pending.has(requestId)) {
            pending.delete(requestId);
            resolve(null);
          }
        }, 20000);
      });
    },
  };

  return wsBridge;
}

setupWebSocketBridge();

function ensureWorker() {
  if (codexWorker) return codexWorker;
  codexWorker = new Worker("./worker.js", { type: "module" });
  codexWorker.onmessage = (event) => {
    handleCodexPayload(event.data);
  };
  return codexWorker;
}

async function sendToCodex(message) {
  stateEl.textContent = "sending";
  const bridge = window.CodexBridge || setupWebSocketBridge();
  if (bridge && typeof bridge.send === "function") {
    try {
      const reply = await bridge.send({ message, state });
      if (!reply) {
        if (bridge.isReady && !bridge.isReady()) {
          throw new Error("Codex server not ready");
        }
        return;
      }
      if (reply?.thinking) {
        addChatEntry({ role: "codex_thinking", content: reply.thinking, ts: Date.now() });
      }
      if (reply?.output) {
        addChatEntry({ role: "codex_output", content: reply.output, ts: Date.now() });
      }
      if (reply?.update) {
        applyUpdate(reply.update);
      }
      if (reply?.taskComplete && AUTO_SOFT_REFRESH) {
        scheduleSoftRefresh();
      }
      stateEl.textContent = "ready";
      return;
    } catch (err) {
      addChatEntry({ role: "codex_output", content: `Codex bridge error: ${err.message}`, ts: Date.now() });
      stateEl.textContent = "ready";
      if (!ALLOW_WORKER_FALLBACK) {
        return;
      }
    }
  }

  const worker = ensureWorker();
  addChatEntry({
    role: "codex_output",
    content: "Using simulated worker fallback. Set localStorage `endless_allow_worker_fallback=0` to disable.",
    ts: Date.now(),
  });
  worker.postMessage({ type: "message", message, snapshot: state });
}

function resolveChatCommand(message) {
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) return trimmed;
  if (trimmed === "/commit") {
    return "Commit the current git working tree changes with an appropriate concise commit message. Run git status first, stage relevant changes, then create the commit. Return the commit summary and changed file paths.";
  }
  if (trimmed.startsWith("/commit ")) {
    const hint = trimmed.slice("/commit ".length).trim();
    if (!hint) return resolveChatCommand("/commit");
    return `Commit the current git working tree changes with an appropriate concise commit message. Use this user hint when crafting the message: "${hint}". Run git status first, stage relevant changes, then create the commit. Return the commit summary and changed file paths.`;
  }
  return message;
}

function scheduleSoftRefresh() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  addTransientChatEntry({
    role: "codex_output",
    content: "Codex task complete. Soft refresh in 1.5s...",
    ts: Date.now(),
  });
  setTimeout(() => {
    saveState();
    location.reload();
  }, 1500);
}

function applyUpdate(update) {
  if (!update) return;
  stateEl.textContent = "updating";
  const actionReport = [];
  if (Array.isArray(update.actions)) {
    for (const action of update.actions) {
      const result = applyAction(action);
      actionReport.push(result);
      addTraceEntry(result, action);
    }
  } else {
    if (typeof update.seed === "number") {
      const action = { type: "set_seed", seed: update.seed };
      const result = applyAction(action);
      actionReport.push(result);
      addTraceEntry(result, action);
    }
    if (typeof update.terrainColor === "string") {
      const action = { type: "set_terrain_color", colorHex: update.terrainColor };
      const result = applyAction(action);
      actionReport.push(result);
      addTraceEntry(result, action);
    }
  }
  if (update.chatNote) {
    addChatEntry({ role: "codex_output", content: update.chatNote, ts: Date.now() });
  }
  const appliedCount = actionReport.filter((entry) => entry.status === "applied").length;
  if (update.actions && update.actions.length > 0) {
    addChatEntry({
      role: "codex_output",
      content: `Action results: ${appliedCount}/${update.actions.length} applied.`,
      ts: Date.now(),
    });
  }
  stateEl.textContent = "ready";
}

function applyAction(action) {
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    return traceResult("rejected", "unknown", "invalid action payload");
  }

  if (action.type === "set_seed") {
    if (typeof action.seed !== "number" || !Number.isFinite(action.seed)) {
      return traceResult("rejected", "set_seed", "invalid seed");
    }
    if (action.seed === state.seed) return traceResult("applied", "set_seed", "unchanged");
    state.seed = Math.trunc(action.seed);
    seedEl.textContent = state.seed;
    rebuildTerrain();
    return traceResult("applied", "set_seed", `seed=${state.seed}`);
  }

  if (action.type === "set_terrain") {
    let touched = false;
    touched = setTerrainNumber("noiseScale", action.noiseScale, 0.005, 0.25) || touched;
    touched = setTerrainNumber("baseHeight", action.baseHeight, 1, 80) || touched;
    touched = setTerrainNumber("ridgeScale", action.ridgeScale, 0.5, 6) || touched;
    touched = setTerrainNumber("ridgeHeight", action.ridgeHeight, 0, 50) || touched;
    if (!touched) return traceResult("rejected", "set_terrain", "no valid fields");
    rebuildTerrain();
    return traceResult("applied", "set_terrain", "terrain params updated");
  }

  if (action.type === "set_water") {
    let touched = false;
    if (typeof action.level === "number" && Number.isFinite(action.level)) {
      state.world.water.level = clampNumber(action.level, -30, 80, state.world.water.level);
      water.position.y = state.world.water.level;
      syncTerrainShaderUniforms();
      touched = true;
    }
    if (typeof action.opacity === "number" && Number.isFinite(action.opacity)) {
      state.world.water.opacity = clampNumber(action.opacity, 0.05, 1, state.world.water.opacity);
      water.material.opacity = state.world.water.opacity;
      touched = true;
    }
    if (typeof action.colorHex === "string") {
      state.world.water.colorHex = toColorHex(action.colorHex, state.world.water.colorHex);
      water.material.color.set(state.world.water.colorHex);
      touched = true;
    }
    return touched
      ? traceResult("applied", "set_water", "water settings updated")
      : traceResult("rejected", "set_water", "no valid fields");
  }

  if (action.type === "set_fog") {
    let touched = false;
    if (typeof action.density === "number" && Number.isFinite(action.density)) {
      state.world.fog.density = clampNumber(action.density, 0.001, 0.08, state.world.fog.density);
      scene.fog.density = state.world.fog.density;
      touched = true;
    }
    if (typeof action.colorHex === "string") {
      state.world.fog.colorHex = toColorHex(action.colorHex, state.world.fog.colorHex);
      syncAtmosphereFromState();
      touched = true;
    }
    return touched
      ? traceResult("applied", "set_fog", "fog settings updated")
      : traceResult("rejected", "set_fog", "no valid fields");
  }

  if (action.type === "set_terrain_color") {
    if (typeof action.colorHex !== "string") return traceResult("rejected", "set_terrain_color", "invalid color");
    state.world.terrainColor = toColorHex(action.colorHex, state.world.terrainColor);
    terrainMaterial.color.set(state.world.terrainColor);
    syncTerrainShaderUniforms();
    return traceResult("applied", "set_terrain_color", `color=${state.world.terrainColor}`);
  }

  if (action.type === "set_trees") {
    let touched = false;
    if (typeof action.density === "number" && Number.isFinite(action.density)) {
      state.world.trees.density = clampNumber(action.density, 0, 1.2, state.world.trees.density);
      touched = true;
    }
    if (typeof action.trunkColor === "string") {
      state.world.trees.trunkColor = toColorHex(action.trunkColor, state.world.trees.trunkColor);
      touched = true;
    }
    if (typeof action.canopyColor === "string") {
      state.world.trees.canopyColor = toColorHex(action.canopyColor, state.world.trees.canopyColor);
      touched = true;
    }
    if (!touched) return traceResult("rejected", "set_trees", "no valid fields");
    syncTreeMaterials();
    treeChunks.forEach((treeGroup) => {
      scene.remove(treeGroup);
    });
    treeChunks.clear();
    const cx = Math.floor(player.position.x / CHUNK_SIZE);
    const cz = Math.floor(player.position.z / CHUNK_SIZE);
    ensureChunks(cx, cz);
    return traceResult("applied", "set_trees", "tree settings updated");
  }

  if (action.type === "spawn_landmark") {
    const descriptor = {
      kind: action.kind === "beacon" ? "beacon" : "pillar",
      x: clampNumber(action.x, -10000, 10000, 0),
      z: clampNumber(action.z, -10000, 10000, 0),
      yOffset: clampNumber(action.yOffset, -20, 100, 2),
      scale: clampNumber(action.scale, 0.3, 8, 1),
      colorHex: toColorHex(action.colorHex, action.kind === "beacon" ? "#f1b04f" : "#89e6c7"),
    };
    state.world.landmarks.push(descriptor);
    rebuildLandmarks();
    return traceResult("applied", "spawn_landmark", `${descriptor.kind} at ${descriptor.x},${descriptor.z}`);
  }

  if (action.type === "clear_landmarks") {
    state.world.landmarks = [];
    rebuildLandmarks();
    return traceResult("applied", "clear_landmarks", "all landmarks cleared");
  }

  return traceResult("rejected", action.type, "unsupported action type");
}

function setTerrainNumber(key, value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  state.world.terrain[key] = clampNumber(value, min, max, state.world.terrain[key]);
  return true;
}

function saveState() {
  if (resetInProgress) return;
  const payload = {
    seed: state.seed,
    world: state.world,
    timeOfDay: clampNumber(worldTime / DAY_NIGHT.dayLengthSeconds, 0, 1, 0),
    ui: {
      chatOpen,
    },
    player: {
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      yaw: player.yaw,
      pitch: player.pitch,
    },
    chat: chatState.slice(-120),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(raw);
    return {
      seed: typeof parsed.seed === "number" ? parsed.seed : DEFAULT_STATE.seed,
      world: normalizeWorld(parsed.world),
      timeOfDay: clampNumber(parsed.timeOfDay, 0, 1, DEFAULT_STATE.timeOfDay),
      ui: {
        chatOpen: Boolean(parsed.ui?.chatOpen),
      },
      player: {
        position: parsed.player?.position || DEFAULT_STATE.player.position,
        yaw: parsed.player?.yaw || 0,
        pitch: parsed.player?.pitch || 0,
      },
      chat: Array.isArray(parsed.chat) ? parsed.chat : [],
    };
  } catch (err) {
    return structuredClone(DEFAULT_STATE);
  }
}

const saveTimer = setInterval(saveState, 2000);
function handleBeforeUnload() {
  saveState();
}
window.addEventListener("beforeunload", handleBeforeUnload);

function normalizeWorld(value) {
  const source = value && typeof value === "object" ? value : {};
  const terrain = source.terrain && typeof source.terrain === "object" ? source.terrain : {};
  const waterCfg = source.water && typeof source.water === "object" ? source.water : {};
  const fogCfg = source.fog && typeof source.fog === "object" ? source.fog : {};
  const treesCfg = source.trees && typeof source.trees === "object" ? source.trees : {};
  const landmarks = Array.isArray(source.landmarks) ? source.landmarks : [];
  const rawFogDensity = clampNumber(fogCfg.density, 0.001, 0.08, DEFAULT_WORLD.fog.density);
  const fogDensity = rawFogDensity === 0.015 ? DEFAULT_WORLD.fog.density : rawFogDensity;
  const terrainColor = remapLegacyColor(
    toColorHex(source.terrainColor, DEFAULT_WORLD.terrainColor),
    LEGACY_WORLD.terrainColor,
    DEFAULT_WORLD.terrainColor
  );
  const trunkColor = remapLegacyColor(
    toColorHex(treesCfg.trunkColor, DEFAULT_WORLD.trees.trunkColor),
    LEGACY_WORLD.trees.trunkColor,
    DEFAULT_WORLD.trees.trunkColor
  );
  const canopyColor = remapLegacyColor(
    toColorHex(treesCfg.canopyColor, DEFAULT_WORLD.trees.canopyColor),
    LEGACY_WORLD.trees.canopyColor,
    DEFAULT_WORLD.trees.canopyColor
  );
  const waterColor = remapLegacyColor(
    toColorHex(waterCfg.colorHex, DEFAULT_WORLD.water.colorHex),
    LEGACY_WORLD.water.colorHex,
    DEFAULT_WORLD.water.colorHex
  );
  const fogColor = remapLegacyColor(
    toColorHex(fogCfg.colorHex, DEFAULT_WORLD.fog.colorHex),
    LEGACY_WORLD.fog.colorHex,
    DEFAULT_WORLD.fog.colorHex
  );
  return {
    terrain: {
      noiseScale: clampNumber(terrain.noiseScale, 0.005, 0.25, DEFAULT_WORLD.terrain.noiseScale),
      baseHeight: clampNumber(terrain.baseHeight, 1, 80, DEFAULT_WORLD.terrain.baseHeight),
      ridgeScale: clampNumber(terrain.ridgeScale, 0.5, 6, DEFAULT_WORLD.terrain.ridgeScale),
      ridgeHeight: clampNumber(terrain.ridgeHeight, 0, 50, DEFAULT_WORLD.terrain.ridgeHeight),
    },
    terrainColor,
    trees: {
      density: clampNumber(treesCfg.density, 0, 1.2, DEFAULT_WORLD.trees.density),
      trunkColor,
      canopyColor,
    },
    water: {
      level: clampNumber(waterCfg.level, -30, 80, DEFAULT_WORLD.water.level),
      colorHex: waterColor,
      opacity: clampNumber(waterCfg.opacity, 0.05, 1, DEFAULT_WORLD.water.opacity),
    },
    fog: {
      colorHex: fogColor,
      density: fogDensity,
    },
    landmarks: landmarks
      .map((entry) => ({
        kind: entry?.kind === "beacon" ? "beacon" : "pillar",
        x: clampNumber(entry?.x, -10000, 10000, 0),
        z: clampNumber(entry?.z, -10000, 10000, 0),
        yOffset: clampNumber(entry?.yOffset, -20, 100, 2),
        scale: clampNumber(entry?.scale, 0.3, 8, 1),
        colorHex: toColorHex(entry?.colorHex, "#89e6c7"),
      }))
      .slice(0, 300),
  };
}

function clampNumber(value, min, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function toColorHex(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return fallback;
  return trimmed.toLowerCase();
}

function remapLegacyColor(color, legacyColor, nextColor) {
  return color === legacyColor ? nextColor : color;
}

function traceResult(status, type, detail) {
  return { status, type, detail };
}

function addTraceEntry(result, action) {
  const node = document.createElement("div");
  node.className = `trace-entry ${result.status}`;
  const meta = document.createElement("div");
  meta.className = "trace-meta";
  meta.textContent = `${result.status} • ${result.type}`;
  const detail = document.createElement("div");
  detail.textContent = result.detail;
  const payload = document.createElement("div");
  payload.className = "trace-payload";
  payload.textContent = safeJson(action);
  node.append(meta, detail, payload);
  traceLog.appendChild(node);
  while (traceLog.childElementCount > 80) {
    traceLog.removeChild(traceLog.firstElementChild);
  }
  traceLog.scrollTop = traceLog.scrollHeight;
}

function addTracePhrase(phrase, status = "info") {
  const normalizedStatus = status === "applied" || status === "rejected" ? status : "info";
  const node = document.createElement("div");
  node.className = `trace-entry ${normalizedStatus}`;
  const meta = document.createElement("div");
  meta.className = "trace-meta";
  meta.textContent = normalizedStatus;
  const detail = document.createElement("div");
  detail.textContent = phrase;
  node.append(meta, detail);
  traceLog.appendChild(node);
  while (traceLog.childElementCount > 80) {
    traceLog.removeChild(traceLog.firstElementChild);
  }
  traceLog.scrollTop = traceLog.scrollHeight;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch (err) {
    return "{\"error\":\"unserializable action payload\"}";
  }
}

function pruneSystemConnectionMessages(list) {
  const keep = list.filter((entry) => {
    const text = typeof entry?.content === "string" ? entry.content : "";
    if (text.startsWith("Connected to Codex server at ")) return false;
    if (text === "Codex server disconnected.") return false;
    if (text.startsWith("Unable to reach Codex server at ")) return false;
    return true;
  });
  list.length = 0;
  keep.forEach((entry) => list.push(entry));
}

function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7 + state.seed) * 43758.5453;
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
