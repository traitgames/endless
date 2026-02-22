import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { createBridgeClient } from "./bridgeClient.js";
import { createUpdateEngine } from "./updateEngine.js";
import { createChatStore } from "./chat/chatStore.js";
import { updatePlayerRuntime } from "./player/movement.js";
import { loadPersistedState, savePersistedState, clampNumber, toColorHex } from "./state/persistence.js";
import { createTerrainHeightSampler } from "./world/terrainNoise.js";
import { createRuntimeActionExecutor } from "./actions/runtimeActions.js";
import { createTraceLogger } from "./trace/traceLog.js";
import { configureTerrainMaterial } from "./world/terrainShader.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";

const canvas = document.getElementById("scene");
const seedEl = document.getElementById("seed");
const chunkEl = document.getElementById("chunk");

const biomeEl = document.getElementById("biome");
const clockTimeEl = document.getElementById("clock-time");
let backendModeEl = document.getElementById("backend-mode");
const stateEl = document.getElementById("state");
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatClear = document.getElementById("chat-clear");
const worldCommandsBtn = document.getElementById("world-commands");
const chatPanel = document.getElementById("chat");
const chatMinimizeBtn = document.getElementById("chat-minimize");
const hudEl = document.getElementById("hud");
const resetSaveBtn = document.getElementById("reset-save");
const tracePanel = document.getElementById("action-trace");
const traceLog = document.getElementById("trace-log");
const traceToggleBtn = document.getElementById("trace-toggle");
const traceClearBtn = document.getElementById("trace-clear");
const traceOpenBtn = document.getElementById("action-trace-open");
const LOCAL_COMMAND_HELP_URL = new URL("./commandHelp.json", import.meta.url);
const FALLBACK_FRONTEND_COMMAND_HELP_LINES = [
  "/help <command>",
  "/time",
  "/time <0..1 | 0..24 | HH:MM [am|pm] | percent | preset>",
  "/commit",
  "/commit <message hint>",
  "/tp <biome-name>",
  "tp <biome-name>",
];
const FALLBACK_WORLD_COMMAND_HELP_LINES = [
  "/world help",
  "/world commands",
  "/world ?",
  "/world biome <biome-name>",
  "/world tp biome <biome-name>",
  "/world detail",
  "/world detail <meters|off>",
  "/world detail intensity <0..3>",
  "/world style <biome> <terrain|water|fog|trunk|canopy> <#rrggbb>",
  "/world style <biome> tree <trunk|canopy> <#rrggbb>",
  "/world style clear <biome> [terrain|water|fog|trunk|canopy|all]",
];
let localCommandHelpCatalog = null;
let localCommandHelpCatalogPromise = null;
let lastStatusClockMinuteKey = "";

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

function formatStatusClockTime(cycle = state.timeOfDay) {
  const normalized = normalizeTimeCycle(cycle);
  if (normalized == null) return "--:-- --";
  let totalMinutes = Math.round(normalized * 24 * 60) % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function updateStatusClock() {
  if (!clockTimeEl) return;
  const normalized = normalizeTimeCycle(state.timeOfDay);
  if (normalized == null) {
    if (lastStatusClockMinuteKey !== "invalid") {
      lastStatusClockMinuteKey = "invalid";
      clockTimeEl.textContent = "--:-- --";
    }
    return;
  }
  let totalMinutes = Math.round(normalized * 24 * 60) % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const minuteKey = String(totalMinutes);
  if (minuteKey === lastStatusClockMinuteKey) return;
  lastStatusClockMinuteKey = minuteKey;
  clockTimeEl.textContent = formatStatusClockTime(normalized);
}

const STORAGE_KEY = "endless_state_v1";
const STATE_VERSION = 2;
let resetInProgress = false;
const BOOT_SEED = Math.floor(Math.random() * 1e9);
let noiseSeed = BOOT_SEED;
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
  terrainDetail: {
    renderDistance: 50,
    intensity: 1.2,
  },
  terrainColor: "#4f8b50",
  biomeStyles: {},
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

const BIOME_VARIANTS = {
  cold: ["glacier", "tundra", "taiga"],
  temperate: ["meadow", "forest", "wetland"],
  hot: ["desert", "savanna", "badlands"],
};

const BIOME_DEFS = {
  glacier: {
    id: "glacier",
    label: "Glacier",
    category: "cold",
    groundColor: new THREE.Color("#ecf6ff"),
    hasTrees: false,
  },
  tundra: {
    id: "tundra",
    label: "Tundra",
    category: "cold",
    groundColor: new THREE.Color("#b7b7a3"),
    hasTrees: false,
  },
  taiga: {
    id: "taiga",
    label: "Taiga",
    category: "cold",
    groundColor: new THREE.Color("#5d748a"),
    hasTrees: true,
    treeStyle: "conifer",
    treeDensityMultiplier: 0.8,
    trunkTint: new THREE.Color("#6d5844"),
    canopyTint: new THREE.Color("#6aa296"),
  },
  meadow: {
    id: "meadow",
    label: "Meadow",
    category: "temperate",
    groundColor: new THREE.Color("#bfd05a"),
    hasTrees: true,
    treeStyle: "broadleaf",
    treeDensityMultiplier: 0.38,
    trunkTint: new THREE.Color("#6b5138"),
    canopyTint: new THREE.Color("#8dba59"),
  },
  forest: {
    id: "forest",
    label: "Forest",
    category: "temperate",
    groundColor: new THREE.Color("#447034"),
    hasTrees: true,
    treeStyle: "broadleaf",
    treeDensityMultiplier: 1.1,
    trunkTint: new THREE.Color("#664c34"),
    canopyTint: new THREE.Color("#3f8144"),
  },
  wetland: {
    id: "wetland",
    label: "Wetland",
    category: "temperate",
    groundColor: new THREE.Color("#4f7f74"),
    hasTrees: true,
    treeStyle: "wetland",
    treeDensityMultiplier: 0.72,
    trunkTint: new THREE.Color("#5a4637"),
    canopyTint: new THREE.Color("#5f8f58"),
  },
  desert: {
    id: "desert",
    label: "Desert",
    category: "hot",
    groundColor: new THREE.Color("#efd48e"),
    hasTrees: false,
  },
  savanna: {
    id: "savanna",
    label: "Savanna",
    category: "hot",
    groundColor: new THREE.Color("#b99b4a"),
    hasTrees: true,
    treeStyle: "savanna",
    treeDensityMultiplier: 0.48,
    trunkTint: new THREE.Color("#73523a"),
    canopyTint: new THREE.Color("#9ab248"),
  },
  badlands: {
    id: "badlands",
    label: "Badlands",
    category: "hot",
    groundColor: new THREE.Color("#b7654c"),
    hasTrees: false,
  },
};

const DEFAULT_STATE = {
  seed: BOOT_SEED,
  world: DEFAULT_WORLD,
  timeOfDay: 7 / 24,
  ui: {
    chatOpen: false,
    actionTraceVisible: true,
  },
  player: {
    position: { x: 0, y: 12, z: 0 },
    yaw: 0,
    pitch: 0,
  },
  chat: [],
};

const LAND_TARGET_CLEARANCE_Y = 0.4;
const PLAYER_TARGET_HEIGHT_OFFSET = 3;
const BIOME_TP_MAX_ATTEMPTS = 5000;
const BIOME_TP_EXTRA_RINGS_AFTER_FIRST_MATCH = 6;
const BIOME_CENTER_TARGET_SCORE = 12;
const BIOME_TP_SUNFLOWER_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SPAWN_SEARCH_MAX_ATTEMPTS = 700;
const SPAWN_SEARCH_MAX_RADIUS = 1536;
const SPAWN_SEARCH_STEP = 24;
const SPAWN_MAX_SLOPE_SCORE = 3.4;

const state = loadPersistedState({
  storageKey: STORAGE_KEY,
  defaultState: DEFAULT_STATE,
  stateVersion: STATE_VERSION,
  defaultWorld: DEFAULT_WORLD,
  legacyWorld: LEGACY_WORLD,
});
noiseSeed = state.seed;
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
  dayLengthSeconds: 40 * 60,
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
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.05,
});
const terrainShaderState = configureTerrainMaterial({
  material: terrainMaterial,
  state,
  getDetailRenderDistance: getTerrainDetailRenderDistance,
  THREE,
});

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
const biomeTreeMaterialSets = new Map();
const biomeTerrainColorCache = new Map();
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

function blendColor(baseHex, tintColor, amount) {
  const out = new THREE.Color(baseHex);
  if (tintColor instanceof THREE.Color) {
    out.lerp(tintColor, clampNumber(amount, 0, 1, 0));
  }
  return out;
}

function getTerrainDetailRenderDistance() {
  return clampNumber(state.world?.terrainDetail?.renderDistance, 0, 300, DEFAULT_WORLD.terrainDetail.renderDistance);
}

function getTerrainDetailIntensity() {
  return clampNumber(state.world?.terrainDetail?.intensity, 0, 3, DEFAULT_WORLD.terrainDetail.intensity ?? 1);
}

function setTerrainDetailRenderDistance(distanceMeters) {
  if (!state.world.terrainDetail || typeof state.world.terrainDetail !== "object") {
    state.world.terrainDetail = {
      renderDistance: DEFAULT_WORLD.terrainDetail.renderDistance,
      intensity: DEFAULT_WORLD.terrainDetail.intensity ?? 1,
    };
  }
  state.world.terrainDetail.renderDistance = clampNumber(distanceMeters, 0, 300, DEFAULT_WORLD.terrainDetail.renderDistance);
  syncTerrainShaderUniforms();
  saveState();
}

function setTerrainDetailIntensity(intensity) {
  if (!state.world.terrainDetail || typeof state.world.terrainDetail !== "object") {
    state.world.terrainDetail = {
      renderDistance: DEFAULT_WORLD.terrainDetail.renderDistance,
      intensity: DEFAULT_WORLD.terrainDetail.intensity ?? 1,
    };
  }
  state.world.terrainDetail.intensity = clampNumber(intensity, 0, 3, DEFAULT_WORLD.terrainDetail.intensity ?? 1);
  syncTerrainShaderUniforms();
  saveState();
}

function getTerrainDetailBiomeId(biome) {
  switch (biome?.id) {
    case "glacier":
      return 1; // crystalline ice facets
    case "tundra":
      return 2; // lichen speckle
    case "taiga":
      return 3; // needle mats
    case "meadow":
      return 4; // flowered grass clumps
    case "forest":
      return 5; // leaf litter
    case "wetland":
      return 6; // muddy pools + moss
    case "desert":
      return 7; // dune ripples
    case "savanna":
      return 8; // dry grass streaks
    case "badlands":
      return 9; // red striations
    default:
      return 0;
  }
}

function getBiomeStyleOverride(biomeOrId) {
  const biomeId = typeof biomeOrId === "string" ? biomeOrId : biomeOrId?.id;
  if (!biomeId) return null;
  const styles = state.world?.biomeStyles;
  if (!styles || typeof styles !== "object") return null;
  const style = styles[biomeId];
  return style && typeof style === "object" ? style : null;
}

function getBiomeTerrainColor(biome) {
  if (!biome) return new THREE.Color(state.world.terrainColor);
  const style = getBiomeStyleOverride(biome);
  if (!style?.terrainColor) return biome.groundColor;
  const cached = biomeTerrainColorCache.get(biome.id);
  if (cached && cached._overrideHex === style.terrainColor) return cached;
  const color = new THREE.Color(style.terrainColor);
  color._overrideHex = style.terrainColor;
  biomeTerrainColorCache.set(biome.id, color);
  return color;
}

function getBiomeFogColorHex(biome) {
  return getBiomeStyleOverride(biome)?.fogColorHex || state.world.fog.colorHex;
}

function getBiomeWaterColorHex(biome) {
  return getBiomeStyleOverride(biome)?.waterColorHex || state.world.water.colorHex;
}

function getBiomeTreeMaterialSet(biome) {
  if (!biome?.hasTrees) {
    return { trunk: treeTrunkMaterial, canopies: treeCanopyMaterials };
  }
  let set = biomeTreeMaterialSets.get(biome.id);
  if (!set) {
    set = {
      trunk: new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0.02 }),
      canopies: [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.01 })),
    };
    biomeTreeMaterialSets.set(biome.id, set);
  }
  return set;
}

function syncTreeMaterials() {
  treeTrunkMaterial.color.set(state.world.trees.trunkColor);
  const palette = buildCanopyPalette(state.world.trees.canopyColor);
  palette.forEach((color, index) => {
    treeCanopyMaterials[index].color.copy(color);
  });
  for (const biome of Object.values(BIOME_DEFS)) {
    if (!biome.hasTrees) continue;
    const set = getBiomeTreeMaterialSet(biome);
    const style = getBiomeStyleOverride(biome);
    if (style?.treeTrunkColor) {
      set.trunk.color.set(style.treeTrunkColor);
    } else {
      set.trunk.color.copy(blendColor(state.world.trees.trunkColor, biome.trunkTint, 0.55));
    }
    const canopyBaseHex = style?.treeCanopyColor
      ? style.treeCanopyColor
      : `#${blendColor(state.world.trees.canopyColor, biome.canopyTint, 0.6).getHexString()}`;
    const biomePalette = buildCanopyPalette(canopyBaseHex);
    biomePalette.forEach((color, index) => {
      set.canopies[index].color.copy(color);
    });
  }
}
syncTreeMaterials();

function syncTerrainShaderUniforms() {
  if (!terrainShaderState.shader) return;
  terrainShaderState.shader.uniforms.uWaterLevel.value = state.world.water.level;
  terrainShaderState.shader.uniforms.uTint.value.set(state.world.terrainColor);
  terrainShaderState.shader.uniforms.uDetailRenderDistance.value = getTerrainDetailRenderDistance();
  if (terrainShaderState.shader.uniforms.uDetailIntensity) {
    terrainShaderState.shader.uniforms.uDetailIntensity.value = getTerrainDetailIntensity();
  }
}

function syncAtmosphereFromState() {
  const biome = getBiomeAt(player.position.x, player.position.z);
  atmosphereBase.fogColor.set(getBiomeFogColorHex(biome));
  scene.fog.color.set(atmosphereBase.fogColor);
  renderer.setClearColor(atmosphereBase.fogColor, 1);
}

function syncWaterColorFromState() {
  const biome = getBiomeAt(player.position.x, player.position.z);
  water.material.color.set(getBiomeWaterColorHex(biome));
}

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
  // Hide the moon mesh once it drops below the horizon instead of clamping it above the ground.
  moon.visible = moonVector.y > 0;
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

function normalizeTimeCycle(value) {
  if (!Number.isFinite(value)) return null;
  return ((value % 1) + 1) % 1;
}

function formatTimeOfDayClock(cycle) {
  const normalized = normalizeTimeCycle(cycle);
  if (normalized == null) return "00:00";
  let totalMinutes = Math.round(normalized * 24 * 60) % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeOfDayInput(raw) {
  const input = String(raw || "").trim().toLowerCase();
  if (!input) return null;

  const preset = {
    midnight: 0,
    dawn: 0.22,
    sunrise: 0.25,
    morning: 1 / 3,
    noon: 0.5,
    afternoon: 0.625,
    sunset: 0.75,
    dusk: 0.8,
    evening: 0.875,
    night: 0.92,
  }[input];
  if (preset != null) return { cycle: preset, label: input };

  const percentMatch = input.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    if (Number.isFinite(percent)) return { cycle: percent / 100, label: `${percent}%` };
  }

  const clockMatch = input.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
  if (clockMatch) {
    let hours = Number(clockMatch[1]);
    const minutes = clockMatch[2] == null ? 0 : Number(clockMatch[2]);
    const meridiem = clockMatch[3];
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes < 60) {
      if (meridiem) {
        if (hours < 1 || hours > 12) return null;
        hours %= 12;
        if (meridiem === "pm") hours += 12;
      } else if (hours < 0 || hours > 24 || (hours === 24 && minutes > 0)) {
        return null;
      }
      return { cycle: (hours + minutes / 60) / 24, label: `${clockMatch[1]}${clockMatch[2] ? `:${clockMatch[2]}` : ""}${meridiem ? ` ${meridiem}` : ""}` };
    }
  }

  const numeric = Number(input);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 0 && numeric <= 1) return { cycle: numeric, label: input };
  if (numeric >= 0 && numeric <= 24) return { cycle: numeric / 24, label: `${numeric}h` };
  return null;
}

function setTimeOfDay(cycle, sourceLabel = null, options = {}) {
  const normalized = normalizeTimeCycle(cycle);
  if (normalized == null) return false;
  state.timeOfDay = normalized;
  worldTime = normalized * DAY_NIGHT.dayLengthSeconds;
  updateDayNightCycle(0);
  saveState();
  if (!options?.silent) {
    addChatEntry({
      role: "codex_output",
      content: `Time set to ${formatTimeOfDayClock(normalized)}${sourceLabel ? ` (${sourceLabel})` : ""}.`,
      ts: Date.now(),
    });
  }
  return true;
}

function handleTimeCommand(message) {
  const match = String(message || "").trim().match(/^\/time(?:\s+(.+))?$/i);
  if (!match) return false;
  const arg = (match[1] || "").trim();
  if (!arg) {
    addChatEntry({
      role: "codex_output",
      content: [
        `Current time: ${formatTimeOfDayClock(state.timeOfDay)}.`,
        "Usage: /time <0..1 | 0..24 | HH:MM [am|pm] | percent | preset>",
        "Presets: dawn, sunrise, morning, noon, afternoon, sunset, dusk, evening, night, midnight",
      ].join("\n"),
      ts: Date.now(),
    });
    return true;
  }
  const parsed = parseTimeOfDayInput(arg);
  if (!parsed) {
    addChatEntry({
      role: "codex_output",
      content: `Invalid time "${arg}". Try examples: /time noon, /time 18.5, /time 6:30am, /time 75%.`,
      ts: Date.now(),
    });
    return true;
  }
  setTimeOfDay(parsed.cycle, parsed.label);
  return true;
}

const heightAt = createTerrainHeightSampler({
  getNoiseSeed: () => noiseSeed,
  getTerrain: () => state.world.terrain,
  terrainHorizontalScale: TERRAIN_HORIZONTAL_SCALE,
});

function hash2(x, z) {
  return seededHash2(x, z, noiseSeed);
}

function seededHash2(x, z, seed) {
  const h = Math.sin(x * 127.1 + z * 311.7 + seed) * 43758.5453;
  return h - Math.floor(h);
}

function sampleBiomeClimate(x, z) {
  const phaseA = noiseSeed * 0.000017;
  const phaseB = noiseSeed * 0.000023;
  const sx = x * 0.00115;
  const sz = z * 0.00105;
  const tempRaw =
    0.5 +
    Math.sin(sx + phaseA) * 0.22 +
    Math.sin(sz * 1.18 - phaseA * 1.4) * 0.18 +
    Math.sin((sx + sz) * 0.72 + phaseA * 0.7) * 0.14;
  const moistureRaw =
    0.5 +
    Math.sin((sx * 0.84 - sz * 0.34) + phaseB) * 0.23 +
    Math.sin((sz * 1.31 + sx * 0.22) - phaseB * 0.9) * 0.16 +
    Math.sin((sx - sz) * 0.59 + phaseB * 0.4) * 0.11;
  const detailRaw =
    0.5 +
    Math.sin(x * 0.0069 + z * 0.0042 + noiseSeed * 0.00019) * 0.22 +
    Math.sin(x * -0.0044 + z * 0.0076 - noiseSeed * 0.00013) * 0.12;
  return {
    temperature: clampNumber(tempRaw, 0, 1, 0.5),
    moisture: clampNumber(moistureRaw, 0, 1, 0.5),
    detail: clampNumber(detailRaw, 0, 1, 0.5),
  };
}

function getBiomeAt(x, z) {
  const climate = sampleBiomeClimate(x, z);
  let category = "temperate";
  if (climate.temperature < 0.37) category = "cold";
  else if (climate.temperature > 0.63) category = "hot";

  const variants = BIOME_VARIANTS[category];
  const selector = clampNumber(climate.moisture * 0.72 + climate.detail * 0.28, 0, 1, 0.5);
  const index = Math.min(2, Math.floor(selector * 3));
  return BIOME_DEFS[variants[index]];
}

function getGroundPointInfo(x, z) {
  const groundY = heightAt(x, z);
  const waterLevel = state.world.water.level;
  const slope =
    Math.abs(heightAt(x + 4, z) - groundY) +
    Math.abs(heightAt(x - 4, z) - groundY) +
    Math.abs(heightAt(x, z + 4) - groundY) +
    Math.abs(heightAt(x, z - 4) - groundY);
  const landClearance = groundY - waterLevel;
  return {
    groundY,
    slope,
    landClearance,
    isDryLand: landClearance > LAND_TARGET_CLEARANCE_Y,
  };
}

function toPlayerPlacementTarget(x, z, groundY) {
  return {
    x,
    z,
    y: Math.max(groundY + PLAYER_TARGET_HEIGHT_OFFSET, state.world.water.level + PLAYER_TARGET_HEIGHT_OFFSET),
  };
}

function estimateBiomeCenterScore(targetBiomeId, x, z) {
  const offsets = [
    [0, 0],
    [32, 0],
    [-32, 0],
    [0, 32],
    [0, -32],
    [32, 32],
    [32, -32],
    [-32, 32],
    [-32, -32],
    [80, 0],
    [-80, 0],
    [0, 80],
    [0, -80],
  ];
  let score = 0;
  for (const [dx, dz] of offsets) {
    const biome = getBiomeAt(x + dx, z + dz);
    if (biome?.id === targetBiomeId) score += 1;
    else score -= 1;
  }
  return score;
}

function pickBetterBiomeTeleportCandidate(best, next) {
  if (!next) return best;
  if (!best) return next;
  if (best.isDryLand !== next.isDryLand) return next.isDryLand ? next : best;
  if (best.centerScore !== next.centerScore) return next.centerScore > best.centerScore ? next : best;
  if (best.radius !== next.radius) return next.radius < best.radius ? next : best;
  if (best.slope !== next.slope) return next.slope < best.slope ? next : best;
  return best;
}

function pickBetterSpawnCandidate(best, next) {
  if (!next) return best;
  if (!best) return next;
  if (best.radius !== next.radius) return next.radius < best.radius ? next : best;
  if (best.isDryLand !== next.isDryLand) return next.isDryLand ? next : best;
  if (best.slope !== next.slope) return next.slope < best.slope ? next : best;
  if (best.landClearance !== next.landClearance) return next.landClearance > best.landClearance ? next : best;
  return best;
}

function tryFindLandSpawnNearOrigin() {
  let attempts = 0;
  let best = null;

  const inspect = (x, z, radius) => {
    if (attempts >= SPAWN_SEARCH_MAX_ATTEMPTS) return "stop";
    attempts += 1;
    const info = getGroundPointInfo(x, z);
    const candidate = { x, z, radius, ...info };
    best = pickBetterSpawnCandidate(best, candidate);
    if (info.isDryLand && info.slope <= SPAWN_MAX_SLOPE_SCORE) {
      return toPlayerPlacementTarget(x, z, info.groundY);
    }
    return null;
  };

  for (let radius = 0; radius <= SPAWN_SEARCH_MAX_RADIUS; radius += SPAWN_SEARCH_STEP) {
    if (radius === 0) {
      const result = inspect(0, 0, 0);
      if (result === "stop") break;
      if (result) return result;
      continue;
    }
    let ringBestDry = null;
    for (let offset = -radius; offset <= radius; offset += SPAWN_SEARCH_STEP) {
      const candidates = [
        [offset, -radius],
        [radius, offset],
        [offset, radius],
        [-radius, offset],
      ];
      for (const [x, z] of candidates) {
        const result = inspect(x, z, radius);
        if (result === "stop") {
          if (ringBestDry) return ringBestDry.placement;
          return best?.isDryLand ? toPlayerPlacementTarget(best.x, best.z, best.groundY) : null;
        }
        if (result) {
          const info = getGroundPointInfo(x, z);
          const placement = toPlayerPlacementTarget(x, z, info.groundY);
          ringBestDry = ringBestDry
            ? pickBetterSpawnCandidate(ringBestDry, { x, z, radius, ...info, placement })
            : { x, z, radius, ...info, placement };
        }
      }
    }
    if (ringBestDry) return ringBestDry.placement;
  }

  if (best?.isDryLand) {
    return toPlayerPlacementTarget(best.x, best.z, best.groundY);
  }
  return null;
}

function resetPlayerToLandSpawnNearOrigin() {
  const target = tryFindLandSpawnNearOrigin();
  if (target) {
    player.position.set(target.x, target.y, target.z);
  } else {
    player.position.set(0, 12, 0);
  }
  player.velocity.set(0, 0, 0);
  player.grounded = false;
}

function maybeRetargetInitialSpawnToLand() {
  const current = state.player?.position;
  if (!current) return;
  const defaultSpawn = DEFAULT_STATE.player.position;
  const isDefaultSpawn =
    Math.abs(current.x - defaultSpawn.x) < 0.001 &&
    Math.abs(current.y - defaultSpawn.y) < 0.001 &&
    Math.abs(current.z - defaultSpawn.z) < 0.001;
  if (!isDefaultSpawn) return;
  const target = tryFindLandSpawnNearOrigin();
  if (!target) return;
  state.player.position = { x: target.x, y: target.y, z: target.z };
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
    const biome = getBiomeAt(worldX, worldZ);

    if (groundY <= state.world.water.level + 0.4) continue;
    if (!biome.hasTrees) continue;
    const slope =
      Math.abs(heightAt(worldX + 1, worldZ) - groundY) + Math.abs(heightAt(worldX, worldZ + 1) - groundY);
    if (slope > 2.4) continue;
    const treeChance = biome.treeDensityMultiplier ?? 1;
    if (hash2(cx * 149 + i * 23 + 19, cz * 173 + i * 41 + 59) > treeChance) continue;

    const scale = 0.7 + hash2(cx * 97 + i * 13 + 7, cz * 83 + i * 11 + 17) * 0.9;
    const materialSet = getBiomeTreeMaterialSet(biome);
    const trunk = new THREE.Mesh(treeTrunkGeometry, materialSet.trunk);
    trunk.position.set(worldX, groundY + 2.0 * scale, worldZ);
    trunk.scale.set(1.5 * scale, scale, 1.5 * scale);
    trunk.receiveShadow = true;
    trunk.castShadow = scale > 0.92;
    group.add(trunk);

    const canopyMaterial =
      materialSet.canopies[Math.floor(hash2(cx * 181 + i * 9 + 17, cz * 223 + i * 13 + 43) * materialSet.canopies.length)];
    const variant = Math.floor(hash2(cx * 131 + i * 7 + 31, cz * 197 + i * 5 + 61) * 3);
    const treeStyle = biome.treeStyle ?? "broadleaf";

    if (treeStyle === "conifer") {
      const canopy = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      canopy.position.set(worldX, groundY + 5.8 * scale, worldZ);
      canopy.scale.set(2.05 * scale, 1.15 * scale, 2.05 * scale);
      canopy.receiveShadow = true;
      canopy.castShadow = scale > 0.96;
      group.add(canopy);
      const upper = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      upper.position.set(worldX, groundY + 7.3 * scale, worldZ);
      upper.scale.set(1.28 * scale, 0.72 * scale, 1.28 * scale);
      upper.receiveShadow = true;
      upper.castShadow = false;
      group.add(upper);
    } else if (treeStyle === "savanna") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX + 0.08 * scale, groundY + 5.35 * scale, worldZ - 0.06 * scale);
      canopyMain.scale.set(1.9 * scale, 0.56 * scale, 1.65 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 1;
      group.add(canopyMain);

      if (variant !== 0) {
        const canopySide = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
        canopySide.position.set(worldX - 0.85 * scale, groundY + 5.25 * scale, worldZ + 0.45 * scale);
        canopySide.scale.set(0.92 * scale, 0.42 * scale, 0.84 * scale);
        canopySide.receiveShadow = true;
        canopySide.castShadow = false;
        group.add(canopySide);
      }
    } else if (treeStyle === "wetland") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 6.0 * scale, worldZ);
      canopyMain.scale.set(1.68 * scale, 1.02 * scale, 1.68 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.92;
      group.add(canopyMain);

      const droop = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      droop.position.set(worldX, groundY + 4.85 * scale, worldZ);
      droop.scale.set(1.65 * scale, 0.6 * scale, 1.65 * scale);
      droop.receiveShadow = true;
      droop.castShadow = false;
      group.add(droop);
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
  const colors = new Float32Array(vertices.count * 3);
  const detailBiomes = new Float32Array(vertices.count);
  for (let i = 0; i < vertices.count; i += 1) {
    const x = vertices.getX(i) + cx * CHUNK_SIZE;
    const z = vertices.getZ(i) + cz * CHUNK_SIZE;
    const y = heightAt(x, z);
    vertices.setY(i, y);
    const biome = getBiomeAt(x, z);
    const color = getBiomeTerrainColor(biome);
    const n = hash2(Math.floor(x * 0.5), Math.floor(z * 0.5));
    const brighten = 0.93 + n * 0.14;
    colors[i * 3] = color.r * brighten;
    colors[i * 3 + 1] = color.g * brighten;
    colors[i * 3 + 2] = color.b * brighten;
    detailBiomes[i] = getTerrainDetailBiomeId(biome);
  }
  vertices.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("detailBiome", new THREE.BufferAttribute(detailBiomes, 1));
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
maybeRetargetInitialSpawnToLand();
player.position.set(state.player.position.x, state.player.position.y, state.player.position.z);
syncAtmosphereFromState();
syncWaterColorFromState();

const keys = new Set();
let pointerLocked = false;
let chatOpen = false;
let actionTraceVisible = true;
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

function setActionTraceVisible(visible) {
  actionTraceVisible = Boolean(visible);
  if (state.ui) {
    state.ui.actionTraceVisible = actionTraceVisible;
  }
  if (tracePanel) {
    tracePanel.hidden = !actionTraceVisible;
  }
  if (traceOpenBtn) {
    traceOpenBtn.hidden = actionTraceVisible;
    traceOpenBtn.setAttribute("aria-expanded", String(actionTraceVisible));
  }
  if (traceToggleBtn) {
    traceToggleBtn.textContent = "Hide";
    traceToggleBtn.setAttribute("aria-expanded", String(actionTraceVisible));
    traceToggleBtn.setAttribute("aria-label", "Hide action trace");
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
    resetPlayerToLandSpawnNearOrigin();
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
  updatePlayerRuntime({
    dt,
    keys,
    player,
    heightAt,
    ensureChunks,
    chunkSize: CHUNK_SIZE,
    chunkEl,
    camera,
    Vector3: THREE.Vector3,
  });
}

function updateBiomeHud() {
  const biome = getBiomeAt(player.position.x, player.position.z);
  syncAtmosphereFromState();
  syncWaterColorFromState();
  if (!biomeEl) return;
  biomeEl.textContent = biome?.label ?? biome?.id ?? "Unknown";
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayer(dt);
  updateBiomeHud();
  updateDayNightCycle(dt);
  updateStatusClock();
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

const chatStore = createChatStore({
  chatLogEl: chatLog,
  entries: state.chat,
});
const chatState = chatStore.entries;
const trace = createTraceLogger(traceLog, 80);
let pendingWorldCommandConfirmation = null;
preloadLocalCommandHelpCatalog();
setActionTraceVisible(state.ui?.actionTraceVisible !== false);
updateStatusClock();

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addChatEntry({ role: "user", content: message, ts: Date.now() });
  chatInput.value = "";
  const resolvedMessage = resolveChatCommand(message);
  if (tryHandleLocalChatCommand(resolvedMessage)) return;
  sendToCodex(resolvedMessage);
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
  chatStore.clear();
  saveState();
});

worldCommandsBtn?.addEventListener("click", () => {
  showWorldCommandHelp();
  setChatOpen(true, { focusInput: true });
});

traceToggleBtn?.addEventListener("click", () => {
  setActionTraceVisible(!actionTraceVisible);
  saveState();
});

traceOpenBtn?.addEventListener("click", () => {
  setActionTraceVisible(true);
  saveState();
});

traceClearBtn?.addEventListener("click", () => {
  trace.clear();
});

function addChatEntry(entry) {
  chatStore.addEntry(entry);
}

function addTransientChatEntry(entry) {
  chatStore.addTransientEntry(entry);
}

let codexWorker = null;
const ALLOW_WORKER_FALLBACK =
  localStorage.getItem("endless_allow_worker_fallback") === "1" || window.ENABLE_SIM_WORKER === true;
const AUTO_SOFT_REFRESH = localStorage.getItem("endless_auto_soft_refresh") !== "0";
let refreshScheduled = false;
const bridgeUrl = localStorage.getItem("endless_ws_url") || "ws://localhost:8787";
let configuredBackendMode = "connecting";
let bridgeConnectionStatus = "connecting";
let activeBackendRoute = null;

function renderBackendModeLabel() {
  if (!backendModeEl) return;
  if (activeBackendRoute) {
    backendModeEl.textContent = activeBackendRoute;
    return;
  }
  if (bridgeConnectionStatus && bridgeConnectionStatus !== "connected") {
    backendModeEl.textContent = bridgeConnectionStatus;
    return;
  }
  backendModeEl.textContent = configuredBackendMode || "unknown";
}

function handleCodexPayload(payload) {
  if (!payload) return;
  if (payload.type === "backend_info") {
    const mode = typeof payload.mode === "string" ? payload.mode : "unknown";
    configuredBackendMode = mode;
    renderBackendModeLabel();
    if (payload.protocolVersion && payload.protocolVersion !== PROTOCOL_VERSION) {
      trace.addTracePhrase(`Protocol mismatch server=${payload.protocolVersion} client=${PROTOCOL_VERSION}`, "rejected");
    }
    return;
  }
  if (payload.type === "route_info") {
    const route = typeof payload.route === "string" ? payload.route : "unknown";
    activeBackendRoute = route;
    renderBackendModeLabel();
    return;
  }
  if (payload.type === "trace") {
    const phrase = typeof payload.phrase === "string" ? payload.phrase : "trace event";
    trace.addTracePhrase(phrase, payload.status);
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

const wsBridge = createBridgeClient({
  url: bridgeUrl,
  onPayload: (payload) => {
    handleCodexPayload(payload);
  },
  onStatus: (status) => {
    bridgeConnectionStatus = status;
    if (status !== "connected") {
      activeBackendRoute = null;
    }
    renderBackendModeLabel();
    if (status === "offline") {
      addTransientChatEntry({ role: "codex_output", content: "Codex server disconnected.", ts: Date.now() });
    }
    if (status === "error") {
      addTransientChatEntry({
        role: "codex_output",
        content: `Unable to reach Codex server at ${bridgeUrl}.`,
        ts: Date.now(),
      });
    }
  },
});
wsBridge.connect();

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
  activeBackendRoute = null;
  renderBackendModeLabel();
  const bridge = window.CodexBridge || wsBridge;
  if (bridge && typeof bridge.send === "function") {
    try {
      const reply = await bridge.send({ message, state });
      if (!reply) {
        if (bridge.isReady && !bridge.isReady()) {
          throw new Error("Codex server not ready");
        }
        activeBackendRoute = null;
        renderBackendModeLabel();
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
      if (reply?.taskComplete && AUTO_SOFT_REFRESH && !reply?.skipSoftRefresh) {
        scheduleSoftRefresh();
      }
      stateEl.textContent = "ready";
      activeBackendRoute = null;
      renderBackendModeLabel();
      return;
    } catch (err) {
      addChatEntry({ role: "codex_output", content: `Codex bridge error: ${err.message}`, ts: Date.now() });
      stateEl.textContent = "ready";
      activeBackendRoute = null;
      renderBackendModeLabel();
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
  activeBackendRoute = null;
  renderBackendModeLabel();
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

function tryHandleLocalChatCommand(message) {
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) return false;
  if (handlePendingWorldCommandConfirmation(trimmed)) return true;
  if (handleLocalHelpCommand(trimmed)) return true;
  if (handleTimeCommand(trimmed)) return true;
  const tpAliasMatch = trimmed.match(/^\/?tp\s+(.+)$/i);
  if (tpAliasMatch) {
    teleportPlayerToBiome(tpAliasMatch[1]);
    return true;
  }
  if (!/^\/world(?:\s|$)/i.test(trimmed)) return false;
  return handleLocalWorldCommand(trimmed);
}

function handleLocalWorldCommand(message) {
  const parts = message.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts[0].toLowerCase() !== "/world") return false;

  const sub = (parts[1] || "").toLowerCase();
  if (!sub || sub === "help" || sub === "commands" || sub === "?") {
    showWorldCommandHelp();
    return true;
  }

  const isBiomeCommand = sub === "biome";
  const isTeleportBiomeCommand = sub === "tp" && (parts[2] || "").toLowerCase() === "biome";
  if (isBiomeCommand || isTeleportBiomeCommand) {
    const biomeName = (isBiomeCommand ? parts.slice(2) : parts.slice(3)).join(" ");
    if (!biomeName) {
      addChatEntry({
        role: "codex_output",
        content: "Usage: /world biome <biome-name>\nExample: /world biome forest",
        ts: Date.now(),
      });
      return true;
    }
    teleportPlayerToBiome(biomeName);
    return true;
  }

  if (sub === "style") {
    return handleWorldBiomeStyleCommand(parts);
  }

  if (sub === "detail") {
    return handleWorldDetailCommand(parts);
  }

  if (parts.length === 2) {
    const guessedBiome = resolveBiomeName(parts[1]) || guessBiomeName(parts[1])?.biome;
    if (guessedBiome) {
      requestWorldCommandConfirmation({
        canonicalCommand: `/world tp biome ${guessedBiome.id}`,
        reason:
          guessedBiome.id === normalizeWorldCommandToken(parts[1])
            ? `I interpreted "/world ${parts[1]}" as a shorthand teleport command.`
            : `I interpreted "/world ${parts[1]}" as a shorthand teleport command and "${parts[1]}" as "${guessedBiome.id}".`,
        intent: { type: "teleport_biome", biomeId: guessedBiome.id },
      });
      return true;
    }
  }

  const guessedCommand = guessWorldTeleportBiomeCommand(parts);
  if (guessedCommand) {
    requestWorldCommandConfirmation(guessedCommand);
    return true;
  }

  return false;
}

function preloadLocalCommandHelpCatalog() {
  if (localCommandHelpCatalogPromise) return localCommandHelpCatalogPromise;
  localCommandHelpCatalogPromise = fetch(LOCAL_COMMAND_HELP_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const commands = Array.isArray(data?.commands) ? data.commands : null;
      if (!commands) {
        throw new Error("Invalid help metadata");
      }
      localCommandHelpCatalog = { commands };
      return localCommandHelpCatalog;
    })
    .catch((err) => {
      console.warn("Failed to load local command help metadata.", err);
      return null;
    });
  return localCommandHelpCatalogPromise;
}

function normalizeHelpLookupText(value) {
  return String(value || "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getLocalCommandHelpCatalog() {
  return localCommandHelpCatalog;
}

function getLocalCommandHelpEntriesByCategory(category) {
  const catalog = getLocalCommandHelpCatalog();
  if (!catalog) return [];
  return catalog.commands.filter((entry) => entry?.category === category);
}

function getLocalFrontendCommandHelpLines() {
  const entries = getLocalCommandHelpEntriesByCategory("frontend");
  if (!entries.length) {
    return [...FALLBACK_FRONTEND_COMMAND_HELP_LINES];
  }
  return entries.flatMap((entry) => (Array.isArray(entry.summaryLines) ? entry.summaryLines : []));
}

function getLocalWorldCommandHelpLines() {
  const entries = getLocalCommandHelpEntriesByCategory("world");
  if (!entries.length) {
    return [...FALLBACK_WORLD_COMMAND_HELP_LINES];
  }
  return entries.flatMap((entry) => (Array.isArray(entry.summaryLines) ? entry.summaryLines : []));
}

function getLocalWorldStyleCommandHelpLines() {
  return getLocalWorldCommandHelpLines().filter((line) => line.startsWith("/world style "));
}

function findLocalCommandHelpEntry(query) {
  const normalizedQuery = normalizeHelpLookupText(query);
  const catalog = getLocalCommandHelpCatalog();
  if (!normalizedQuery || !catalog) return null;

  let bestMatch = null;
  let bestLength = -1;
  for (const entry of catalog.commands) {
    const lookups = Array.isArray(entry?.lookup) ? entry.lookup : [];
    for (const lookup of lookups) {
      const normalizedLookup = normalizeHelpLookupText(lookup);
      if (!normalizedLookup) continue;
      if (normalizedQuery === normalizedLookup || normalizedQuery.startsWith(`${normalizedLookup} `)) {
        if (normalizedLookup.length > bestLength) {
          bestMatch = entry;
          bestLength = normalizedLookup.length;
        }
      }
    }
  }
  return bestMatch;
}

function formatLocalCommandHelpDetail(entry) {
  const title = Array.isArray(entry?.summaryLines) && entry.summaryLines.length ? entry.summaryLines[0] : null;
  const detailLines = Array.isArray(entry?.detailLines) ? entry.detailLines : [];
  return [title ? `Help: ${title}` : "Command help", ...detailLines].join("\n");
}

function handleLocalHelpCommand(message) {
  const match = String(message || "").trim().match(/^\/help(?:\s+(.+))?$/i);
  if (!match) return false;
  const query = (match[1] || "").trim();
  if (!query) {
    addChatEntry({
      role: "codex_output",
      content: "Usage: /help <command>\nExamples: /help /time, /help /world style, /help tp",
      ts: Date.now(),
    });
    return true;
  }

  const renderEntry = (entry) => {
    addChatEntry({
      role: "codex_output",
      content: entry
        ? formatLocalCommandHelpDetail(entry)
        : `No local help found for "${query}". Try /world help to list available commands.`,
      ts: Date.now(),
    });
  };

  const cachedEntry = findLocalCommandHelpEntry(query);
  if (cachedEntry) {
    renderEntry(cachedEntry);
    return true;
  }

  preloadLocalCommandHelpCatalog().then(() => {
    renderEntry(findLocalCommandHelpEntry(query));
  });
  return true;
}

function showWorldCommandHelp() {
  const biomeNames = Object.values(BIOME_DEFS)
    .map((biome) => biome.id)
    .sort()
    .join(", ");
  addChatEntry({
    role: "codex_output",
    content: [
      "Front-end commands (local):",
      ...getLocalFrontendCommandHelpLines(),
      "",
      "World commands (local):",
      ...getLocalWorldCommandHelpLines(),
      "",
      "World command confirmations (when prompted): yes / no",
      "",
      `Biomes: ${biomeNames}`,
    ].join("\n"),
    ts: Date.now(),
  });
}

function handleWorldBiomeStyleCommand(parts) {
  const mode = (parts[2] || "").toLowerCase();
  if (!mode) {
    addWorldStyleUsage();
    return true;
  }

  if (mode === "clear" || mode === "reset") {
    const biomeName = parts[3] || "";
    const biome = resolveBiomeName(biomeName);
    if (!biome) {
      addChatEntry({
        role: "codex_output",
        content: `Unknown biome "${biomeName}".`,
        ts: Date.now(),
      });
      return true;
    }
    const target = resolveBiomeStyleTarget(parts.slice(4));
    if (parts.length > 4 && !target) {
      addWorldStyleUsage("Unknown style target for clear.");
      return true;
    }
    clearBiomeStyleOverrides(biome.id, target?.key || null);
    return true;
  }

  const biome = resolveBiomeName(parts[2]);
  if (!biome) {
    addChatEntry({
      role: "codex_output",
      content: `Unknown biome "${parts[2] || ""}".`,
      ts: Date.now(),
    });
    return true;
  }

  let targetParts;
  let colorHex;
  if ((parts[3] || "").toLowerCase() === "tree") {
    targetParts = parts.slice(3, 5);
    colorHex = parts[5];
  } else {
    targetParts = parts.slice(3, 4);
    colorHex = parts[4];
  }

  const target = resolveBiomeStyleTarget(targetParts);
  if (!target || !colorHex) {
    addWorldStyleUsage("Usage error for biome style command.");
    return true;
  }
  const normalizedColor = toColorHex(colorHex, null);
  if (!normalizedColor) {
    addWorldStyleUsage(`Invalid color "${String(colorHex)}". Use #rrggbb.`);
    return true;
  }

  setBiomeStyleColor(biome.id, target.key, normalizedColor, target.label);
  return true;
}

function addWorldStyleUsage(prefix) {
  const [styleSetLine, styleTreeLine, styleClearLine] = getLocalWorldStyleCommandHelpLines();
  addChatEntry({
    role: "codex_output",
    content: [
      prefix || "Biome style commands:",
      `Set: ${styleSetLine}`,
      `Set: ${styleTreeLine}`,
      `Clear: ${styleClearLine}`,
    ].join("\n"),
    ts: Date.now(),
  });
}

function handleWorldDetailCommand(parts) {
  const sub = (parts[2] || "").toLowerCase();
  if (sub === "distance") {
    parts = [parts[0], parts[1], ...parts.slice(3)];
  }

  if (sub === "intensity" || sub === "strength" || sub === "power") {
    const rawIntensity = (parts[3] || "").trim().toLowerCase();
    if (!rawIntensity) {
      addChatEntry({
        role: "codex_output",
        content: `Terrain detail intensity: ${getTerrainDetailIntensity().toFixed(2)}\nUsage: /world detail intensity <0..3>`,
        ts: Date.now(),
      });
      return true;
    }
    const nextIntensity = Number(parts[3]);
    if (!Number.isFinite(nextIntensity)) {
      addChatEntry({
        role: "codex_output",
        content: `Invalid terrain detail intensity "${parts[3]}". Usage: /world detail intensity <0..3>`,
        ts: Date.now(),
      });
      return true;
    }
    const clamped = clampNumber(nextIntensity, 0, 3, getTerrainDetailIntensity());
    setTerrainDetailIntensity(clamped);
    addChatEntry({
      role: "codex_output",
      content: `Set terrain detail intensity to ${clamped.toFixed(2)}.`,
      ts: Date.now(),
    });
    return true;
  }

  const rawArg = sub.trim();
  if (!rawArg) {
    addChatEntry({
      role: "codex_output",
      content: `Terrain detail render distance: ${getTerrainDetailRenderDistance().toFixed(0)}m\nTerrain detail intensity: ${getTerrainDetailIntensity().toFixed(2)}\nUsage: /world detail <meters|off>\nUsage: /world detail intensity <0..3>`,
      ts: Date.now(),
    });
    return true;
  }
  if (rawArg === "off" || rawArg === "none" || rawArg === "disable") {
    setTerrainDetailRenderDistance(0);
    addChatEntry({
      role: "codex_output",
      content: "Disabled terrain detail overlay (render distance 0m).",
      ts: Date.now(),
    });
    return true;
  }

  const meters = Number(parts[2]);
  if (!Number.isFinite(meters)) {
    addChatEntry({
      role: "codex_output",
      content: `Invalid terrain detail distance "${parts[2]}". Usage: /world detail <meters|off>`,
      ts: Date.now(),
    });
    return true;
  }

  const nextDistance = clampNumber(meters, 0, 300, getTerrainDetailRenderDistance());
  setTerrainDetailRenderDistance(nextDistance);
  addChatEntry({
    role: "codex_output",
    content: `Set terrain detail render distance to ${nextDistance.toFixed(0)}m.`,
    ts: Date.now(),
  });
  return true;
}

function resolveBiomeStyleTarget(tokens) {
  const parts = Array.isArray(tokens) ? tokens.map((t) => String(t || "").toLowerCase()) : [];
  if (parts.length === 0) return { key: null, label: "all" };
  const raw = parts.join(" ");
  if (raw === "terrain") return { key: "terrainColor", label: "terrain" };
  if (raw === "water") return { key: "waterColorHex", label: "water" };
  if (raw === "fog") return { key: "fogColorHex", label: "fog" };
  if (raw === "trunk" || raw === "tree trunk") return { key: "treeTrunkColor", label: "tree trunk" };
  if (raw === "canopy" || raw === "tree canopy") return { key: "treeCanopyColor", label: "tree canopy" };
  if (raw === "all") return { key: null, label: "all" };
  return null;
}

function ensureBiomeStylesState() {
  if (!state.world.biomeStyles || typeof state.world.biomeStyles !== "object") {
    state.world.biomeStyles = {};
  }
  return state.world.biomeStyles;
}

function applyBiomeStyleVisualRefresh(keys) {
  const list = Array.isArray(keys) ? keys : [];
  if (list.includes("terrainColor")) {
    biomeTerrainColorCache.clear();
    rebuildTerrain();
  }
  if (list.includes("treeTrunkColor") || list.includes("treeCanopyColor")) {
    syncTreeMaterials();
  }
  if (list.includes("fogColorHex")) {
    syncAtmosphereFromState();
  }
  if (list.includes("waterColorHex")) {
    syncWaterColorFromState();
  }
  saveState();
}

function setBiomeStyleColor(biomeId, key, colorHex, label) {
  const styles = ensureBiomeStylesState();
  const next = { ...(styles[biomeId] || {}) };
  next[key] = colorHex;
  styles[biomeId] = next;
  applyBiomeStyleVisualRefresh([key]);
  addChatEntry({
    role: "codex_output",
    content: `Set ${label} color for biome "${biomeId}" to ${colorHex}.`,
    ts: Date.now(),
  });
}

function clearBiomeStyleOverrides(biomeId, key = null) {
  const styles = ensureBiomeStylesState();
  const current = styles[biomeId];
  if (!current || typeof current !== "object") {
    addChatEntry({
      role: "codex_output",
      content: `No biome style overrides set for "${biomeId}".`,
      ts: Date.now(),
    });
    return;
  }

  const knownKeys = ["terrainColor", "waterColorHex", "fogColorHex", "treeTrunkColor", "treeCanopyColor"];
  const touched = [];
  if (key) {
    if (key in current) {
      delete current[key];
      touched.push(key);
    }
  } else {
    for (const candidate of knownKeys) {
      if (candidate in current) touched.push(candidate);
    }
    delete styles[biomeId];
  }

  if (!key && styles[biomeId]) {
    delete styles[biomeId];
  } else if (key && Object.keys(current).length === 0) {
    delete styles[biomeId];
  }

  if (touched.length === 0) {
    addChatEntry({
      role: "codex_output",
      content: `No matching overrides to clear for biome "${biomeId}".`,
      ts: Date.now(),
    });
    return;
  }

  applyBiomeStyleVisualRefresh(touched);
  addChatEntry({
    role: "codex_output",
    content: key
      ? `Cleared ${key} override for biome "${biomeId}".`
      : `Cleared all biome color overrides for "${biomeId}".`,
    ts: Date.now(),
  });
}

function teleportPlayerToBiome(rawBiomeName, options = {}) {
  const targetBiome = resolveBiomeName(rawBiomeName);
  if (!targetBiome) {
    if (!options.skipConfirmation) {
      const biomeGuess = guessBiomeName(rawBiomeName);
      if (biomeGuess) {
        requestWorldCommandConfirmation({
          canonicalCommand: `/world tp biome ${biomeGuess.biome.id}`,
          reason: `I interpreted "${String(rawBiomeName).trim()}" as biome "${biomeGuess.biome.id}".`,
          intent: { type: "teleport_biome", biomeId: biomeGuess.biome.id },
        });
        return;
      }
    }
    addChatEntry({
      role: "codex_output",
      content: `Unknown biome "${rawBiomeName}". Click "World Cmds" for the biome list.`,
      ts: Date.now(),
    });
    return;
  }

  const target = findNearestBiomeTarget(targetBiome.id, player.position.x, player.position.z);
  if (!target) {
    addChatEntry({
      role: "codex_output",
      content: `Could not find biome "${targetBiome.id}" nearby. Try another biome.`,
      ts: Date.now(),
    });
    return;
  }

  player.position.set(target.x, target.y, target.z);
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  const cx = Math.floor(player.position.x / CHUNK_SIZE);
  const cz = Math.floor(player.position.z / CHUNK_SIZE);
  ensureChunks(cx, cz);
  updateBiomeHud();
  saveState();

  addChatEntry({
    role: "codex_output",
    content: `Teleported to ${targetBiome.label} at ${Math.round(target.x)}, ${Math.round(target.z)}.`,
    ts: Date.now(),
  });
}

function resolveBiomeName(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!normalized) return null;
  for (const biome of Object.values(BIOME_DEFS)) {
    const idKey = biome.id.toLowerCase().replace(/[^a-z]/g, "");
    const labelKey = biome.label.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized === idKey || normalized === labelKey) {
      return biome;
    }
  }
  return null;
}

function guessBiomeName(name) {
  const query = normalizeWorldCommandToken(name);
  if (!query) return null;
  const candidates = Object.values(BIOME_DEFS).map((biome) => ({
    biome,
    keys: [biome.id, biome.label],
  }));
  let best = null;
  let secondScore = Infinity;
  for (const candidate of candidates) {
    let candidateScore = Infinity;
    for (const key of candidate.keys) {
      const score = scoreWorldTokenGuess(query, normalizeWorldCommandToken(key));
      if (score < candidateScore) candidateScore = score;
    }
    if (candidateScore < best?.score || best == null) {
      secondScore = best?.score ?? Infinity;
      best = { biome: candidate.biome, score: candidateScore };
      continue;
    }
    if (candidateScore < secondScore) secondScore = candidateScore;
  }
  if (!best) return null;
  const maxScore = maxWorldGuessScore(query.length);
  const hasClearMargin = secondScore - best.score >= 1;
  if (best.score > maxScore) return null;
  if (!hasClearMargin && best.score > 0) return null;
  return best;
}

function guessWorldTeleportBiomeCommand(parts) {
  if (parts.length < 3 || (parts[0] || "").toLowerCase() !== "/world") return null;

  const sub = guessWorldCommandToken(parts[1], ["biome", "tp"]);
  if (!sub) return null;

  if (sub.value === "biome" && !sub.exact) {
    const biomeInput = parts.slice(2).join(" ");
    if (!biomeInput) return null;
    const guessedBiome = resolveBiomeName(biomeInput) || guessBiomeName(biomeInput)?.biome;
    if (!guessedBiome) return null;
    return {
      canonicalCommand: `/world biome ${guessedBiome.id}`,
      reason: `I interpreted "${parts[1]}" as "biome"${guessedBiome.id !== biomeInput ? ` and "${biomeInput}" as "${guessedBiome.id}"` : ""}.`,
      intent: { type: "teleport_biome", biomeId: guessedBiome.id },
    };
  }

  if (sub.value !== "tp") return null;
  if (parts.length < 4) return null;
  const target = guessWorldCommandToken(parts[2], ["biome"]);
  if (!target || (sub.exact && target.exact)) return null;

  const biomeInput = parts.slice(3).join(" ");
  if (!biomeInput) return null;
  const guessedBiomeResult = resolveBiomeName(biomeInput) ? null : guessBiomeName(biomeInput);
  const guessedBiome = guessedBiomeResult?.biome || resolveBiomeName(biomeInput);
  if (!guessedBiome) return null;

  const reasonParts = [];
  if (!sub.exact) reasonParts.push(`"${parts[1]}" as "tp"`);
  if (!target.exact) reasonParts.push(`"${parts[2]}" as "biome"`);
  if (guessedBiomeResult) reasonParts.push(`"${biomeInput}" as "${guessedBiome.id}"`);

  return {
    canonicalCommand: `/world tp biome ${guessedBiome.id}`,
    reason: reasonParts.length ? `I interpreted ${reasonParts.join(", ")}.` : null,
    intent: { type: "teleport_biome", biomeId: guessedBiome.id },
  };
}

function handlePendingWorldCommandConfirmation(message) {
  if (!pendingWorldCommandConfirmation) return false;
  const normalized = String(message || "").trim().toLowerCase();
  if (/^\/world(?:\s|$)/.test(normalized)) {
    pendingWorldCommandConfirmation = null;
    return false;
  }
  if (/^(y|yes|yeah|yep|sure|ok|okay|do it|apply)$/i.test(normalized)) {
    const pending = pendingWorldCommandConfirmation;
    pendingWorldCommandConfirmation = null;
    addChatEntry({
      role: "codex_output",
      content: `Applying guessed world command: ${pending.canonicalCommand}`,
      ts: Date.now(),
    });
    executeWorldCommandIntent(pending.intent);
    return true;
  }
  if (/^(n|no|nope|cancel|stop)$/i.test(normalized)) {
    pendingWorldCommandConfirmation = null;
    addChatEntry({
      role: "codex_output",
      content: "Cancelled guessed world command.",
      ts: Date.now(),
    });
    return true;
  }
  return false;
}

function requestWorldCommandConfirmation(guess) {
  pendingWorldCommandConfirmation = {
    canonicalCommand: guess.canonicalCommand,
    intent: guess.intent,
  };
  addChatEntry({
    role: "codex_output",
    content: [
      "I'm not fully sure what you meant.",
      `Best guess: ${guess.canonicalCommand}`,
      guess.reason || null,
      'Reply "yes" to apply it or "no" to cancel.',
    ]
      .filter(Boolean)
      .join("\n"),
    ts: Date.now(),
  });
}

function executeWorldCommandIntent(intent) {
  if (!intent || typeof intent !== "object") return;
  if (intent.type === "teleport_biome" && intent.biomeId) {
    teleportPlayerToBiome(intent.biomeId, { skipConfirmation: true });
  }
}

function guessWorldCommandToken(raw, candidates) {
  const query = normalizeWorldCommandToken(raw);
  if (!query) return null;
  let best = null;
  let secondScore = Infinity;
  for (const candidate of candidates) {
    const score = scoreWorldTokenGuess(query, normalizeWorldCommandToken(candidate));
    if (best == null || score < best.score) {
      secondScore = best?.score ?? Infinity;
      best = { value: candidate, score };
      continue;
    }
    if (score < secondScore) secondScore = score;
  }
  if (!best) return null;
  if (best.score === 0) return { value: best.value, exact: true, score: 0 };
  if (best.score > maxWorldGuessScore(query.length)) return null;
  if (secondScore - best.score < 1) return null;
  return { value: best.value, exact: false, score: best.score };
}

function normalizeWorldCommandToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function scoreWorldTokenGuess(query, candidate) {
  if (!query || !candidate) return Infinity;
  if (query === candidate) return 0;
  if (candidate.startsWith(query) || query.startsWith(candidate)) return 1;
  return levenshteinDistance(query, candidate);
}

function maxWorldGuessScore(length) {
  if (length <= 2) return 1;
  if (length <= 5) return 2;
  return 3;
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function findNearestBiomeTarget(targetBiomeId, originX, originZ) {
  const maxRadius = 8192;
  const radialBandSize = 48;
  let attempts = 0;
  let bestDry = null;
  let bestAny = null;
  let firstMatchBand = null;
  let currentBand = 0;
  let bandBestDry = null;

  const considerCandidate = (x, z, radius) => {
    if (attempts >= BIOME_TP_MAX_ATTEMPTS) return "stop";
    attempts += 1;
    const biome = getBiomeAt(x, z);
    if (biome?.id !== targetBiomeId) return null;
    const info = getGroundPointInfo(x, z);
    const candidate = {
      x,
      z,
      radius,
      centerScore: estimateBiomeCenterScore(targetBiomeId, x, z),
      ...info,
    };
    bestAny = pickBetterBiomeTeleportCandidate(bestAny, candidate);
    if (candidate.isDryLand) {
      bestDry = pickBetterBiomeTeleportCandidate(bestDry, candidate);
      if (firstMatchBand == null) firstMatchBand = Math.ceil(radius / radialBandSize);
    }
    return candidate;
  };

  const finalizeBand = (band) => {
    if (bandBestDry?.centerScore >= BIOME_CENTER_TARGET_SCORE) {
      return toPlayerPlacementTarget(bandBestDry.x, bandBestDry.z, bandBestDry.groundY);
    }
    if (
      firstMatchBand != null &&
      band >= firstMatchBand + BIOME_TP_EXTRA_RINGS_AFTER_FIRST_MATCH
    ) {
      return "stop";
    }
    bandBestDry = null;
    return null;
  };

  const originCandidate = considerCandidate(originX, originZ, 0);
  if (originCandidate?.isDryLand && originCandidate.centerScore >= BIOME_CENTER_TARGET_SCORE) {
    return toPlayerPlacementTarget(originCandidate.x, originCandidate.z, originCandidate.groundY);
  }

  // Vogel/sunflower spiral sampling spreads points with near-uniform disk density.
  for (let sampleIndex = 1; attempts < BIOME_TP_MAX_ATTEMPTS; sampleIndex += 1) {
    const t = sampleIndex / (BIOME_TP_MAX_ATTEMPTS - 1);
    const radius = Math.sqrt(t) * maxRadius;
    if (radius > maxRadius) break;
    const band = Math.ceil(radius / radialBandSize);
    if (band !== currentBand) {
      const bandResult = finalizeBand(currentBand);
      if (bandResult === "stop") break;
      if (bandResult) return bandResult;
      currentBand = band;
    }

    const angle = sampleIndex * BIOME_TP_SUNFLOWER_GOLDEN_ANGLE;
    const x = originX + Math.cos(angle) * radius;
    const z = originZ + Math.sin(angle) * radius;
    const candidate = considerCandidate(x, z, radius);
    if (candidate === "stop") break;
    if (!candidate?.isDryLand) continue;
    bandBestDry = pickBetterBiomeTeleportCandidate(bandBestDry, candidate);
  }

  const finalBandResult = finalizeBand(currentBand);
  if (finalBandResult && finalBandResult !== "stop") {
    return finalBandResult;
  }

  const fallback = bestDry || bestAny;
  return fallback ? toPlayerPlacementTarget(fallback.x, fallback.z, fallback.groundY) : null;
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

const updateEngine = createUpdateEngine({
  applyAction,
  snapshot: snapshotRuntimeState,
  restore: restoreRuntimeState,
  onTrace: (result, action) => {
    trace.addTraceEntry(result, action);
  },
  onChatNote: (content) => {
    addChatEntry({ role: "codex_output", content, ts: Date.now() });
  },
});

const runtimeActionExecutor = createRuntimeActionExecutor({
  state,
  player,
  scene,
  water,
  seedEl,
  terrainMaterial,
  treeChunks,
  chunkSize: CHUNK_SIZE,
  clampNumber,
  toColorHex,
  syncAtmosphereFromState,
  syncTerrainShaderUniforms,
  syncTreeMaterials,
  ensureChunks,
  rebuildTerrain,
  rebuildLandmarks,
  setNoiseSeed: (seed) => {
    noiseSeed = seed;
  },
  setTimeOfDay,
  runLocalWorldCommand: (command) => tryHandleLocalChatCommand(command),
});

function applyUpdate(update) {
  if (!update) return;
  stateEl.textContent = "updating";
  const result = updateEngine.applyUpdate(update);
  if (!result.ok) {
    addChatEntry({
      role: "codex_output",
      content: `Update rejected: ${result.reason}`,
      ts: Date.now(),
    });
    stateEl.textContent = "ready";
    return;
  }
  if (result.skipped) {
    addChatEntry({
      role: "codex_output",
      content: `Skipped duplicate update ${result.updateId}.`,
      ts: Date.now(),
    });
    stateEl.textContent = "ready";
    return;
  }
  if (result.totalCount > 0) {
    addChatEntry({
      role: "codex_output",
      content: `Action results: ${result.appliedCount}/${result.totalCount} applied.`,
      ts: Date.now(),
    });
  }
  if (result.rejectedCount > 0) {
    addChatEntry({
      role: "codex_output",
      content: `Rejected ${result.rejectedCount} invalid action(s).`,
      ts: Date.now(),
    });
  }
  stateEl.textContent = "ready";
}

function snapshotRuntimeState() {
  return {
    seed: state.seed,
    world: structuredClone(state.world),
    worldTime,
    player: {
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      velocity: {
        x: player.velocity.x,
        y: player.velocity.y,
        z: player.velocity.z,
      },
      yaw: player.yaw,
      pitch: player.pitch,
      grounded: player.grounded,
    },
  };
}

function restoreRuntimeState(snapshot) {
  state.seed = snapshot.seed;
  state.world = structuredClone(snapshot.world);
  noiseSeed = state.seed;
  seedEl.textContent = state.seed;
  worldTime = clampNumber(snapshot.worldTime, 0, DAY_NIGHT.dayLengthSeconds, worldTime);

  player.position.x = snapshot.player.position.x;
  player.position.y = snapshot.player.position.y;
  player.position.z = snapshot.player.position.z;
  player.velocity.x = snapshot.player.velocity.x;
  player.velocity.y = snapshot.player.velocity.y;
  player.velocity.z = snapshot.player.velocity.z;
  player.yaw = snapshot.player.yaw;
  player.pitch = snapshot.player.pitch;
  player.grounded = snapshot.player.grounded;

  terrainMaterial.color.set(state.world.terrainColor);
  water.position.y = state.world.water.level;
  water.material.opacity = state.world.water.opacity;
  water.material.color.set(state.world.water.colorHex);
  scene.fog.density = state.world.fog.density;
  syncAtmosphereFromState();
  syncWaterColorFromState();
  syncTerrainShaderUniforms();
  syncTreeMaterials();
  treeChunks.forEach((treeGroup) => {
    scene.remove(treeGroup);
  });
  treeChunks.clear();
  rebuildTerrain();
  const cx = Math.floor(player.position.x / CHUNK_SIZE);
  const cz = Math.floor(player.position.z / CHUNK_SIZE);
  ensureChunks(cx, cz);
  rebuildLandmarks();
}

function applyAction(action) {
  return runtimeActionExecutor.applyAction(action);
}

function saveState() {
  savePersistedState({
    storageKey: STORAGE_KEY,
    stateVersion: STATE_VERSION,
    resetInProgress,
    state,
    worldTime,
    dayLengthSeconds: DAY_NIGHT.dayLengthSeconds,
    chatOpen,
    player,
    chatState,
  });
}

const saveTimer = setInterval(saveState, 2000);
function handleBeforeUnload() {
  saveState();
}
window.addEventListener("beforeunload", handleBeforeUnload);
