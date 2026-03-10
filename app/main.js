import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { createBridgeClient } from "./bridgeClient.js";
import { createUpdateEngine } from "./updateEngine.js";
import { createChatStore } from "./chat/chatStore.js";
import { updatePlayerRuntime, MOVEMENT_VERSION, getFeetY, getEyeY, getGroundYAt } from "./player/movement.js?v=20260301";
import { loadPersistedState, savePersistedState, clampNumber, toColorHex } from "./state/persistence.js";
import { createTerrainHeightSampler } from "./world/terrainNoise.js";
import { createRuntimeActionExecutor } from "./actions/runtimeActions.js";
import { createTraceLogger } from "./trace/traceLog.js";
import { configureTerrainMaterial } from "./world/terrainShader.js";
import { mapMinimapClickToWorld } from "./minimap/clickTeleport.js";
import {
  BIOME_BLEND_GRADIENT_STEP_METERS,
  BIOME_BLEND_HALF_WIDTH_METERS,
  BIOME_BLEND_MAX_SLOTS,
  BIOME_BLEND_PRECHECK_MARGIN,
  BIOME_EDGE_SMOOTH_MAX_METERS,
  BIOME_EDGE_SMOOTH_START_METERS,
  BIOME_HUMIDITY_LOOKUP,
  BIOME_SUBDIVISION_PREFIX_JAGGED,
  BIOME_SUBDIVISION_PREFIX_SMOOTH,
  BIOME_VARIANTS,
  BUMPY_BIOME_SUBDIVISION_PRECHECK_MARGIN,
  BUMPY_BIOME_SUBDIVISION_PRIMARY_SCALE,
  BUMPY_BIOME_SUBDIVISION_SECONDARY_SCALE,
  BUMPY_BIOME_SUBDIVISION_THRESHOLD_JAGGED,
  BUMPY_BIOME_SUBDIVISION_THRESHOLD_SMOOTH,
  CLIMATE_ZONE_THRESHOLD_HIGH,
  CLIMATE_ZONE_THRESHOLD_LOW,
  DEFAULT_TRANSITION_BIOME_ID,
  DETAIL_BIOME_EDGE_DISTANCE_FACTOR,
  DETAIL_BIOME_FADE_OUT_METERS,
  HIGH_ALTITUDE_BIOME_BORDER_BLEND_HEIGHT_METERS,
  HIGH_ALTITUDE_BIOME_THRESHOLD_METERS,
  HIGH_ALTITUDE_MOUNTAIN_HUMIDITY_LOOKUP,
  HUMIDITY_ZONE_THRESHOLD_HIGH,
  HUMIDITY_ZONE_THRESHOLD_LOW,
  HUMIDITY_ZONE_KEYS,
  HUMIDITY_ZONE_LABELS,
  MOUNTAIN_BIOME_BORDER_BLEND_HEIGHT_METERS,
  MOUNTAIN_BIOME_SUFFIX,
  OCEAN_BIOME_COASTAL_MAX_MOUNTAIN_ADDITIVE_HEIGHT,
  OCEAN_DEEP_BIOME_COAST_SIGNAL_END,
  OCEAN_DEEP_BIOME_COAST_RANGE_MASK_SCALE,
  OCEAN_DEEP_BIOME_COAST_SIGNAL_START,
  OCEAN_BIOME_OPEN_BLEND_PRECHECK_HEIGHT,
  OCEAN_BIOME_OPEN_COASTAL_BLEND_HALF_WIDTH_METERS,
  OCEAN_BIOME_OPEN_MAX_MOUNTAIN_ADDITIVE_HEIGHT,
  OCEAN_BIOME_LAND_BLEND_HALF_WIDTH_METERS,
  OCEAN_BIOME_LAND_BLEND_PRECHECK_HEIGHT,
  OCEAN_BIOME_VARIANTS,
  ROCKY_MOUNTAIN_HUMIDITY_LOOKUP,
  SIMPLE_MOUNTAIN_HIGH_ALTITUDE_FADE_METERS,
  SIMPLE_MOUNTAIN_SELECTOR_BLEND_HALF_WIDTH_METERS,
  SIMPLE_MOUNTAIN_SELECTOR_PRECHECK_MARGIN,
  SIMPLE_MOUNTAIN_SELECTOR_PRIMARY_SCALE,
  SIMPLE_MOUNTAIN_SELECTOR_SECONDARY_SCALE,
  SIMPLE_MOUNTAIN_TARGET_SHARE,
  WETLAND_ELEVATION_FADE_BAND_METERS,
  WETLAND_MOUNTAIN_HEIGHT_MAX_METERS,
} from "./world/biomes/constants.js";
import { buildBiomeRegistry } from "./world/biomes/registry.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";

const canvas = document.getElementById("scene");
const seedEl = document.getElementById("seed");
const xyzEl = document.getElementById("xyz");
const feetYEl = document.getElementById("feet-y");
const eyeYEl = document.getElementById("eye-y");
const waterYEl = document.getElementById("water-y");
const playerYEl = document.getElementById("player-y");
const cameraYEl = document.getElementById("camera-y");
const velYEl = document.getElementById("vel-y");
const groundedEl = document.getElementById("grounded");
const moveVersionEl = document.getElementById("move-version");
const chunkEl = document.getElementById("chunk");

const biomeEl = document.getElementById("biome");
const temperatureTypeEl = document.getElementById("temperature-type");
const humidityTypeEl = document.getElementById("humidity-type");
const fpsEl = document.getElementById("fps");
const clockTimeEl = document.getElementById("clock-time");
const startupLoadingEl = document.getElementById("startup-loading");
const startupLoadingTitleEl = document.getElementById("startup-loading-title");
const startupLoadingSubtitleEl = document.getElementById("startup-loading-subtitle");
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
const minimapCanvas = document.getElementById("minimap-canvas");
const minimapCtx = minimapCanvas?.getContext("2d");
const minimapZoomInBtn = document.getElementById("minimap-zoom-in");
const minimapZoomOutBtn = document.getElementById("minimap-zoom-out");
const LOCAL_COMMAND_HELP_URL = new URL("./commandHelp.json", import.meta.url);
const FALLBACK_FRONTEND_COMMAND_HELP_LINES = [
  "/help <command>",
  "/time",
  "/time <0..1 | 0..24 | HH:MM [am|pm] | percent | preset>",
  "/commit",
  "/commit <message hint>",
  "/tp <biome-name>",
  "tp <biome-name>",
  "/tp <x> <z>",
  "tp <x> <z>",
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
let lastDisplayedFps = -1;
let fpsSmoothed = 60;
let fpsUpdateAccumulator = 0;
let startupLoadingDismissed = false;
let lastVisualSampleAtMs = -Infinity;
let lastVisualSampleX = Number.NaN;
let lastVisualSampleZ = Number.NaN;
let minimapImageData = null;
let minimapPixelWidth = 0;
let minimapPixelHeight = 0;
let minimapPixelData = null;
let lastMinimapUpdateAt = -Infinity;
let lastMinimapSampleX = Number.NaN;
let lastMinimapSampleZ = Number.NaN;
let lastMinimapSampleYaw = Number.NaN;
let lastMinimapSampleZoomIndex = Number.NaN;
let minimapNeedsRender = true;
let activeChunkBuildJobId = 0;
let chunkBuildInProgress = false;
let chunkBuildContext = null;
let runtimeChunkBuildJobId = 0;
let runtimeChunkBuildRunning = false;
let runtimeChunkBuildQueuedTarget = null;
let runtimeChunkBuildAppliedTarget = null;
let currentNightAmount = 0;
let pendingInitialNightSync = false;
let pendingTimeCycleRefresh = false;
const VISUAL_SAMPLE_MIN_INTERVAL_MS = 100;
const VISUAL_SAMPLE_MIN_DISTANCE_SQ = 4;

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

function updateStatusFps(dt) {
  if (!fpsEl || !(dt > 0)) return;
  const instantFps = 1 / dt;
  const smoothing = 0.12;
  fpsSmoothed += (instantFps - fpsSmoothed) * smoothing;
  fpsUpdateAccumulator += dt;
  if (fpsUpdateAccumulator < 0.2) return;
  fpsUpdateAccumulator = 0;
  const nextFps = Math.round(clampNumber(fpsSmoothed, 0, 999, 0));
  if (nextFps === lastDisplayedFps) return;
  lastDisplayedFps = nextFps;
  fpsEl.textContent = String(nextFps);
}

function setStartupLoadingVisible(visible) {
  if (!startupLoadingEl) return;
  startupLoadingEl.classList.toggle("hidden", !visible);
  startupLoadingEl.setAttribute("aria-hidden", String(!visible));
}

function setStartupLoadingMessage(title, subtitle = null) {
  if (startupLoadingTitleEl && typeof title === "string" && title.trim()) {
    startupLoadingTitleEl.textContent = title;
  }
  if (startupLoadingSubtitleEl && typeof subtitle === "string") {
    startupLoadingSubtitleEl.textContent = subtitle;
  }
}

function beginChunkBuildUi(context, subtitle) {
  // Cancel/clear any queued runtime chunk streaming while a full chunk build UI flow takes over.
  runtimeChunkBuildRunning = false;
  runtimeChunkBuildQueuedTarget = null;
  chunkBuildInProgress = true;
  chunkBuildContext = context;
  setStartupLoadingVisible(true);
  setStartupLoadingMessage("Loading...", subtitle);
  if (stateEl && context !== "startup") {
    stateEl.textContent = "loading";
  }
}

function finishChunkBuildUi(context) {
  if (chunkBuildContext !== context) return;
  chunkBuildInProgress = false;
  chunkBuildContext = null;
  if (context !== "startup") {
    setStartupLoadingVisible(false);
    startupLoadingDismissed = true;
    if (stateEl) stateEl.textContent = "ready";
  }
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
  biomeSettings: {},
  trees: {
    density: 0.22,
    trunkColor: "#5f4632",
    canopyColor: "#4a8953",
  },
  water: {
    level: 0.0,
    colorHex: "#4a93c7",
    opacity: 0.6,
  },
  fog: {
    colorHex: "#9db5c5",
    density: 0.0012,
  },
  landmarks: [],
};

const { BIOME_DEFS, BUMPY_BIOME_SUBDIVISIONS } = buildBiomeRegistry({ THREE, clampNumber });

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
const PLAYER_HEIGHT = 1.7;
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
const originOffset = new THREE.Vector3();
const worldGroup = new THREE.Group();
scene.add(worldGroup);
const ORIGIN_RECENTER_GRID_METERS = 4096;
const ORIGIN_RECENTER_THRESHOLD_METERS = Math.floor(ORIGIN_RECENTER_GRID_METERS * 0.75);
const renderPlayerPosition = new THREE.Vector3();
const renderCameraPosition = new THREE.Vector3();
const renderTargetPosition = new THREE.Vector3();
worldGroup.position.set(-originOffset.x, -originOffset.y, -originOffset.z);

const CAMERA_NEAR_METERS = 0.1;
const CAMERA_FAR_BASE_METERS = 10000;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, CAMERA_NEAR_METERS, CAMERA_FAR_BASE_METERS);

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
  moonColor: { value: new THREE.Color("#b2c8f4") },
  moonDirection: { value: new THREE.Vector3(-0.6, 0.35, -0.2).normalize() },
  sunDiscPower: { value: 256 },
  sunGlowPower: { value: 10 },
  sunGlowStrength: { value: 0.34 },
  moonDiscPower: { value: 280 },
  moonStrength: { value: 0.8 },
  sunRayStrength: { value: 0 },
  moonRayStrength: { value: 0 },
  skyTime: { value: 0 },
  waterLevel: { value: state.world.water.level },
  cameraWorldPos: { value: new THREE.Vector3(0, PLAYER_HEIGHT, 0) },
  underwaterSkyMix: { value: 0 },
  underwaterFogTint: { value: new THREE.Color(state.world.fog.colorHex) },
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
      uniform vec3 moonColor;
      uniform vec3 moonDirection;
      uniform float sunDiscPower;
      uniform float sunGlowPower;
      uniform float sunGlowStrength;
      uniform float moonDiscPower;
      uniform float moonStrength;
      uniform float sunRayStrength;
      uniform float moonRayStrength;
      uniform float skyTime;
      uniform float waterLevel;
      uniform vec3 cameraWorldPos;
      uniform float underwaterSkyMix;
      uniform vec3 underwaterFogTint;
      varying vec3 vWorldPosition;

      vec2 sampleWaveGradient(vec2 p, float t) {
        float phaseA = dot(p, vec2(0.19, 0.12));
        float phaseB = dot(p, vec2(-0.15, 0.17));
        float phaseC = dot(p, vec2(0.31, -0.13));
        vec2 grad = vec2(0.0);
        grad += vec2(0.19, 0.12) * (cos(phaseA) * cos(t * 0.55)) * 0.42;
        grad += vec2(-0.15, 0.17) * (cos(phaseB) * sin(t * 0.73)) * 0.36;
        grad += vec2(0.31, -0.13) * (cos(phaseC + sin(t * 0.34) * 0.35) * cos(t * 0.91)) * 0.22;
        return grad * 2.35;
      }

      vec3 sampleWaveNormal(vec2 p, float t) {
        vec2 g = sampleWaveGradient(p, t);
        return normalize(vec3(-g.x, 1.0, -g.y));
      }

      float sampleCausticPulse(vec2 p, float t) {
        float c1 = sin(dot(p, vec2(0.73, -0.51))) * cos(t * 0.78);
        float c2 = sin(dot(p, vec2(-0.94, 0.79)) + sin(t * 0.31) * 0.42) * sin(t * 0.63);
        float c3 = sin(dot(p, vec2(0.47, 1.03))) * cos(t * 0.95);
        float mixVal = c1 * 0.45 + c2 * 0.35 + c3 * 0.2;
        return smoothstep(0.3, 1.0, 0.5 + 0.5 * mixVal);
      }

      float sampleRefractedBeam(vec3 viewDir, vec3 lightDir, vec2 hit, float t, float tightPower, float softPower) {
        vec2 drift = vec2(sin(t * 0.37), cos(t * 0.29));
        vec3 nA = sampleWaveNormal(hit, t);
        vec3 nB = sampleWaveNormal(hit + drift * 6.0, t + 1.7);
        vec3 nC = sampleWaveNormal(hit + vec2(-drift.y, drift.x) * 9.0, t + 3.4);
        vec3 refrA = refract(-lightDir, nA, 1.0 / 1.333);
        vec3 refrB = refract(-lightDir, nB, 1.0 / 1.333);
        vec3 refrC = refract(-lightDir, nC, 1.0 / 1.333);
        float alignA = max(dot(viewDir, normalize(-refrA)), 0.0);
        float alignB = max(dot(viewDir, normalize(-refrB)), 0.0);
        float alignC = max(dot(viewDir, normalize(-refrC)), 0.0);
        float tight = pow(alignA, tightPower) * 0.72 + pow(alignB, tightPower * 0.96) * 0.2 + pow(alignC, tightPower * 0.92) * 0.08;
        float soft = pow(max(alignA, alignB), softPower) * 0.06 + pow(alignC, softPower * 0.92) * 0.035;
        float sheet = pow(max(dot(sampleWaveNormal(hit, t), -lightDir), 0.0), 8.0) * 0.05;
        float pulse = sampleCausticPulse(hit * 0.18, t);
        return (tight + soft + sheet) * mix(0.82, 1.62, pulse);
      }

      vec2 orbitOffset(vec2 origin, float radius, float angle, float wobbleFreq, float wobbleAmount) {
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 wobble = vec2(
          sin(angle * wobbleFreq + origin.x * 0.09),
          cos(angle * (wobbleFreq * 0.87) + origin.y * 0.07)
        ) * wobbleAmount;
        return origin + dir * radius + wobble;
      }

      void main() {
        vec3 dir = normalize(vWorldPosition - cameraWorldPos);
        float heightMix = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        float nearHorizon = 1.0 - abs(dir.y);
        float horizonBoost = smoothstep(0.0, 0.7, nearHorizon);
        vec3 col = mix(groundColor, horizonColor, smoothstep(0.04, 0.56, heightMix));
        col = mix(col, topColor, smoothstep(0.5, 1.0, heightMix));
        vec3 sunDir = normalize(sunDirection);
        vec3 moonDir = normalize(moonDirection);
        float sunDot = max(dot(dir, sunDir), 0.0);
        float sunAmount = pow(sunDot, sunDiscPower);
        float sunGlow = pow(sunDot, sunGlowPower) * sunGlowStrength;
        col += sunColor * (sunAmount + sunGlow);
        float moonDot = max(dot(dir, moonDir), 0.0);
        float moonDisc = pow(moonDot, moonDiscPower) * moonStrength;
        col += moonColor * moonDisc;

        bool raysActive = (sunRayStrength > 0.0001 || moonRayStrength > 0.0001);
        bool cameraUnderwater = cameraWorldPos.y < waterLevel - 0.01;
        if (raysActive && cameraUnderwater && dir.y > 0.0005) {
          float travelToSurface = (waterLevel - cameraWorldPos.y) / max(dir.y, 0.0005);
          vec2 surfaceHit = cameraWorldPos.xz + dir.xz * travelToSurface;
          vec2 rayUv = surfaceHit * 3.05;
          float waveTime = skyTime * 0.72;
          float mediumFade = exp(-travelToSurface * 0.018);
          if (sunRayStrength > 0.0001) {
            vec2 sunOriginA = vec2(8.0, -6.0);
            vec2 sunOriginB = vec2(-10.0, 7.0);
            vec2 sunOriginC = vec2(13.0, 10.0);
            vec2 sunOriginD = vec2(-4.0, -13.0);
            vec2 sunOriginE = vec2(18.0, 2.0);
            vec2 rayJitterA = orbitOffset(sunOriginA, 4.2, waveTime * 0.41, 2.8, 1.0);
            vec2 rayJitterB = orbitOffset(sunOriginB, 3.9, -waveTime * 0.34 + 1.2, 2.2, 0.88);
            vec2 rayJitterC = orbitOffset(sunOriginC, 3.7, waveTime * 0.48 - 0.8, 3.1, 0.96);
            vec2 rayJitterD = orbitOffset(sunOriginD, 3.5, -waveTime * 0.37 + 0.4, 2.5, 0.84);
            vec2 rayJitterE = orbitOffset(sunOriginE, 3.3, waveTime * 0.44 + 2.3, 2.9, 0.82);
            float sunMaskA = smoothstep(0.88, 0.994, sampleCausticPulse((rayUv + rayJitterA) * 0.14, waveTime));
            float sunMaskB = smoothstep(0.88, 0.994, sampleCausticPulse((rayUv + rayJitterB) * 0.14, waveTime + 1.8));
            float sunMaskC = smoothstep(0.88, 0.994, sampleCausticPulse((rayUv + rayJitterC) * 0.14, waveTime + 3.3));
            float sunMaskD = smoothstep(0.88, 0.994, sampleCausticPulse((rayUv + rayJitterD) * 0.14, waveTime + 4.9));
            float sunMaskE = smoothstep(0.88, 0.994, sampleCausticPulse((rayUv + rayJitterE) * 0.14, waveTime + 6.2));
            float sunBeam =
              sampleRefractedBeam(dir, sunDir, rayUv + rayJitterA, waveTime + 0.9, 24.0, 5.9) * sunMaskA * 0.31 +
              sampleRefractedBeam(dir, sunDir, rayUv + rayJitterB, waveTime + 2.1, 22.8, 5.5) * sunMaskB * 0.22 +
              sampleRefractedBeam(dir, sunDir, rayUv + rayJitterC, waveTime + 3.4, 24.7, 6.1) * sunMaskC * 0.18 +
              sampleRefractedBeam(dir, sunDir, rayUv + rayJitterD, waveTime + 4.8, 23.4, 5.7) * sunMaskD * 0.16 +
              sampleRefractedBeam(dir, sunDir, rayUv + rayJitterE, waveTime + 6.0, 25.1, 6.3) * sunMaskE * 0.13;
            float sunShaftField =
              smoothstep(0.91, 0.997, sampleCausticPulse((rayUv + orbitOffset(vec2(0.0), 2.6, waveTime * 0.39, 2.4, 0.52)) * 0.18, waveTime + 2.7)) *
              pow(max(dot(sampleWaveNormal(rayUv + orbitOffset(vec2(0.0), 2.2, -waveTime * 0.31, 2.1, 0.4), waveTime), -sunDir), 0.0), 5.0);
            sunBeam += sunShaftField * (0.025 + 0.07 * pow(max(dir.y, 0.0), 1.4));
            col += sunColor * (sunBeam * sunRayStrength * mediumFade);
          }
          if (moonRayStrength > 0.0001) {
            vec2 moonOrigin = vec2(38.0, -22.0);
            vec2 moonBase = rayUv + orbitOffset(moonOrigin, 3.7, -waveTime * 0.26 + 0.6, 2.0, 0.8);
            vec2 moonJitterA = orbitOffset(vec2(0.0), 2.8, waveTime * 0.35 + 0.7, 2.6, 0.64);
            vec2 moonJitterB = orbitOffset(vec2(9.0, -8.0), 2.6, -waveTime * 0.31 + 1.4, 2.3, 0.6);
            vec2 moonJitterC = orbitOffset(vec2(-11.0, 10.0), 2.5, waveTime * 0.41 - 0.9, 2.9, 0.62);
            vec2 moonJitterD = orbitOffset(vec2(4.0, 13.0), 2.3, -waveTime * 0.29 + 2.2, 2.4, 0.58);
            float moonMaskA = smoothstep(0.89, 0.995, sampleCausticPulse((moonBase + moonJitterA) * 0.14, waveTime + 5.0));
            float moonMaskB = smoothstep(0.89, 0.995, sampleCausticPulse((moonBase + moonJitterB) * 0.14, waveTime + 6.4));
            float moonMaskC = smoothstep(0.89, 0.995, sampleCausticPulse((moonBase + moonJitterC) * 0.14, waveTime + 7.8));
            float moonMaskD = smoothstep(0.89, 0.995, sampleCausticPulse((moonBase + moonJitterD) * 0.14, waveTime + 9.1));
            float moonBeam =
              sampleRefractedBeam(dir, moonDir, moonBase + moonJitterA, waveTime + 11.0, 23.0, 5.6) * moonMaskA * 0.33 +
              sampleRefractedBeam(dir, moonDir, moonBase + moonJitterB, waveTime + 12.6, 21.8, 5.2) * moonMaskB * 0.25 +
              sampleRefractedBeam(dir, moonDir, moonBase + moonJitterC, waveTime + 14.1, 20.9, 4.9) * moonMaskC * 0.22 +
              sampleRefractedBeam(dir, moonDir, moonBase + moonJitterD, waveTime + 15.4, 22.2, 5.35) * moonMaskD * 0.18;
            float moonShaftField =
              smoothstep(0.92, 0.997, sampleCausticPulse((moonBase + orbitOffset(vec2(0.0), 2.0, -waveTime * 0.36, 2.2, 0.45)) * 0.17, waveTime + 6.2)) *
              pow(max(dot(sampleWaveNormal(moonBase + orbitOffset(vec2(0.0), 1.8, waveTime * 0.32, 2.0, 0.36), waveTime + 2.0), -moonDir), 0.0), 5.1);
            moonBeam += moonShaftField * (0.02 + 0.06 * pow(max(dir.y, 0.0), 1.2));
            col += moonColor * (moonBeam * moonRayStrength * mediumFade);
          }
        }
        col = mix(col, underwaterFogTint, clamp(underwaterSkyMix, 0.0, 1.0));
        col *= mix(1.0, 0.42, clamp(underwaterSkyMix, 0.0, 1.0));
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
moon.renderOrder = -1;
moon.material.depthTest = false;
moon.material.depthWrite = false;
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
  worldGroup.add(cloudGroup);
}

const NIGHT_TINT_COLOR = new THREE.Color("#000000");
const TERRAIN_NIGHT_TINT = NIGHT_TINT_COLOR;
const WATER_PLANE_SIZE = 8000;
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(WATER_PLANE_SIZE, WATER_PLANE_SIZE),
  new THREE.MeshPhysicalMaterial({
    color: state.world.water.colorHex,
    transparent: true,
    opacity: state.world.water.opacity,
    roughness: 0.2,
    metalness: 0.03,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
  })
);
const WATER_FADE_START_METERS = 1600;
const WATER_FADE_END_METERS = 5200;
const WATER_NIGHT_DARKEN_STRENGTH = 0.95;
const WATER_NIGHT_DARKEN_START_METERS = 0;
const WATER_NIGHT_DARKEN_END_METERS = WATER_FADE_END_METERS;
const UNDERWATER_SURFACE_BLEND_START_METERS = -0.18;
const UNDERWATER_SURFACE_BLEND_FULL_METERS = 1.05;
const UNDERWATER_ENTRY_SUBMERSION = 0.18;
const UNDERWATER_EXIT_SUBMERSION = 0.08;
const UNDERWATER_ADAPT_SECONDS = 4.6;
const UNDERWATER_FOG_DENSITY_MULTIPLIER_ENTRY = 7.2;
const UNDERWATER_FOG_DENSITY_MULTIPLIER_ADAPTED = 4.1;
const UNDERWATER_FOG_DARKEN_ENTRY = 0.68;
const UNDERWATER_FOG_DARKEN_ADAPTED = 0.92;
const UNDERWATER_FOG_WATER_COLOR_MIX = 0.82;
const UNDERWATER_FOG_WATER_COLOR_MIX_NIGHT = 0.2;
const UNDERWATER_FOG_NIGHT_SKY_MIX = 0.92;
const UNDERWATER_FOG_NIGHT_DARKEN = 0.06;
const UNDERWATER_FOG_NIGHT_BLACKOUT_START_CYCLE = 18.5 / 24;
const UNDERWATER_FOG_NIGHT_BLACKOUT_FULL_CYCLE = 20 / 24;
const UNDERWATER_FOG_DAWN_RECOVER_START_CYCLE = 5 / 24;
const UNDERWATER_FOG_DAWN_RECOVER_END_CYCLE = 6.5 / 24;
const UNDERWATER_FOG_NIGHT_SURFACE_BLEND_BOOST = 0.9;
const UNDERWATER_FOG_NIGHT_INSTANT_ENTRY_START_METERS = -0.02;
const UNDERWATER_FOG_NIGHT_INSTANT_ENTRY_END_METERS = 0.02;
const UNDERWATER_TERRAIN_NIGHT_ENTRY_BLEND_FLOOR = 0.9;
const UNDERWATER_BLUR_PX_ENTRY = 3.4;
const UNDERWATER_BLUR_PX_ADAPTED = 0.55;
const UNDERWATER_SATURATION_ENTRY = 0.72;
const UNDERWATER_SATURATION_ADAPTED = 0.92;
const UNDERWATER_MIN_FOG_DENSITY = 0.004;
const UNDERWATER_MAX_FOG_DENSITY = 0.26;
const UNDERWATER_SURFACE_LIGHT_CUTOFF_DEPTH_METERS = 100;
const UNDERWATER_DEPTH_FOG_MULTIPLIER_MAX = 2.2;
const UNDERWATER_DEPTH_DARKEN_AT_CUTOFF = 0.18;
const UNDERWATER_DEPTH_DARKEN_AT_ABYSS = 0.08;
const UNDERWATER_SUN_DISC_POWER_AT_CUTOFF = 1600;
const UNDERWATER_SUN_GLOW_STRENGTH_AT_CUTOFF = 0.015;
const UNDERWATER_MOON_SCALE_AT_CUTOFF = 0.5;
const UNDERWATER_FAR_TERRAIN_FADE_START_SUBMERSION = 0.08;
const UNDERWATER_FAR_TERRAIN_FADE_END_SUBMERSION = 0.7;
const UNDERWATER_SUN_RAY_STRENGTH_MAX = 0.95;
const UNDERWATER_MOON_RAY_STRENGTH_MAX = 0.72;
const UNDERWATER_RAY_RAMP_START_DEPTH_METERS = 0.02;
const UNDERWATER_RAY_RAMP_FULL_DEPTH_METERS = 0.2;
const UNDERWATER_TERRAIN_TINT_ADAPT_SECONDS = 1.0;
const UNDERWATER_TERRAIN_TINT_BLEND_NEAR_MAX = 0.9;
const UNDERWATER_TERRAIN_TINT_BLEND_MID_MAX = 0.72;
const waterShaderState = { shader: null };
if (water.material) {
  water.material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterFadeStart = { value: WATER_FADE_START_METERS };
    shader.uniforms.uWaterFadeEnd = { value: WATER_FADE_END_METERS };
    shader.uniforms.uWaterNightAmount = { value: 0 };
    shader.uniforms.uWaterNightStrength = { value: WATER_NIGHT_DARKEN_STRENGTH };
    shader.uniforms.uWaterNightStart = { value: WATER_NIGHT_DARKEN_START_METERS };
    shader.uniforms.uWaterNightEnd = { value: WATER_NIGHT_DARKEN_END_METERS };
    shader.uniforms.uWaterNightTint = { value: NIGHT_TINT_COLOR };
    shader.uniforms.uWaterUnderwaterMix = { value: 0 };
    shader.uniforms.uWaterUndersideTint = { value: new THREE.Color(state.world.water.colorHex) };
    shader.uniforms.uWaterTime = { value: 0 };
    waterShaderState.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vWorldPos;
      `
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float uWaterFadeStart;
      uniform float uWaterFadeEnd;
      uniform float uWaterNightAmount;
      uniform float uWaterNightStrength;
      uniform float uWaterNightStart;
      uniform float uWaterNightEnd;
      uniform vec3 uWaterNightTint;
      uniform float uWaterUnderwaterMix;
      uniform vec3 uWaterUndersideTint;
      uniform float uWaterTime;
      varying vec3 vWorldPos;
      `
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
      vec4 diffuseColor = vec4( diffuse, opacity );
      float waterFade = smoothstep(uWaterFadeStart, uWaterFadeEnd, length(vWorldPos.xz - cameraPosition.xz));
      float waterNightFade = smoothstep(uWaterNightStart, uWaterNightEnd, length(vWorldPos.xz - cameraPosition.xz));
      float waterNightMix = clamp(uWaterNightAmount * uWaterNightStrength * mix(0.35, 1.0, waterNightFade), 0.0, 1.0);
      float nightAmount = clamp(uWaterNightAmount, 0.0, 1.0);
      float undersideNightDarken = mix(1.0, 0.24, nightAmount);
      float undersideNightTint = mix(0.0, 0.72, nightAmount);
      float causticNightScale = mix(1.0, 0.24, nightAmount);
      diffuseColor.rgb = mix(diffuseColor.rgb, uWaterNightTint, waterNightMix);
      float backface = gl_FrontFacing ? 0.0 : 1.0;
      float surfaceAlpha = clamp(1.0 - waterFade, 0.0, 1.0);
      float undersideMix = backface * clamp(0.46 + uWaterUnderwaterMix * 0.44, 0.0, 1.0);
      diffuseColor.a *= mix(surfaceAlpha, 1.0, undersideMix);
      vec3 undersideColor = mix(diffuseColor.rgb * 0.38, uWaterUndersideTint, 0.62);
      undersideColor = mix(undersideColor, uWaterNightTint * 0.58, undersideNightTint);
      undersideColor *= undersideNightDarken;
      vec2 shimmerUv = vWorldPos.xz * 0.22 + vec2(uWaterTime * 0.31, -uWaterTime * 0.23);
      vec2 shimmerUv2 = vWorldPos.xz * 0.38 + vec2(-uWaterTime * 0.42, uWaterTime * 0.28);
      float rippleA = sin(shimmerUv.x * 6.2 + sin(shimmerUv.y * 2.3));
      float rippleB = sin(shimmerUv.y * 5.7 - uWaterTime * 2.1 + sin(shimmerUv.x * 2.6));
      float rippleC = sin((shimmerUv2.x + shimmerUv2.y) * 7.1 + uWaterTime * 1.2);
      float ripple = rippleA * 0.42 + rippleB * 0.36 + rippleC * 0.22;
      float causticSpark = pow(clamp(0.5 + 0.5 * ripple, 0.0, 1.0), 5.0);
      float causticLines = abs(sin((shimmerUv2.x - shimmerUv2.y) * 8.4)) * abs(sin((shimmerUv.x + shimmerUv.y) * 9.1));
      float caustic = clamp(causticSpark * 0.72 + pow(causticLines, 2.8) * 0.85, 0.0, 1.0);
      vec3 causticColor = mix(vec3(0.2, 0.46, 0.58), vec3(0.78, 0.98, 1.0), caustic) * mix(1.0, 0.42, nightAmount);
      diffuseColor.rgb = mix(diffuseColor.rgb, undersideColor, undersideMix);
      diffuseColor.rgb += causticColor * undersideMix * (0.55 + uWaterUnderwaterMix * 1.2) * causticNightScale;
      diffuseColor.rgb = mix(diffuseColor.rgb, uWaterUndersideTint * mix(0.75, 0.42, nightAmount), (1.0 - caustic) * undersideMix * 0.2);
      diffuseColor.a = mix(diffuseColor.a, max(diffuseColor.a, mix(0.9, 0.72, nightAmount)), undersideMix);
      diffuseColor.a = mix(diffuseColor.a, min(1.0, diffuseColor.a + caustic * 0.2 * causticNightScale), undersideMix);
      `
      );
  };
  water.material.needsUpdate = true;
}
water.rotation.x = -Math.PI / 2;
water.position.y = state.world.water.level;
water.receiveShadow = true;
water.renderOrder = 2;
worldGroup.add(water);

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
const FOG_SKY_BLEND_BASE = 0.3;
const FOG_SKY_BLEND_DAY_BOOST = 0.12;
const FOG_NIGHT_MUTE_BASE = 0.3;
const FOG_NIGHT_MUTE_BOOST = 0.4;
const atmosphereTemp = {
  sunVector: new THREE.Vector3(),
  moonVector: new THREE.Vector3(),
  fillVector: new THREE.Vector3(),
  sunPos: new THREE.Vector3(),
  moonPos: new THREE.Vector3(),
  fillPos: new THREE.Vector3(),
  playerEyePos: new THREE.Vector3(),
  skyTop: new THREE.Color(),
  skyHorizon: new THREE.Color(),
  skyGround: new THREE.Color(),
  fogMix: new THREE.Color(),
};
const underwaterState = {
  submersion: 0,
  adaptation: 1,
  isUnderwater: false,
  surfaceFogDensity: state.world.fog.density,
  surfaceFogColor: new THREE.Color(state.world.fog.colorHex),
  surfaceWaterColor: new THREE.Color(state.world.water.colorHex),
  frameSurfaceFogColor: new THREE.Color(),
  underwaterFogColor: new THREE.Color(),
  undersideTint: new THREE.Color(state.world.water.colorHex),
  canvasFilter: "",
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

const CHUNK_SIZE = 64;
const CHUNK_RES = 32;
const CHUNK_GRID_STRIDE = CHUNK_RES + 1;
const CHUNK_CELL_SIZE = CHUNK_SIZE / CHUNK_RES;
const CHUNK_RADIUS = 8;
const NEAR_FADE_RANGE_METERS = 96;
const NEAR_FADE_END_METERS = CHUNK_RADIUS * CHUNK_SIZE;
const NEAR_FADE_START_METERS = Math.max(0, NEAR_FADE_END_METERS - NEAR_FADE_RANGE_METERS);
const NEAR_NIGHT_DARKEN_STRENGTH = 1;
const NEAR_NIGHT_DARKEN_START = 0;
const NEAR_NIGHT_DARKEN_END = NEAR_FADE_END_METERS;
const NEAR_NIGHT_FOG_STRENGTH = 0.4;
const terrainMaterial = new THREE.MeshStandardMaterial({
  color: state.world.terrainColor,
  vertexColors: true,
  roughness: 0.95,
  metalness: 0.05,
  transparent: true,
  opacity: 1,
  depthWrite: true,
  alphaTest: 0.02,
});
const terrainShaderState = configureTerrainMaterial({
  material: terrainMaterial,
  state,
  getDetailRenderDistance: getTerrainDetailRenderDistance,
  fade: {
    start: NEAR_FADE_START_METERS,
    end: NEAR_FADE_END_METERS,
    opacity: 1,
    invert: true,
  },
  night: {
    amount: () => currentNightAmount,
    strength: NEAR_NIGHT_DARKEN_STRENGTH,
    fogStrength: NEAR_NIGHT_FOG_STRENGTH,
    start: NEAR_NIGHT_DARKEN_START,
    end: NEAR_NIGHT_DARKEN_END,
    tint: TERRAIN_NIGHT_TINT,
  },
  THREE,
});

const MID_RADIUS_METERS = 2400;
const MID_TILE_SIZE = 128;
const MID_TILE_RES = 8;
const MID_TILE_RADIUS = Math.ceil(MID_RADIUS_METERS / MID_TILE_SIZE);
const MID_BLEND_IN_START_METERS = NEAR_FADE_START_METERS;
const MID_BLEND_IN_END_METERS = NEAR_FADE_END_METERS;
const MID_BLEND_OUT_START_METERS = 1800;
const MID_BLEND_OUT_END_METERS = 2300;
const MID_FOG_INTENSITY = 0.8;
const MID_TILE_HALF_DIAGONAL = MID_TILE_SIZE * Math.SQRT2 * 0.5;
const MID_TILE_CULL_RADIUS = MID_RADIUS_METERS + MID_TILE_HALF_DIAGONAL;
const MID_TILE_KEEP_RADIUS = MID_TILE_CULL_RADIUS + MID_TILE_SIZE;
const MID_TILE_INNER_CULL_RADIUS = Math.max(0, MID_BLEND_IN_START_METERS - MID_TILE_HALF_DIAGONAL);
const MID_NIGHT_DARKEN_STRENGTH = 0.8;
const MID_NIGHT_DARKEN_START = MID_BLEND_IN_END_METERS;
const MID_NIGHT_DARKEN_END = MID_BLEND_OUT_END_METERS;
const MID_NIGHT_FOG_STRENGTH = 0.9;
const midTerrainMaterial = new THREE.MeshStandardMaterial({
  color: state.world.terrainColor,
  vertexColors: true,
  roughness: 0.96,
  metalness: 0.03,
  transparent: true,
  opacity: 1,
  depthWrite: true,
  alphaTest: 0.02,
});
const midTerrainShaderState = configureTerrainMaterial({
  material: midTerrainMaterial,
  state,
  getDetailRenderDistance: () => 0,
  fade: {
    start: MID_BLEND_OUT_START_METERS,
    end: MID_BLEND_OUT_END_METERS,
    opacity: 1,
    invert: true,
  },
  fadeSecondary: {
    start: MID_BLEND_IN_START_METERS,
    end: MID_BLEND_IN_END_METERS,
    opacity: 1,
    invert: false,
  },
  night: {
    amount: () => currentNightAmount,
    strength: MID_NIGHT_DARKEN_STRENGTH,
    fogStrength: MID_NIGHT_FOG_STRENGTH,
    start: MID_NIGHT_DARKEN_START,
    end: MID_NIGHT_DARKEN_END,
    tint: TERRAIN_NIGHT_TINT,
  },
  fog: {
    intensity: MID_FOG_INTENSITY,
  },
  THREE,
});

const FAR_RADIUS_METERS = 14000;
const FAR_TILE_SIZE = 1024;
const FAR_TILE_RES = 8;
const FAR_TILE_RADIUS = Math.ceil(FAR_RADIUS_METERS / FAR_TILE_SIZE);
const FAR_BLEND_START_METERS = 2000;
const FAR_BLEND_END_METERS = 3000;
const FAR_EDGE_FADE_RANGE_METERS = 1200;
const FAR_EDGE_FADE_END_METERS = FAR_RADIUS_METERS;
const FAR_EDGE_FADE_START_METERS = Math.max(0, FAR_EDGE_FADE_END_METERS - FAR_EDGE_FADE_RANGE_METERS);
const FAR_NIGHT_DARKEN_STRENGTH = 1;
const FAR_NIGHT_FOG_STRENGTH = 1;
const FAR_NIGHT_DARKEN_START = FAR_BLEND_START_METERS;
const FAR_NIGHT_DARKEN_END = FAR_RADIUS_METERS;
const FAR_FOG_INTENSITY = 0.8;
const FAR_TILE_HALF_DIAGONAL = FAR_TILE_SIZE * Math.SQRT2 * 0.5;
const FAR_TILE_CULL_RADIUS = FAR_RADIUS_METERS + FAR_TILE_HALF_DIAGONAL;
const FAR_TILE_KEEP_RADIUS = FAR_TILE_CULL_RADIUS + FAR_TILE_SIZE;
const FAR_TILE_INNER_CULL_RADIUS = Math.max(0, FAR_BLEND_START_METERS - FAR_TILE_HALF_DIAGONAL);
const CAMERA_FAR_EXTRA_METERS = 400;
const CAMERA_FAR_METERS = Math.max(CAMERA_FAR_BASE_METERS, FAR_EDGE_FADE_END_METERS + CAMERA_FAR_EXTRA_METERS);
camera.far = CAMERA_FAR_METERS;
camera.updateProjectionMatrix();
const MINIMAP_ZOOM_PRESETS_METERS = [
  100, 150, 250, 350, 550, 850, 1300, 1950, 2950, 4450, 6650, 10000, 15000, 22500, 25000,
];
const DEFAULT_MINIMAP_SPAN_METERS = 10000;
const MINIMAP_MIN_UPDATE_INTERVAL_MS = 180;
const MINIMAP_STALE_UPDATE_MS = 1000;
const MINIMAP_MOVE_THRESHOLD_SQ = 9;
const MINIMAP_YAW_THRESHOLD = 0.05;
const MINIMAP_FALLBACK_COLOR = { r: 0.06, g: 0.08, b: 0.1 };
const MINIMAP_WATER_SHALLOW_TINT = new THREE.Color("#3f86a5");
const MINIMAP_WATER_MID_TINT = new THREE.Color("#215275");
const MINIMAP_WATER_DEEP_TINT = new THREE.Color("#0b2433");
const MINIMAP_WATER_ABYSS_TINT = new THREE.Color("#05131e");
const MINIMAP_WATER_DEPTH_MID = 36;
const MINIMAP_WATER_DEPTH_ABYSS_START = 88;
const MINIMAP_WATER_DEPTH_MAX = 130;
const MINIMAP_SLOPE_MIN_RADIANS = Math.PI * (5 / 180);
const MINIMAP_SLOPE_MAX_RADIANS = Math.PI * 0.25;
const MINIMAP_SLOPE_BLEND_MAX = 0.9;
const MINIMAP_SLOPE_LIGHT_BLEND_MAX = 0.4;
const MINIMAP_SLOPE_DIR_X = -Math.SQRT1_2;
const MINIMAP_SLOPE_DIR_Z = -Math.SQRT1_2;

function findClosestMinimapZoomIndex(targetMeters) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < MINIMAP_ZOOM_PRESETS_METERS.length; i += 1) {
    const distance = Math.abs(MINIMAP_ZOOM_PRESETS_METERS[i] - targetMeters);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

let minimapZoomIndex = (() => {
  const exact = MINIMAP_ZOOM_PRESETS_METERS.indexOf(DEFAULT_MINIMAP_SPAN_METERS);
  return exact >= 0 ? exact : findClosestMinimapZoomIndex(DEFAULT_MINIMAP_SPAN_METERS);
})();
let minimapWorldRadius = MINIMAP_ZOOM_PRESETS_METERS[minimapZoomIndex] * 0.5;

function updateMinimapZoomControls() {
  if (minimapZoomInBtn) {
    minimapZoomInBtn.disabled = minimapZoomIndex <= 0;
  }
  if (minimapZoomOutBtn) {
    minimapZoomOutBtn.disabled = minimapZoomIndex >= MINIMAP_ZOOM_PRESETS_METERS.length - 1;
  }
}

function setMinimapZoomIndex(nextIndex, { force = false } = {}) {
  const clamped = clampNumber(
    Math.round(nextIndex),
    0,
    MINIMAP_ZOOM_PRESETS_METERS.length - 1,
    minimapZoomIndex
  );
  if (!force && clamped === minimapZoomIndex) return;
  minimapZoomIndex = clamped;
  minimapWorldRadius = MINIMAP_ZOOM_PRESETS_METERS[minimapZoomIndex] * 0.5;
  minimapNeedsRender = true;
  updateMinimapZoomControls();
}

updateMinimapZoomControls();
const farTerrainMaterial = new THREE.MeshStandardMaterial({
  color: state.world.terrainColor,
  vertexColors: true,
  roughness: 0.97,
  metalness: 0.03,
  transparent: true,
  opacity: 1,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});
const farTerrainShaderState = configureTerrainMaterial({
  material: farTerrainMaterial,
  state,
  getDetailRenderDistance: () => 0,
  fade: {
    start: FAR_BLEND_START_METERS,
    end: FAR_BLEND_END_METERS,
    opacity: 1,
  },
  fadeSecondary: {
    start: FAR_EDGE_FADE_START_METERS,
    end: FAR_EDGE_FADE_END_METERS,
    opacity: 1,
    invert: true,
  },
  night: {
    amount: () => currentNightAmount,
    strength: FAR_NIGHT_DARKEN_STRENGTH,
    fogStrength: FAR_NIGHT_FOG_STRENGTH,
    start: FAR_NIGHT_DARKEN_START,
    end: FAR_NIGHT_DARKEN_END,
    tint: TERRAIN_NIGHT_TINT,
  },
  fog: {
    intensity: FAR_FOG_INTENSITY,
  },
  THREE,
});
const chunks = new Map();
const treeChunks = new Map();
const midTiles = new Map();
const farTiles = new Map();
const treeFadeMaterials = new Set();
let activeFarBuildJobId = 0;
let runtimeFarBuildJobId = 0;
let runtimeFarBuildRunning = false;
let runtimeFarBuildQueuedTarget = null;
let runtimeFarBuildAppliedTarget = null;
let activeMidBuildJobId = 0;
let runtimeMidBuildJobId = 0;
let runtimeMidBuildRunning = false;
let runtimeMidBuildQueuedTarget = null;
let runtimeMidBuildAppliedTarget = null;
const landmarkGroup = new THREE.Group();
worldGroup.add(landmarkGroup);
const treeTrunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 5.2, 8);
const treeCanopyConeGeometry = new THREE.ConeGeometry(1.05, 5.2, 10);
const treeCanopySphereGeometry = new THREE.SphereGeometry(1.45, 10, 8);
const TREE_RENDER_ORDER = 1.5;
const treeTrunkMaterial = new THREE.MeshStandardMaterial({
  color: state.world.trees.trunkColor,
  roughness: 0.94,
  metalness: 0.02,
});
const treeCanopyMaterials = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.01 }));
applyNearFadeToTreeMaterial(treeTrunkMaterial);
treeCanopyMaterials.forEach(applyNearFadeToTreeMaterial);
const biomeTreeMaterialSets = new Map();
const biomeTerrainColorCache = new Map();
const biomeTerrainProfileCache = new Map();
const TERRAIN_HORIZONTAL_SCALE = 3;

function applyNearFadeToTreeMaterial(material) {
  if (!material || material.userData?.hasTreeFade) return;
  material.transparent = true;
  material.opacity = 1;
  material.depthWrite = true;
  material.alphaTest = 0.02;
  material.userData.hasTreeFade = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeStart = { value: NEAR_FADE_START_METERS };
    shader.uniforms.uFadeEnd = { value: NEAR_FADE_END_METERS };
    shader.uniforms.uFadeOpacity = { value: 1 };
    shader.uniforms.uFadeInvert = { value: 1 };
    material.userData.fadeShader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vWorldPos;
      `
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float uFadeStart;
      uniform float uFadeEnd;
      uniform float uFadeOpacity;
      uniform float uFadeInvert;
      varying vec3 vWorldPos;
      `
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
      vec4 diffuseColor = vec4( diffuse, opacity );
      float terrainFade = smoothstep(uFadeStart, uFadeEnd, length(vWorldPos.xz - cameraPosition.xz));
      terrainFade = mix(terrainFade, 1.0 - terrainFade, clamp(uFadeInvert, 0.0, 1.0));
      diffuseColor.a *= clamp(terrainFade * uFadeOpacity, 0.0, 1.0);
      `
      );
  };
  material.needsUpdate = true;
  treeFadeMaterials.add(material);
}

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
  if (Number.isFinite(biome?.detailTextureId)) return biome.detailTextureId;
  const rawBiomeId = typeof biome?.id === "string" ? biome.id : biome?.baseBiomeId;
  const biomeId = String(rawBiomeId || "")
    .replace(new RegExp(`^${BIOME_SUBDIVISION_PREFIX_JAGGED}`), "")
    .replace(new RegExp(`^${BIOME_SUBDIVISION_PREFIX_SMOOTH}`), "");
  const def = BIOME_DEFS[biomeId];
  if (Number.isFinite(def?.detailTextureId)) return def.detailTextureId;
  switch (biomeId) {
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

function getBiomeSettingsOverride(biomeOrId) {
  const biomeId = typeof biomeOrId === "string" ? biomeOrId : biomeOrId?.id;
  if (!biomeId) return null;
  const settings = state.world?.biomeSettings;
  if (!settings || typeof settings !== "object") return null;
  const entry = settings[biomeId];
  return entry && typeof entry === "object" ? entry : null;
}

function ensureBiomeSettingsState() {
  if (!state.world.biomeSettings || typeof state.world.biomeSettings !== "object") {
    state.world.biomeSettings = {};
  }
  return state.world.biomeSettings;
}

function getBiomeTerrainProfile(biome) {
  if (!biome) return null;
  const baseProfile = biome.terrainProfile || null;
  const override = getBiomeSettingsOverride(biome)?.terrainProfile;
  if (!override || typeof override !== "object") return baseProfile;
  const cached = biomeTerrainProfileCache.get(biome.id);
  if (cached && cached._overrideRef === override) return cached;
  const merged = { ...(baseProfile || {}), ...override, _overrideRef: override };
  biomeTerrainProfileCache.set(biome.id, merged);
  return merged;
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

function getBiomeFogColor(biome) {
  const override = getBiomeStyleOverride(biome)?.fogColorHex;
  return override ? tempFogLookupColor.set(override) : biome?.fogColor || tempFogLookupColor.set(state.world.fog.colorHex);
}

function getBiomeWaterColor(biome) {
  const override = getBiomeStyleOverride(biome)?.waterColorHex;
  return override ? tempWaterLookupColor.set(override) : biome?.waterColor || tempWaterLookupColor.set(state.world.water.colorHex);
}

function getBiomeFogDensityMultiplier(biome) {
  const value = getBiomeSettingsOverride(biome)?.fogDensityMultiplier ?? biome?.fogDensityMultiplier;
  return Number.isFinite(value) ? value : 1;
}

function fillBlendedTerrainColorAt(x, z, targetColor = tempTerrainBlendColor) {
  const blend = fillBiomeBlendSample(x, z, terrainColorBlendScratch);
  return fillTerrainColorFromBiomeBlend(blend, targetColor);
}

function fillTerrainColorFromBiomeBlend(blend, targetColor = tempTerrainBlendColor) {
  if (!blend.count) {
    return targetColor.set(state.world.terrainColor);
  }
  targetColor.setRGB(0, 0, 0);
  for (let i = 0; i < blend.count; i += 1) {
    const biome = blend.biomes[i];
    const weight = blend.weights[i];
    if (!biome || !(weight > 0)) continue;
    const color = getBiomeTerrainColor(biome);
    targetColor.r += color.r * weight;
    targetColor.g += color.g * weight;
    targetColor.b += color.b * weight;
  }
  return targetColor;
}

function getBiomeBlendDominantWeight(blend) {
  if (!blend || !blend.count) return 1;
  let best = 0;
  for (let i = 0; i < blend.count; i += 1) {
    const weight = blend.weights[i] || 0;
    if (weight > best) best = weight;
  }
  return best;
}

function getTerrainDetailBiomeFadeFromBlend(blend) {
  const dominantWeight = getBiomeBlendDominantWeight(blend);
  if (!(dominantWeight > 0)) return 0;
  // Approximate signed distance from the biome edge using the smoothstep slope near the boundary.
  const distanceFromEdgeMeters = (dominantWeight - 0.5) * DETAIL_BIOME_EDGE_DISTANCE_FACTOR;
  // Fade from 0 at the edge to full strength a couple meters inside the biome.
  return smoothstep(0, DETAIL_BIOME_FADE_OUT_METERS, distanceFromEdgeMeters);
}

function fillBlendedVisualSampleAt(x, z, target = blendedVisualStateScratch) {
  const blend = fillBiomeBlendSample(x, z, visualBlendScratch);
  const fogColor = target.fogColor || tempFogBlendColor;
  const waterColor = target.waterColor || tempWaterBlendColor;
  fogColor.setRGB(0, 0, 0);
  waterColor.setRGB(0, 0, 0);
  let fogDensity = 0;
  if (!blend.count) {
    fogColor.set(state.world.fog.colorHex);
    waterColor.set(state.world.water.colorHex);
    fogDensity = state.world.fog.density;
  } else {
    for (let i = 0; i < blend.count; i += 1) {
      const biome = blend.biomes[i];
      const weight = blend.weights[i];
      if (!biome || !(weight > 0)) continue;
      const biomeFog = getBiomeFogColor(biome);
      const biomeWater = getBiomeWaterColor(biome);
      fogColor.r += biomeFog.r * weight;
      fogColor.g += biomeFog.g * weight;
      fogColor.b += biomeFog.b * weight;
      waterColor.r += biomeWater.r * weight;
      waterColor.g += biomeWater.g * weight;
      waterColor.b += biomeWater.b * weight;
      fogDensity += state.world.fog.density * getBiomeFogDensityMultiplier(biome) * weight;
    }
  }
  target.fogColor = fogColor;
  target.waterColor = waterColor;
  target.fogDensity = clampNumber(fogDensity, 0.001, 0.08, state.world.fog.density);
  target.biome = blend.dominantBiome || null;
  return target;
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
    applyNearFadeToTreeMaterial(set.trunk);
    set.canopies.forEach(applyNearFadeToTreeMaterial);
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
  skyUniforms.waterLevel.value = state.world.water.level - originOffset.y;
  if (terrainShaderState.shader) {
    terrainShaderState.shader.uniforms.uWaterLevel.value = state.world.water.level;
    terrainShaderState.shader.uniforms.uTint.value.set(state.world.terrainColor);
    terrainShaderState.shader.uniforms.uDetailRenderDistance.value = getTerrainDetailRenderDistance();
    if (terrainShaderState.shader.uniforms.uDetailIntensity) {
      terrainShaderState.shader.uniforms.uDetailIntensity.value = getTerrainDetailIntensity();
    }
    if (terrainShaderState.shader.uniforms.uFadeStart) {
      terrainShaderState.shader.uniforms.uFadeStart.value = NEAR_FADE_START_METERS;
    }
    if (terrainShaderState.shader.uniforms.uFadeEnd) {
      terrainShaderState.shader.uniforms.uFadeEnd.value = NEAR_FADE_END_METERS;
    }
    if (terrainShaderState.shader.uniforms.uFadeOpacity) {
      terrainShaderState.shader.uniforms.uFadeOpacity.value = 1;
    }
    if (terrainShaderState.shader.uniforms.uFadeInvert) {
      terrainShaderState.shader.uniforms.uFadeInvert.value = 1;
    }
    if (terrainShaderState.shader.uniforms.uNightAmount) {
      terrainShaderState.shader.uniforms.uNightAmount.value = currentNightAmount;
    }
    if (terrainShaderState.shader.uniforms.uNightStrength) {
      terrainShaderState.shader.uniforms.uNightStrength.value = NEAR_NIGHT_DARKEN_STRENGTH;
    }
    if (terrainShaderState.shader.uniforms.uNightFogStrength) {
      terrainShaderState.shader.uniforms.uNightFogStrength.value = NEAR_NIGHT_FOG_STRENGTH;
    }
    if (terrainShaderState.shader.uniforms.uNightStart) {
      terrainShaderState.shader.uniforms.uNightStart.value = NEAR_NIGHT_DARKEN_START;
    }
    if (terrainShaderState.shader.uniforms.uNightEnd) {
      terrainShaderState.shader.uniforms.uNightEnd.value = NEAR_NIGHT_DARKEN_END;
    }
    if (terrainShaderState.shader.uniforms.uNightTint) {
      terrainShaderState.shader.uniforms.uNightTint.value.copy(TERRAIN_NIGHT_TINT);
    }
    if (terrainShaderState.shader.uniforms.uUnderwaterTint) {
      terrainShaderState.shader.uniforms.uUnderwaterTint.value.copy(underwaterState.surfaceWaterColor);
    }
    if (terrainShaderState.shader.uniforms.uUnderwaterBlend) {
      terrainShaderState.shader.uniforms.uUnderwaterBlend.value = 0;
    }
  }
  if (waterShaderState.shader) {
    if (waterShaderState.shader.uniforms.uWaterFadeStart) {
      waterShaderState.shader.uniforms.uWaterFadeStart.value = WATER_FADE_START_METERS;
    }
    if (waterShaderState.shader.uniforms.uWaterFadeEnd) {
      waterShaderState.shader.uniforms.uWaterFadeEnd.value = WATER_FADE_END_METERS;
    }
    if (waterShaderState.shader.uniforms.uWaterNightAmount) {
      waterShaderState.shader.uniforms.uWaterNightAmount.value = currentNightAmount;
    }
    if (waterShaderState.shader.uniforms.uWaterNightStrength) {
      waterShaderState.shader.uniforms.uWaterNightStrength.value = WATER_NIGHT_DARKEN_STRENGTH;
    }
    if (waterShaderState.shader.uniforms.uWaterNightStart) {
      waterShaderState.shader.uniforms.uWaterNightStart.value = WATER_NIGHT_DARKEN_START_METERS;
    }
    if (waterShaderState.shader.uniforms.uWaterNightEnd) {
      waterShaderState.shader.uniforms.uWaterNightEnd.value = WATER_NIGHT_DARKEN_END_METERS;
    }
    if (waterShaderState.shader.uniforms.uWaterNightTint) {
      waterShaderState.shader.uniforms.uWaterNightTint.value.copy(scene.fog.color);
    }
    if (waterShaderState.shader.uniforms.uWaterUnderwaterMix) {
      waterShaderState.shader.uniforms.uWaterUnderwaterMix.value = underwaterState.submersion;
    }
    if (waterShaderState.shader.uniforms.uWaterUndersideTint) {
      waterShaderState.shader.uniforms.uWaterUndersideTint.value.copy(underwaterState.undersideTint);
    }
    if (waterShaderState.shader.uniforms.uWaterTime) {
      waterShaderState.shader.uniforms.uWaterTime.value = 0;
    }
  }
  if (midTerrainShaderState.shader) {
    midTerrainShaderState.shader.uniforms.uWaterLevel.value = state.world.water.level;
    midTerrainShaderState.shader.uniforms.uTint.value.set(state.world.terrainColor);
    if (midTerrainShaderState.shader.uniforms.uDetailRenderDistance) {
      midTerrainShaderState.shader.uniforms.uDetailRenderDistance.value = 0;
    }
    if (midTerrainShaderState.shader.uniforms.uDetailIntensity) {
      midTerrainShaderState.shader.uniforms.uDetailIntensity.value = 0;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeStart) {
      midTerrainShaderState.shader.uniforms.uFadeStart.value = MID_BLEND_OUT_START_METERS;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeEnd) {
      midTerrainShaderState.shader.uniforms.uFadeEnd.value = MID_BLEND_OUT_END_METERS;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeOpacity) {
      midTerrainShaderState.shader.uniforms.uFadeOpacity.value = 1;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeInvert) {
      midTerrainShaderState.shader.uniforms.uFadeInvert.value = 1;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeStart2) {
      midTerrainShaderState.shader.uniforms.uFadeStart2.value = MID_BLEND_IN_START_METERS;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeEnd2) {
      midTerrainShaderState.shader.uniforms.uFadeEnd2.value = MID_BLEND_IN_END_METERS;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeOpacity2) {
      midTerrainShaderState.shader.uniforms.uFadeOpacity2.value = 1;
    }
    if (midTerrainShaderState.shader.uniforms.uFadeInvert2) {
      midTerrainShaderState.shader.uniforms.uFadeInvert2.value = 0;
    }
    if (midTerrainShaderState.shader.uniforms.uNightStrength) {
      midTerrainShaderState.shader.uniforms.uNightStrength.value = MID_NIGHT_DARKEN_STRENGTH;
    }
    if (midTerrainShaderState.shader.uniforms.uNightAmount) {
      midTerrainShaderState.shader.uniforms.uNightAmount.value = currentNightAmount;
    }
    if (midTerrainShaderState.shader.uniforms.uNightFogStrength) {
      midTerrainShaderState.shader.uniforms.uNightFogStrength.value = MID_NIGHT_FOG_STRENGTH;
    }
    if (midTerrainShaderState.shader.uniforms.uNightStart) {
      midTerrainShaderState.shader.uniforms.uNightStart.value = MID_NIGHT_DARKEN_START;
    }
    if (midTerrainShaderState.shader.uniforms.uNightEnd) {
      midTerrainShaderState.shader.uniforms.uNightEnd.value = MID_NIGHT_DARKEN_END;
    }
    if (midTerrainShaderState.shader.uniforms.uNightTint) {
      midTerrainShaderState.shader.uniforms.uNightTint.value.copy(TERRAIN_NIGHT_TINT);
    }
    if (midTerrainShaderState.shader.uniforms.uFogIntensity) {
      midTerrainShaderState.shader.uniforms.uFogIntensity.value = MID_FOG_INTENSITY;
    }
    if (midTerrainShaderState.shader.uniforms.uUnderwaterTint) {
      midTerrainShaderState.shader.uniforms.uUnderwaterTint.value.copy(underwaterState.surfaceWaterColor);
    }
    if (midTerrainShaderState.shader.uniforms.uUnderwaterBlend) {
      midTerrainShaderState.shader.uniforms.uUnderwaterBlend.value = 0;
    }
  }
  if (farTerrainShaderState.shader) {
    farTerrainShaderState.shader.uniforms.uWaterLevel.value = state.world.water.level;
    farTerrainShaderState.shader.uniforms.uTint.value.set(state.world.terrainColor);
    if (farTerrainShaderState.shader.uniforms.uDetailRenderDistance) {
      farTerrainShaderState.shader.uniforms.uDetailRenderDistance.value = 0;
    }
    if (farTerrainShaderState.shader.uniforms.uDetailIntensity) {
      farTerrainShaderState.shader.uniforms.uDetailIntensity.value = 0;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeStart) {
      farTerrainShaderState.shader.uniforms.uFadeStart.value = FAR_BLEND_START_METERS;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeEnd) {
      farTerrainShaderState.shader.uniforms.uFadeEnd.value = FAR_BLEND_END_METERS;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeOpacity) {
      farTerrainShaderState.shader.uniforms.uFadeOpacity.value = 1;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeStart2) {
      farTerrainShaderState.shader.uniforms.uFadeStart2.value = FAR_EDGE_FADE_START_METERS;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeEnd2) {
      farTerrainShaderState.shader.uniforms.uFadeEnd2.value = FAR_EDGE_FADE_END_METERS;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeOpacity2) {
      farTerrainShaderState.shader.uniforms.uFadeOpacity2.value = 1;
    }
    if (farTerrainShaderState.shader.uniforms.uFadeInvert2) {
      farTerrainShaderState.shader.uniforms.uFadeInvert2.value = 1;
    }
    if (farTerrainShaderState.shader.uniforms.uNightAmount) {
      farTerrainShaderState.shader.uniforms.uNightAmount.value = currentNightAmount;
    }
    if (farTerrainShaderState.shader.uniforms.uNightFogStrength) {
      farTerrainShaderState.shader.uniforms.uNightFogStrength.value = FAR_NIGHT_FOG_STRENGTH;
    }
    if (farTerrainShaderState.shader.uniforms.uNightStrength) {
      farTerrainShaderState.shader.uniforms.uNightStrength.value = FAR_NIGHT_DARKEN_STRENGTH;
    }
    if (farTerrainShaderState.shader.uniforms.uNightStart) {
      farTerrainShaderState.shader.uniforms.uNightStart.value = FAR_NIGHT_DARKEN_START;
    }
    if (farTerrainShaderState.shader.uniforms.uNightEnd) {
      farTerrainShaderState.shader.uniforms.uNightEnd.value = FAR_NIGHT_DARKEN_END;
    }
    if (farTerrainShaderState.shader.uniforms.uNightTint) {
      farTerrainShaderState.shader.uniforms.uNightTint.value.copy(TERRAIN_NIGHT_TINT);
    }
    if (farTerrainShaderState.shader.uniforms.uFogIntensity) {
      farTerrainShaderState.shader.uniforms.uFogIntensity.value = FAR_FOG_INTENSITY;
    }
    if (farTerrainShaderState.shader.uniforms.uUnderwaterTint) {
      farTerrainShaderState.shader.uniforms.uUnderwaterTint.value.copy(underwaterState.surfaceWaterColor);
    }
    if (farTerrainShaderState.shader.uniforms.uUnderwaterBlend) {
      farTerrainShaderState.shader.uniforms.uUnderwaterBlend.value = 0;
    }
  }
  if (treeFadeMaterials.size > 0) {
    for (const material of treeFadeMaterials) {
      const shader = material.userData?.fadeShader;
      if (!shader) continue;
      if (shader.uniforms.uFadeStart) {
        shader.uniforms.uFadeStart.value = NEAR_FADE_START_METERS;
      }
      if (shader.uniforms.uFadeEnd) {
        shader.uniforms.uFadeEnd.value = NEAR_FADE_END_METERS;
      }
      if (shader.uniforms.uFadeOpacity) {
        shader.uniforms.uFadeOpacity.value = 1;
      }
      if (shader.uniforms.uFadeInvert) {
        shader.uniforms.uFadeInvert.value = 1;
      }
    }
  }
}

function syncAtmosphereFromState() {
  const visual = fillBlendedVisualSampleAt(player.position.x, player.position.z);
  applyVisualSampleToAtmosphereAndWater(visual, { updateWater: false });
  updateDayNightCycle(0);
}

function syncWaterColorFromState() {
  const visual = fillBlendedVisualSampleAt(player.position.x, player.position.z);
  applyVisualSampleToAtmosphereAndWater(visual, { updateAtmosphere: false });
}

function applyVisualSampleToAtmosphereAndWater(visual, options = {}) {
  if (!visual) return;
  underwaterState.surfaceFogDensity = visual.fogDensity;
  underwaterState.surfaceFogColor.copy(visual.fogColor);
  underwaterState.surfaceWaterColor.copy(visual.waterColor);
  if (options.updateAtmosphere !== false) {
    atmosphereBase.fogColor.copy(visual.fogColor);
    scene.fog.color.set(atmosphereBase.fogColor);
    scene.fog.density = visual.fogDensity;
    renderer.setClearColor(atmosphereBase.fogColor, 1);
  }
  if (options.updateWater !== false) {
    water.material.color.copy(visual.waterColor);
  }
}

function smoothstep(edge0, edge1, x) {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1, 0);
  return t * t * (3 - 2 * t);
}

function lerpScalar(a, b, t) {
  return a + (b - a) * clampNumber(t, 0, 1, 0);
}

function updateDayNightCycle(dt) {
  worldTime = (worldTime + dt) % DAY_NIGHT.dayLengthSeconds;
  const cycle = worldTime / DAY_NIGHT.dayLengthSeconds;
  state.timeOfDay = cycle;
  const sunAngle = cycle * Math.PI * 2 - Math.PI / 2;
  const moonAngle = sunAngle + Math.PI;
  const playerEyeY = player.position.y + PLAYER_HEIGHT;
  const playerEyePos = atmosphereTemp.playerEyePos.set(player.position.x, playerEyeY, player.position.z);

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

  const sunPos = atmosphereTemp.sunPos.copy(sunVector).multiplyScalar(DAY_NIGHT.sunDistance).add(playerEyePos);
  const moonPos = atmosphereTemp.moonPos.copy(moonVector).multiplyScalar(DAY_NIGHT.moonDistance).add(playerEyePos);
  const fillVector = atmosphereTemp.fillVector
    .set(-sunVector.x * 0.85, Math.max(0.2, 0.28 + nightAmount * 0.52), -sunVector.z * 0.85)
    .normalize();
  const fillPos = atmosphereTemp.fillPos.copy(fillVector).multiplyScalar(DAY_NIGHT.sunDistance * 0.78).add(playerEyePos);
  sunLight.position.copy(sunPos);
  moonLight.position.copy(moonPos);
  shadowFillLight.position.copy(fillPos);
  moon.position.copy(moonPos);
  // Hide the moon mesh once it drops below the horizon instead of clamping it above the ground.
  moon.visible = moonVector.y > 0;
  skyUniforms.sunDirection.value.copy(sunVector);
  skyUniforms.moonDirection.value.copy(moonVector);
  skyUniforms.skyTime.value = worldTime;

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
  const fogSkyBlend = clampNumber(FOG_SKY_BLEND_BASE + dayAmount * FOG_SKY_BLEND_DAY_BOOST, 0, 0.9, 0.4);
  const fogMix = atmosphereTemp.fogMix.copy(atmosphereBase.fogColor).lerp(skyHorizon, fogSkyBlend);
  skyTop.lerp(dynamicLightColors.mutedNight, nightMute * 0.26);
  skyHorizon.lerp(dynamicLightColors.mutedNight, nightMute * 0.2);
  skyGround.lerp(dynamicLightColors.mutedNight, nightMute * 0.34);
  const fogNightMute = clampNumber(FOG_NIGHT_MUTE_BASE + nightMute * FOG_NIGHT_MUTE_BOOST, 0, 0.85, 0.4);
  fogMix.lerp(dynamicLightColors.mutedNight, fogNightMute);

  skyUniforms.topColor.value.copy(skyTop);
  skyUniforms.horizonColor.value.copy(skyHorizon);
  skyUniforms.groundColor.value.copy(skyGround);
  skyUniforms.sunColor.value
    .copy(dynamicLightColors.warmSun)
    .lerp(dynamicLightColors.daySun, dayAmount)
    .lerp(dynamicLightColors.softSunset, twilight * 0.8);
  skyUniforms.moonColor.value
    .copy(atmosphericColors.moonTint)
    .lerp(dynamicLightColors.moonWarm, twilight * 0.22);
  skyUniforms.sunDiscPower.value = 256;
  skyUniforms.sunGlowPower.value = 10;
  skyUniforms.sunGlowStrength.value = 0.34;
  skyUniforms.moonDiscPower.value = 280;
  skyUniforms.moonStrength.value = clampNumber(0.12 + nightAmount * 0.9, 0.1, 1, 0.5);
  skyUniforms.sunRayStrength.value = 0;
  skyUniforms.moonRayStrength.value = 0;
  skyUniforms.underwaterSkyMix.value = 0;
  skyUniforms.underwaterFogTint.value.copy(fogMix);
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
  playerGlowLight.intensity = 0.06 + twilight * 0.08 + nightGlow * 1.15;
  playerGroundFill.color.copy(dynamicLightColors.nightShadowFill).lerp(dynamicLightColors.dayShadowFill, dayAmount * 0.45);
  playerGroundFill.intensity = 0.08 + twilight * 0.11 + nightGlow * 1.05;

  moon.material.opacity = clampNumber(0.08 + nightAmount * 0.9, 0.08, 0.95, 0.4);
  moon.material.color
    .copy(atmosphericColors.moonTint)
    .lerp(dynamicLightColors.moonWarm, twilight * 0.2);
  currentNightAmount = nightAmount;
  if (midTerrainShaderState.shader?.uniforms.uNightAmount) {
    midTerrainShaderState.shader.uniforms.uNightAmount.value = nightAmount;
  }
  if (farTerrainShaderState.shader?.uniforms.uNightAmount) {
    farTerrainShaderState.shader.uniforms.uNightAmount.value = nightAmount;
  }
  if (terrainShaderState.shader?.uniforms.uNightAmount) {
    terrainShaderState.shader.uniforms.uNightAmount.value = nightAmount;
  }
  if (waterShaderState.shader?.uniforms.uWaterNightAmount) {
    waterShaderState.shader.uniforms.uWaterNightAmount.value = nightAmount;
  }
  if (waterShaderState.shader?.uniforms.uWaterNightTint) {
    waterShaderState.shader.uniforms.uWaterNightTint.value.copy(fogMix);
  }
}

function updateUnderwaterVisualEffects(dt) {
  skyUniforms.waterLevel.value = state.world.water.level - originOffset.y;
  skyUniforms.cameraWorldPos.value.set(
    player.position.x - originOffset.x,
    player.position.y - originOffset.y + PLAYER_HEIGHT,
    player.position.z - originOffset.z
  );
  const eyeY = getEyeY(player, PLAYER_HEIGHT);
  const eyeDepthBelowWater = state.world.water.level - eyeY;
  const submersion = smoothstep(
    UNDERWATER_SURFACE_BLEND_START_METERS,
    UNDERWATER_SURFACE_BLEND_FULL_METERS,
    eyeDepthBelowWater
  );
  const depthToLightCutoff = smoothstep(0, UNDERWATER_SURFACE_LIGHT_CUTOFF_DEPTH_METERS, eyeDepthBelowWater);
  const abyssDepth = smoothstep(
    UNDERWATER_SURFACE_LIGHT_CUTOFF_DEPTH_METERS,
    UNDERWATER_SURFACE_LIGHT_CUTOFF_DEPTH_METERS * 2,
    eyeDepthBelowWater
  );
  underwaterState.submersion = submersion;

  if (underwaterState.isUnderwater) {
    if (submersion <= UNDERWATER_EXIT_SUBMERSION) {
      underwaterState.isUnderwater = false;
    }
  } else if (submersion >= UNDERWATER_ENTRY_SUBMERSION) {
    underwaterState.isUnderwater = true;
    underwaterState.adaptation = 0;
  }

  if (underwaterState.isUnderwater) {
    underwaterState.adaptation = clampNumber(
      underwaterState.adaptation + dt / UNDERWATER_ADAPT_SECONDS,
      0,
      1,
      underwaterState.adaptation
    );
  } else if (submersion <= 0.001) {
    underwaterState.adaptation = 1;
  }

  const surfaceFogDensity = clampNumber(
    underwaterState.surfaceFogDensity,
    0.001,
    UNDERWATER_MAX_FOG_DENSITY,
    state.world.fog.density
  );
  const underwaterDensityMultiplier = lerpScalar(
    UNDERWATER_FOG_DENSITY_MULTIPLIER_ENTRY,
    UNDERWATER_FOG_DENSITY_MULTIPLIER_ADAPTED,
    underwaterState.adaptation
  );
  const underwaterFogDensity = clampNumber(
    surfaceFogDensity *
      underwaterDensityMultiplier *
      lerpScalar(1, UNDERWATER_DEPTH_FOG_MULTIPLIER_MAX, depthToLightCutoff),
    UNDERWATER_MIN_FOG_DENSITY,
    UNDERWATER_MAX_FOG_DENSITY,
    surfaceFogDensity
  );
  scene.fog.density = lerpScalar(surfaceFogDensity, underwaterFogDensity, submersion);

  const frameFogColor = underwaterState.frameSurfaceFogColor.copy(scene.fog.color).lerp(underwaterState.surfaceFogColor, 0.35);
  const nightFogAmount = smoothstep(0.18, 1.0, currentNightAmount);
  const timeCycle = normalizeTimeCycle(state.timeOfDay);
  const eveningBlackout = timeCycle == null ? 0 : smoothstep(
    UNDERWATER_FOG_NIGHT_BLACKOUT_START_CYCLE,
    UNDERWATER_FOG_NIGHT_BLACKOUT_FULL_CYCLE,
    timeCycle
  );
  const dawnRecovery = timeCycle == null ? 1 : smoothstep(
    UNDERWATER_FOG_DAWN_RECOVER_START_CYCLE,
    UNDERWATER_FOG_DAWN_RECOVER_END_CYCLE,
    timeCycle
  );
  const overnightBlackout = 1 - dawnRecovery;
  const clockNightFogAmount = Math.max(eveningBlackout, overnightBlackout);
  const underwaterNightFogAmount = Math.max(nightFogAmount, clockNightFogAmount);
  const fogDarken = lerpScalar(UNDERWATER_FOG_DARKEN_ENTRY, UNDERWATER_FOG_DARKEN_ADAPTED, underwaterState.adaptation);
  const depthDarkenTarget = lerpScalar(
    UNDERWATER_DEPTH_DARKEN_AT_CUTOFF,
    UNDERWATER_DEPTH_DARKEN_AT_ABYSS,
    abyssDepth
  );
  const depthDarken = lerpScalar(1, depthDarkenTarget, depthToLightCutoff);
  const underwaterWaterColorMix = lerpScalar(
    UNDERWATER_FOG_WATER_COLOR_MIX,
    UNDERWATER_FOG_WATER_COLOR_MIX_NIGHT,
    underwaterNightFogAmount
  );
  const nightFogSkyMix = lerpScalar(0, UNDERWATER_FOG_NIGHT_SKY_MIX, underwaterNightFogAmount);
  const nightFogDarken = lerpScalar(1, UNDERWATER_FOG_NIGHT_DARKEN, underwaterNightFogAmount);
  const nightInstantFogBlend = underwaterNightFogAmount * smoothstep(
    UNDERWATER_FOG_NIGHT_INSTANT_ENTRY_START_METERS,
    UNDERWATER_FOG_NIGHT_INSTANT_ENTRY_END_METERS,
    eyeDepthBelowWater
  );
  const underwaterFogColorBlend = clampNumber(
    Math.max(
      lerpScalar(
        submersion,
        Math.sqrt(Math.max(0, submersion)),
        underwaterNightFogAmount * UNDERWATER_FOG_NIGHT_SURFACE_BLEND_BOOST
      ),
      nightInstantFogBlend
    ),
    0,
    1,
    submersion
  );
  underwaterState.underwaterFogColor
    .copy(frameFogColor)
    .lerp(underwaterState.surfaceWaterColor, underwaterWaterColorMix)
    .lerp(atmosphereTemp.fogMix, nightFogSkyMix)
    .multiplyScalar(fogDarken * depthDarken * nightFogDarken);
  scene.fog.color.lerp(underwaterState.underwaterFogColor, underwaterFogColorBlend);
  scene.background.lerp(scene.fog.color, underwaterFogColorBlend * 0.94);
  renderer.setClearColor(scene.fog.color, 1);

  const depthLightVisibility = 1 - depthToLightCutoff;
  const celestialFadeDepth = smoothstep(0.22, 1.0, depthToLightCutoff);
  const celestialVisibility = 1 - submersion * celestialFadeDepth * 0.72;
  const sunShrink = submersion * depthToLightCutoff;
  const rayDepthRise = smoothstep(
    UNDERWATER_RAY_RAMP_START_DEPTH_METERS,
    UNDERWATER_RAY_RAMP_FULL_DEPTH_METERS,
    eyeDepthBelowWater
  );
  const rayDepthFall = 1 - smoothstep(0.78, 1.0, depthToLightCutoff);
  const rayStrength =
    (0.3 + 0.7 * submersion) *
    rayDepthRise *
    rayDepthFall *
    Math.max(0.14, 1 - abyssDepth * 0.65);
  const dayRayWeight = clampNumber(1 - currentNightAmount * 1.15, 0, 1, 1);
  const nightRayWeight = clampNumber(currentNightAmount * 1.25, 0, 1, 0);
  skyUniforms.sunColor.value.multiplyScalar(celestialVisibility);
  skyUniforms.sunDiscPower.value = lerpScalar(256, UNDERWATER_SUN_DISC_POWER_AT_CUTOFF, sunShrink);
  skyUniforms.sunGlowPower.value = lerpScalar(10, 30, sunShrink);
  skyUniforms.sunGlowStrength.value = lerpScalar(0.34, UNDERWATER_SUN_GLOW_STRENGTH_AT_CUTOFF, sunShrink);
  skyUniforms.sunRayStrength.value = rayStrength * dayRayWeight * (UNDERWATER_SUN_RAY_STRENGTH_MAX * 3.2);
  skyUniforms.moonRayStrength.value = rayStrength * nightRayWeight * (UNDERWATER_MOON_RAY_STRENGTH_MAX * 2.8);
  const underwaterSkyMix = submersion * smoothstep(0.12, 1.0, depthToLightCutoff) * lerpScalar(0.75, 1.15, abyssDepth);
  skyUniforms.underwaterSkyMix.value = clampNumber(underwaterSkyMix, 0, 1, 0);
  skyUniforms.underwaterFogTint.value.copy(scene.fog.color);
  moon.material.opacity *= celestialVisibility;
  moon.scale.setScalar(lerpScalar(1, UNDERWATER_MOON_SCALE_AT_CUTOFF, sunShrink));

  const nightSurfaceDarken = smoothstep(0.18, 1.0, currentNightAmount);
  underwaterState.undersideTint
    .copy(underwaterState.surfaceWaterColor)
    .multiplyScalar(lerpScalar(0.52, 0.23, nightSurfaceDarken))
    .lerp(scene.fog.color, lerpScalar(0.48, 0.82, nightSurfaceDarken));
  if (waterShaderState.shader?.uniforms.uWaterUnderwaterMix) {
    waterShaderState.shader.uniforms.uWaterUnderwaterMix.value = submersion;
  }
  if (waterShaderState.shader?.uniforms.uWaterUndersideTint) {
    waterShaderState.shader.uniforms.uWaterUndersideTint.value.copy(underwaterState.undersideTint);
  }
  if (waterShaderState.shader?.uniforms.uWaterTime) {
    waterShaderState.shader.uniforms.uWaterTime.value = clock.elapsedTime;
  }
  const terrainUnderwaterAdaptBlend = underwaterState.isUnderwater
    ? Math.max(
        clampNumber(
          underwaterState.adaptation * (UNDERWATER_ADAPT_SECONDS / UNDERWATER_TERRAIN_TINT_ADAPT_SECONDS),
          0,
          1,
          0
        ),
        underwaterNightFogAmount * UNDERWATER_TERRAIN_NIGHT_ENTRY_BLEND_FLOOR
      )
    : 0;
  const nearTerrainUnderwaterBlend = clampNumber(
    terrainUnderwaterAdaptBlend * UNDERWATER_TERRAIN_TINT_BLEND_NEAR_MAX,
    0,
    UNDERWATER_TERRAIN_TINT_BLEND_NEAR_MAX,
    0
  );
  const midTerrainUnderwaterBlend = clampNumber(
    terrainUnderwaterAdaptBlend * UNDERWATER_TERRAIN_TINT_BLEND_MID_MAX,
    0,
    UNDERWATER_TERRAIN_TINT_BLEND_MID_MAX,
    0
  );
  if (terrainShaderState.shader?.uniforms.uUnderwaterTint) {
    terrainShaderState.shader.uniforms.uUnderwaterTint.value.copy(underwaterState.surfaceWaterColor);
  }
  if (terrainShaderState.shader?.uniforms.uUnderwaterBlend) {
    terrainShaderState.shader.uniforms.uUnderwaterBlend.value = nearTerrainUnderwaterBlend;
  }
  if (midTerrainShaderState.shader?.uniforms.uUnderwaterTint) {
    midTerrainShaderState.shader.uniforms.uUnderwaterTint.value.copy(underwaterState.surfaceWaterColor);
  }
  if (midTerrainShaderState.shader?.uniforms.uUnderwaterBlend) {
    midTerrainShaderState.shader.uniforms.uUnderwaterBlend.value = midTerrainUnderwaterBlend;
  }
  if (farTerrainShaderState.shader?.uniforms.uUnderwaterTint) {
    farTerrainShaderState.shader.uniforms.uUnderwaterTint.value.copy(underwaterState.surfaceWaterColor);
  }
  if (farTerrainShaderState.shader?.uniforms.uUnderwaterBlend) {
    farTerrainShaderState.shader.uniforms.uUnderwaterBlend.value = 0;
  }
  const farTerrainVisibility = 1 - smoothstep(
    UNDERWATER_FAR_TERRAIN_FADE_START_SUBMERSION,
    UNDERWATER_FAR_TERRAIN_FADE_END_SUBMERSION,
    submersion
  );
  const farTerrainUniformFade = Math.sqrt(Math.max(0, farTerrainVisibility));
  if (farTerrainShaderState.shader?.uniforms.uFadeOpacity) {
    farTerrainShaderState.shader.uniforms.uFadeOpacity.value = farTerrainUniformFade;
  }
  if (farTerrainShaderState.shader?.uniforms.uFadeOpacity2) {
    farTerrainShaderState.shader.uniforms.uFadeOpacity2.value = farTerrainUniformFade;
  }
  if (water.material instanceof THREE.MeshPhysicalMaterial) {
    const daylightAmount = 1 - currentNightAmount;
    const baseUnderwaterGlow = lerpScalar(0.05, 0.24, daylightAmount);
    const maxEmissiveBoost = lerpScalar(0.95, 1.65, daylightAmount);
    const moonEmissiveWeight = lerpScalar(0.2, 0.45, daylightAmount);
    const emissiveBoost = clampNumber(
      submersion * (baseUnderwaterGlow + skyUniforms.sunRayStrength.value * 0.55 + skyUniforms.moonRayStrength.value * moonEmissiveWeight),
      0,
      maxEmissiveBoost,
      0
    );
    if (water.material.emissive) {
      const emissiveColorScale = lerpScalar(0.34, 0.78, daylightAmount);
      water.material.emissive.copy(underwaterState.undersideTint).multiplyScalar(emissiveColorScale + emissiveBoost * 0.45);
    }
    water.material.emissiveIntensity = emissiveBoost * lerpScalar(0.7, 1.0, daylightAmount);
  }

  const blurPx = submersion * lerpScalar(UNDERWATER_BLUR_PX_ENTRY, UNDERWATER_BLUR_PX_ADAPTED, underwaterState.adaptation);
  const underwaterSaturation = lerpScalar(UNDERWATER_SATURATION_ENTRY, UNDERWATER_SATURATION_ADAPTED, underwaterState.adaptation);
  const saturation = lerpScalar(1, underwaterSaturation, submersion);
  const nextFilter = blurPx > 0.02 ? `blur(${blurPx.toFixed(2)}px) saturate(${saturation.toFixed(3)})` : "";
  if (nextFilter !== underwaterState.canvasFilter) {
    canvas.style.filter = nextFilter;
    underwaterState.canvasFilter = nextFilter;
  }
}

function normalizeTimeCycle(value) {
  if (!Number.isFinite(value)) return null;
  return ((value % 1) + 1) % 1;
}

function isNightCycle(cycle) {
  const normalized = normalizeTimeCycle(cycle);
  if (normalized == null) return false;
  return normalized >= 0.78 || normalized <= 0.24;
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

function forceTimeCycleRefresh() {
  const original = normalizeTimeCycle(state.timeOfDay);
  if (original == null) return;
  const tempCycle = isNightCycle(original) ? 0.5 : 0;
  setTimeOfDay(tempCycle, null, { silent: true });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeOfDay(original, null, { silent: true });
    });
  });
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

function hash2(x, z) {
  return seededHash2(x, z, noiseSeed);
}

function seededHash2(x, z, seed) {
  const h = Math.sin(x * 127.1 + z * 311.7 + seed) * 43758.5453;
  return h - Math.floor(h);
}

const SIMPLEX_GRAD_2D = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);
const SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;

function fastSimplex2(x, z, seed) {
  const s = (x + z) * SIMPLEX_F2;
  const i = Math.floor(x + s);
  const j = Math.floor(z + s);
  const t = (i + j) * SIMPLEX_G2;
  const x0 = x - (i - t);
  const z0 = z - (j - t);
  const i1 = x0 > z0 ? 1 : 0;
  const j1 = x0 > z0 ? 0 : 1;
  const x1 = x0 - i1 + SIMPLEX_G2;
  const z1 = z0 - j1 + SIMPLEX_G2;
  const x2 = x0 - 1 + 2 * SIMPLEX_G2;
  const z2 = z0 - 1 + 2 * SIMPLEX_G2;

  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  let t0 = 0.5 - x0 * x0 - z0 * z0;
  if (t0 > 0) {
    t0 *= t0;
    const grad = SIMPLEX_GRAD_2D[Math.floor(seededHash2(i, j, seed) * 8)];
    n0 = t0 * t0 * (grad[0] * x0 + grad[1] * z0);
  }
  let t1 = 0.5 - x1 * x1 - z1 * z1;
  if (t1 > 0) {
    t1 *= t1;
    const grad = SIMPLEX_GRAD_2D[Math.floor(seededHash2(i + i1, j + j1, seed) * 8)];
    n1 = t1 * t1 * (grad[0] * x1 + grad[1] * z1);
  }
  let t2 = 0.5 - x2 * x2 - z2 * z2;
  if (t2 > 0) {
    t2 *= t2;
    const grad = SIMPLEX_GRAD_2D[Math.floor(seededHash2(i + 1, j + 1, seed) * 8)];
    n2 = t2 * t2 * (grad[0] * x2 + grad[1] * z2);
  }

  return 70 * (n0 + n1 + n2);
}

function sampleClimateBandNoise(x, z, seedOffset = 0, zoneScaleMultiplier = 1) {
  const axisSeed = noiseSeed + seedOffset;
  const phase = axisSeed * 0.000017;
  // Larger climate zones (~9x area) without changing local biome granularity.
  const CLIMATE_ZONE_SCALE = 2 / 3;
  const zoneScale = CLIMATE_ZONE_SCALE / Math.max(0.01, zoneScaleMultiplier);
  const sx = x * 0.00115 * zoneScale;
  const sz = z * 0.00105 * zoneScale;
  const jitter = fastSimplex2(x * 0.00042 * zoneScale, z * 0.00042 * zoneScale, axisSeed + 7);
  const raw =
    0.5 +
    Math.sin(sx + phase) * 0.22 +
    Math.sin(sz * 1.18 - phase * 1.4) * 0.18 +
    Math.sin((sx + sz) * 0.72 + phase * 0.7) * 0.14 +
    jitter * 0.14;
  return clampNumber(raw, 0, 1, 0.5);
}

function sampleBiomeClimate(x, z) {
  const temperature = sampleClimateBandNoise(x, z, 0);
  const humidity = sampleClimateBandNoise(x, z, 9137, 1.3);
  const selectorSeed = noiseSeed + 317;
  const phaseA = selectorSeed * 0.000017;
  const phaseB = selectorSeed * 0.000023;
  const warpBaseX = x * 0.00032;
  const warpBaseZ = z * 0.00028;
  const warpA = Math.sin(warpBaseX + phaseA * 2.1);
  const warpB = Math.sin(warpBaseZ - phaseB * 1.7);
  const warpC = Math.sin((warpBaseX + warpBaseZ) * 0.85 + phaseA * 1.3);
  const warpX = (warpA + warpC) * 120;
  const warpZ = (warpB - warpC) * 120;
  const mx = (x + warpX) * 0.0011;
  const mz = (z + warpZ) * 0.00102;
  const dx = x + warpX * 0.6;
  const dz = z + warpZ * 0.6;
  const selectorMacroRaw =
    0.5 +
    Math.sin((mx * 0.84 - mz * 0.34) + phaseB) * 0.23 +
    Math.sin((mz * 1.31 + mx * 0.22) - phaseB * 0.9) * 0.16 +
    Math.sin((mx - mz) * 0.59 + phaseB * 0.4) * 0.11;
  const DETAIL_WAVELENGTH_SCALE = 0.6;
  const detailJitter = fastSimplex2(dx * 0.0011, dz * 0.0011, noiseSeed + 19) * 1.6;
  const detailRaw =
    0.5 +
    Math.sin(
      dx * 0.0069 * DETAIL_WAVELENGTH_SCALE +
        dz * 0.0042 * DETAIL_WAVELENGTH_SCALE +
        noiseSeed * 0.00019 +
        detailJitter * 1.3
    ) * 0.22 +
    Math.sin(
      dx * -0.0044 * DETAIL_WAVELENGTH_SCALE +
        dz * 0.0076 * DETAIL_WAVELENGTH_SCALE -
        noiseSeed * 0.00013 +
        detailJitter * -1.05
    ) * 0.12;
  return {
    temperature,
    humidity,
    selectorMacro: clampNumber(selectorMacroRaw, 0, 1, 0.5),
    detail: clampNumber(detailRaw, 0, 1, 0.5),
  };
}

function sampleBiomeClimateFields(x, z) {
  const climate = sampleBiomeClimate(x, z);
  const mixBias = clampNumber(0.25 + climate.detail * 0.5, 0.2, 0.75, 0.45);
  const rawSelector = climate.selectorMacro * (1 - mixBias) + climate.detail * mixBias;
  const ridge = 1 - Math.abs(rawSelector * 2 - 1);
  const shapedSelector = clampNumber(rawSelector + (ridge - 0.5) * 0.08, 0, 1, 0.5);
  return {
    ...climate,
    selector: smoothstep(0.08, 0.92, shapedSelector),
  };
}

function biomeSubdivisionSeedOffset(biomeId) {
  let hash = 0;
  const id = String(biomeId || "");
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  }
  return hash;
}

function sampleBumpyBiomeSubdivisionSelector(x, z, biomeId) {
  const offset = biomeSubdivisionSeedOffset(biomeId);
  const primary = fastSimplex2(
    x * BUMPY_BIOME_SUBDIVISION_PRIMARY_SCALE,
    z * BUMPY_BIOME_SUBDIVISION_PRIMARY_SCALE,
    noiseSeed + offset + 401
  );
  const secondary = fastSimplex2(
    x * BUMPY_BIOME_SUBDIVISION_SECONDARY_SCALE,
    z * BUMPY_BIOME_SUBDIVISION_SECONDARY_SCALE,
    noiseSeed + offset + 809
  );
  const combined = primary * 0.72 + secondary * 0.28;
  return clampNumber(combined * 0.5 + 0.5, 0, 1, 0.5);
}

function getBumpySubdividedBiomeForPoint(x, z, biome) {
  if (!biome) return biome;
  const biomeId = String(biome.id || "");
  if (biomeId.startsWith(BIOME_SUBDIVISION_PREFIX_JAGGED) || biomeId.startsWith(BIOME_SUBDIVISION_PREFIX_SMOOTH)) {
    return biome;
  }
  const variants = BUMPY_BIOME_SUBDIVISIONS[biomeId];
  if (!variants) return biome;
  const selector = sampleBumpyBiomeSubdivisionSelector(x, z, biomeId);
  if (selector <= BUMPY_BIOME_SUBDIVISION_THRESHOLD_SMOOTH) {
    return BIOME_DEFS[variants.smoothId] || biome;
  }
  if (selector >= BUMPY_BIOME_SUBDIVISION_THRESHOLD_JAGGED) {
    return BIOME_DEFS[variants.jaggedId] || biome;
  }
  return BIOME_DEFS[variants.normalId] || biome;
}

function getBumpySubdivisionVariantWeights(selector, selectorGradientPerMeter) {
  const smoothToNormal = metersBoundaryBlend(
    selector,
    BUMPY_BIOME_SUBDIVISION_THRESHOLD_SMOOTH,
    selectorGradientPerMeter
  );
  const normalToJagged = metersBoundaryBlend(
    selector,
    BUMPY_BIOME_SUBDIVISION_THRESHOLD_JAGGED,
    selectorGradientPerMeter
  );
  return normalizeWeightTriplet(
    1 - smoothToNormal,
    smoothToNormal * (1 - normalToJagged),
    normalToJagged
  );
}

function getBumpySubdivisionVariantWeightsAt(x, z, biomeId) {
  const selector = sampleBumpyBiomeSubdivisionSelector(x, z, biomeId);
  const nearSmoothBoundary = Math.abs(selector - BUMPY_BIOME_SUBDIVISION_THRESHOLD_SMOOTH) <= BUMPY_BIOME_SUBDIVISION_PRECHECK_MARGIN;
  const nearJaggedBoundary = Math.abs(selector - BUMPY_BIOME_SUBDIVISION_THRESHOLD_JAGGED) <= BUMPY_BIOME_SUBDIVISION_PRECHECK_MARGIN;
  if (!nearSmoothBoundary && !nearJaggedBoundary) {
    if (selector <= BUMPY_BIOME_SUBDIVISION_THRESHOLD_SMOOTH) return [1, 0, 0];
    if (selector >= BUMPY_BIOME_SUBDIVISION_THRESHOLD_JAGGED) return [0, 0, 1];
    return [0, 1, 0];
  }

  const h = BIOME_BLEND_GRADIENT_STEP_METERS;
  const xp = sampleBumpyBiomeSubdivisionSelector(x + h, z, biomeId);
  const xm = sampleBumpyBiomeSubdivisionSelector(x - h, z, biomeId);
  const zp = sampleBumpyBiomeSubdivisionSelector(x, z + h, biomeId);
  const zm = sampleBumpyBiomeSubdivisionSelector(x, z - h, biomeId);
  const invSpan = 1 / (2 * h);
  const gradX = (xp - xm) * invSpan;
  const gradZ = (zp - zm) * invSpan;
  const gradientPerMeter = Math.hypot(gradX, gradZ);
  return getBumpySubdivisionVariantWeights(selector, gradientPerMeter);
}

function normalizeWeightTriplet(a, b, c) {
  const total = a + b + c;
  if (total <= 0) return [1, 0, 0];
  return [a / total, b / total, c / total];
}

function metersBoundaryBlendWithHalfWidth(value, threshold, gradientPerMeter, halfWidthMeters = BIOME_BLEND_HALF_WIDTH_METERS) {
  const safeGradient = Math.max(Math.abs(gradientPerMeter), 1e-4);
  const signedMeters = (value - threshold) / safeGradient;
  const halfWidth = Math.max(0.5, Number(halfWidthMeters) || BIOME_BLEND_HALF_WIDTH_METERS);
  return smoothstep(-halfWidth, halfWidth, signedMeters);
}

function metersBoundaryBlend(value, threshold, gradientPerMeter) {
  return metersBoundaryBlendWithHalfWidth(value, threshold, gradientPerMeter, BIOME_BLEND_HALF_WIDTH_METERS);
}

function getTemperatureCategoryFromValue(temperature) {
  if (temperature < CLIMATE_ZONE_THRESHOLD_LOW) return "cold";
  if (temperature > CLIMATE_ZONE_THRESHOLD_HIGH) return "hot";
  return "temperate";
}

function getHumidityBandKey(value) {
  if (value < HUMIDITY_ZONE_THRESHOLD_LOW) return "xeric";
  if (value > HUMIDITY_ZONE_THRESHOLD_HIGH) return "hydric";
  return "mesic";
}

function getHumidityMappedBiome(baseBiome, humidityBand) {
  if (!baseBiome) return null;
  const lookup = BIOME_HUMIDITY_LOOKUP[baseBiome.id];
  if (!lookup) return baseBiome;
  const mappedId = lookup[humidityBand];
  return BIOME_DEFS[mappedId] || baseBiome;
}

function getOceanBiome(regime, temperatureCategory, variantIndex) {
  const regimeVariants = OCEAN_BIOME_VARIANTS[regime];
  if (!regimeVariants) return null;
  const categoryVariants = regimeVariants[temperatureCategory];
  if (!Array.isArray(categoryVariants) || categoryVariants.length === 0) return null;
  const clampedIndex = clampNumber(Math.floor(variantIndex), 0, categoryVariants.length - 1, 0);
  const biomeId = categoryVariants[clampedIndex];
  return BIOME_DEFS[biomeId] || null;
}

function getOceanRegimeFromMountainAdditiveHeight(heightMeters) {
  if (heightMeters < OCEAN_BIOME_OPEN_MAX_MOUNTAIN_ADDITIVE_HEIGHT) return "open";
  if (heightMeters < OCEAN_BIOME_COASTAL_MAX_MOUNTAIN_ADDITIVE_HEIGHT) return "coastal";
  return "land";
}

function isDeepOpenOceanBiome(biome) {
  return typeof biome?.id === "string" && biome.id.startsWith("deep_");
}

function getBiomeCategoryWeights(temperature, temperatureGradientPerMeter) {
  const coldToTemperate = metersBoundaryBlend(temperature, CLIMATE_ZONE_THRESHOLD_LOW, temperatureGradientPerMeter);
  const temperateToHot = metersBoundaryBlend(temperature, CLIMATE_ZONE_THRESHOLD_HIGH, temperatureGradientPerMeter);
  return normalizeWeightTriplet(
    1 - coldToTemperate,
    coldToTemperate * (1 - temperateToHot),
    temperateToHot
  );
}

function getHumidityZoneWeights(humidity, humidityGradientPerMeter) {
  const xericToMesic = metersBoundaryBlend(humidity, HUMIDITY_ZONE_THRESHOLD_LOW, humidityGradientPerMeter);
  const mesicToHydric = metersBoundaryBlend(humidity, HUMIDITY_ZONE_THRESHOLD_HIGH, humidityGradientPerMeter);
  return normalizeWeightTriplet(
    1 - xericToMesic,
    xericToMesic * (1 - mesicToHydric),
    mesicToHydric
  );
}

function getBiomeVariantWeights(selector, selectorGradientPerMeter) {
  const lowToMid = metersBoundaryBlend(selector, 1 / 3, selectorGradientPerMeter);
  const midToHigh = metersBoundaryBlend(selector, 2 / 3, selectorGradientPerMeter);
  return normalizeWeightTriplet(1 - lowToMid, lowToMid * (1 - midToHigh), midToHigh);
}

function createBiomeBlendSampleResult() {
  return {
    count: 0,
    dominantBiome: null,
    biomes: Array(BIOME_BLEND_MAX_SLOTS).fill(null),
    weights: Array(BIOME_BLEND_MAX_SLOTS).fill(0),
  };
}

function setSingleBiomeBlendResult(target, biome) {
  target.count = 1;
  target.dominantBiome = biome || null;
  target.biomes[0] = biome || null;
  target.weights[0] = 1;
  for (let i = 1; i < target.biomes.length; i += 1) {
    target.biomes[i] = null;
    target.weights[i] = 0;
  }
  return target;
}

function upsertBiomeBlendEntry(target, biome, weight) {
  if (!biome || !(weight > 0)) return;
  for (let i = 0; i < target.count; i += 1) {
    if (target.biomes[i]?.id === biome.id) {
      target.weights[i] += weight;
      return;
    }
  }
  if (target.count < target.biomes.length) {
    target.biomes[target.count] = biome;
    target.weights[target.count] = weight;
    target.count += 1;
    return;
  }
  let minIndex = 0;
  for (let i = 1; i < target.count; i += 1) {
    if (target.weights[i] < target.weights[minIndex]) minIndex = i;
  }
  if (weight > target.weights[minIndex]) {
    target.biomes[minIndex] = biome;
    target.weights[minIndex] = weight;
  }
}

function normalizeBiomeBlendResult(target) {
  let total = 0;
  let bestIndex = 0;
  let bestWeight = -Infinity;
  for (let i = 0; i < target.count; i += 1) {
    const w = Math.max(0, target.weights[i] || 0);
    target.weights[i] = w;
    total += w;
    if (w > bestWeight) {
      bestWeight = w;
      bestIndex = i;
    }
  }
  if (total <= 0 || target.count === 0) {
    return setSingleBiomeBlendResult(target, target.dominantBiome || BIOME_DEFS.meadow);
  }
  for (let i = 0; i < target.count; i += 1) {
    target.weights[i] /= total;
  }
  if (!target.dominantBiome || bestWeight <= 0) {
    target.dominantBiome = target.biomes[bestIndex] || target.dominantBiome || null;
  }
  for (let i = target.count; i < target.biomes.length; i += 1) {
    target.biomes[i] = null;
    target.weights[i] = 0;
  }
  return target;
}

function applyWetlandHeightOverride(x, z, target) {
  if (!target) return target;
  const wetlandRetainWeight = getWetlandRetentionWeightAt(x, z);
  if (wetlandRetainWeight >= 0.999) return target;
  const originalCount = target.count;
  if (originalCount <= 0) return target;
  const originalBiomes = target.biomes.slice(0, originalCount);
  const originalWeights = target.weights.slice(0, originalCount);

  target.count = 0;
  for (let i = 0; i < target.biomes.length; i += 1) {
    target.biomes[i] = null;
    target.weights[i] = 0;
  }

  for (let i = 0; i < originalCount; i += 1) {
    const biome = originalBiomes[i];
    const weight = originalWeights[i];
    if (!(weight > 0)) continue;
    if (biome?.wetlandRetentionGroup === "wetland") {
      const humidityBand = biome.humidityBand || "mesic";
      const fallbackId = BIOME_HUMIDITY_LOOKUP.meadow?.[humidityBand] || "meadow";
      const fallbackBiome = BIOME_DEFS[fallbackId] || BIOME_DEFS.meadow;
      const fallbackWeight = weight * (1 - wetlandRetainWeight);
      const wetlandWeight = weight * wetlandRetainWeight;
      if (fallbackWeight > 0.0001) upsertBiomeBlendEntry(target, fallbackBiome, fallbackWeight);
      if (wetlandWeight > 0.0001) upsertBiomeBlendEntry(target, biome, wetlandWeight);
      continue;
    }
    upsertBiomeBlendEntry(target, biome, weight);
  }

  if (target.dominantBiome?.wetlandRetentionGroup === "wetland") {
    const dominantHumidityBand = target.dominantBiome.humidityBand || "mesic";
    const fallbackId = BIOME_HUMIDITY_LOOKUP.meadow?.[dominantHumidityBand] || "meadow";
    const fallbackBiome = BIOME_DEFS[fallbackId] || BIOME_DEFS.meadow;
    target.dominantBiome = wetlandRetainWeight >= 0.5 ? target.dominantBiome : fallbackBiome;
  }

  return normalizeBiomeBlendResult(target);
}

const mountainBiomeAdditiveScratch = {
  gentleAdditiveHeight: 0,
  mountainAdditiveHeight: 0,
  totalAdditiveHeight: 0,
  rangeMask: 0,
  rangeClass: 0,
  peakPotential: 0,
};

function getMountainBiomeThresholdMeters() {
  return Number.isFinite(heightAt?.mountainBiomeThresholdMeters) ? heightAt.mountainBiomeThresholdMeters : 100;
}

function fillTerrainAdditiveSampleAt(x, z, target = mountainBiomeAdditiveScratch) {
  if (typeof heightAt?.sampleTerrainAdditive === "function") {
    return heightAt.sampleTerrainAdditive(x, z, target);
  }
  target.gentleAdditiveHeight = 0;
  target.mountainAdditiveHeight = 0;
  target.totalAdditiveHeight = 0;
  target.rangeMask = 0;
  target.rangeClass = 0;
  target.peakPotential = 0;
  return target;
}

function getDeepOceanAllowance(mountainAdditiveHeight, rangeMask) {
  const centerMountainSignal = Math.max(0, mountainAdditiveHeight || 0);
  const centerRangeSignal = Math.max(0, rangeMask || 0) * OCEAN_DEEP_BIOME_COAST_RANGE_MASK_SCALE;
  const coastSignal = Math.max(centerMountainSignal, centerRangeSignal);
  const nearCoastWeight = smoothstep(
    OCEAN_DEEP_BIOME_COAST_SIGNAL_START,
    OCEAN_DEEP_BIOME_COAST_SIGNAL_END,
    coastSignal
  );
  return 1 - nearCoastWeight;
}

function shouldDemoteWetlandAt(x, z) {
  return getWetlandRetentionWeightAt(x, z) < 0.5;
}

function getWetlandRetentionWeightAt(x, z) {
  const center = fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch);
  const centerHeight = center.mountainAdditiveHeight || 0;
  const fadeBand = Math.max(0.5, WETLAND_ELEVATION_FADE_BAND_METERS);
  const fadeStart = WETLAND_MOUNTAIN_HEIGHT_MAX_METERS - fadeBand;
  if (centerHeight <= fadeStart) return 1;
  if (centerHeight >= WETLAND_MOUNTAIN_HEIGHT_MAX_METERS) return 0;
  return 1 - smoothstep(fadeStart, WETLAND_MOUNTAIN_HEIGHT_MAX_METERS, centerHeight);
}

function getMountainBiomeVariant(biome) {
  if (!biome) return null;
  if (biome.isMountainVariant) return biome;
  const humidityBand = biome.humidityBand || "mesic";
  const lookup = ROCKY_MOUNTAIN_HUMIDITY_LOOKUP[biome.category];
  const climateMountainId = lookup?.[humidityBand];
  if (climateMountainId && BIOME_DEFS[climateMountainId]) {
    return BIOME_DEFS[climateMountainId];
  }
  return BIOME_DEFS[`${biome.id}${MOUNTAIN_BIOME_SUFFIX}`] || biome;
}

function getSimpleMountainBiomeVariant(biome) {
  const baseBiome = getBaseBiomeVariant(biome);
  if (!baseBiome) return null;
  return BIOME_DEFS[`${baseBiome.id}${MOUNTAIN_BIOME_SUFFIX}`] || null;
}

function sampleSimpleMountainSelector(x, z, biomeId) {
  const offset = biomeSubdivisionSeedOffset(`simple:${biomeId}`);
  const primary = fastSimplex2(
    x * SIMPLE_MOUNTAIN_SELECTOR_PRIMARY_SCALE,
    z * SIMPLE_MOUNTAIN_SELECTOR_PRIMARY_SCALE,
    noiseSeed + offset + 1207
  );
  const secondary = fastSimplex2(
    x * SIMPLE_MOUNTAIN_SELECTOR_SECONDARY_SCALE,
    z * SIMPLE_MOUNTAIN_SELECTOR_SECONDARY_SCALE,
    noiseSeed + offset + 1879
  );
  const combined = primary * 0.74 + secondary * 0.26;
  return clampNumber(combined * 0.5 + 0.5, 0, 1, 0.5);
}

function getSimpleMountainAltitudeGate(centerMountainHeight) {
  const height = Number(centerMountainHeight) || 0;
  if (height >= HIGH_ALTITUDE_BIOME_THRESHOLD_METERS) return 0;
  const fadeBand = Math.max(1, SIMPLE_MOUNTAIN_HIGH_ALTITUDE_FADE_METERS);
  const fadeStart = HIGH_ALTITUDE_BIOME_THRESHOLD_METERS - fadeBand;
  if (height <= fadeStart) return 1;
  return 1 - smoothstep(fadeStart, HIGH_ALTITUDE_BIOME_THRESHOLD_METERS, height);
}

function getSimpleMountainShareAt(x, z, biome, centerMountainHeight = null) {
  const baseBiome = getBaseBiomeVariant(biome);
  const simpleMountainBiome = getSimpleMountainBiomeVariant(baseBiome);
  if (!baseBiome || !simpleMountainBiome) return 0;

  const centerHeight = Number.isFinite(centerMountainHeight)
    ? centerMountainHeight
    : fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch).mountainAdditiveHeight || 0;
  const altitudeGate = getSimpleMountainAltitudeGate(centerHeight);
  if (!(altitudeGate > 0.0001)) return 0;

  const targetShare = clampNumber(SIMPLE_MOUNTAIN_TARGET_SHARE, 0, 1, 0.6);
  const selector = sampleSimpleMountainSelector(x, z, baseBiome.id);
  const nearBoundary = Math.abs(selector - targetShare) <= SIMPLE_MOUNTAIN_SELECTOR_PRECHECK_MARGIN;
  if (!nearBoundary) {
    return selector <= targetShare ? altitudeGate : 0;
  }

  const h = BIOME_BLEND_GRADIENT_STEP_METERS;
  const xp = sampleSimpleMountainSelector(x + h, z, baseBiome.id);
  const xm = sampleSimpleMountainSelector(x - h, z, baseBiome.id);
  const zp = sampleSimpleMountainSelector(x, z + h, baseBiome.id);
  const zm = sampleSimpleMountainSelector(x, z - h, baseBiome.id);
  const invSpan = 1 / (2 * h);
  const gradX = (xp - xm) * invSpan;
  const gradZ = (zp - zm) * invSpan;
  const gradientPerMeter = Math.hypot(gradX, gradZ);
  const modernShare = metersBoundaryBlendWithHalfWidth(
    selector,
    targetShare,
    gradientPerMeter,
    SIMPLE_MOUNTAIN_SELECTOR_BLEND_HALF_WIDTH_METERS
  );
  return (1 - modernShare) * altitudeGate;
}

function pickMountainBiomeVariantAt(x, z, biome, centerMountainHeight = null) {
  const baseBiome = getBaseBiomeVariant(biome);
  if (!baseBiome) return biome;
  const modernMountainBiome = getMountainBiomeVariant(baseBiome);
  const simpleMountainBiome = getSimpleMountainBiomeVariant(baseBiome);
  if (!simpleMountainBiome || simpleMountainBiome.id === modernMountainBiome?.id) return modernMountainBiome;
  const simpleShare = getSimpleMountainShareAt(x, z, baseBiome, centerMountainHeight);
  return simpleShare >= 0.5 ? simpleMountainBiome : modernMountainBiome;
}

function getHighAltitudeBiomeVariant(biome, fallbackCategory = "temperate", fallbackHumidityBand = "mesic") {
  if (!biome) return null;
  const category = biome.category || fallbackCategory;
  const humidityBand = biome.humidityBand || fallbackHumidityBand;
  const lookup = HIGH_ALTITUDE_MOUNTAIN_HUMIDITY_LOOKUP[category];
  const highAltitudeBiomeId = lookup?.[humidityBand] || lookup?.mesic;
  if (!highAltitudeBiomeId) return biome;
  return BIOME_DEFS[highAltitudeBiomeId] || biome;
}

function getBaseBiomeVariant(biome) {
  if (!biome) return null;
  if (!biome.isMountainVariant) return biome;
  return BIOME_DEFS[biome.baseBiomeId] || biome;
}

function getMountainBiomeBlendWeightAt(x, z) {
  const center = fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch);
  const centerHeight = center.mountainAdditiveHeight || 0;
  const threshold = getMountainBiomeThresholdMeters();
  const blendHalfWidth = MOUNTAIN_BIOME_BORDER_BLEND_HEIGHT_METERS;
  if (centerHeight <= threshold - blendHalfWidth) return 0;
  if (centerHeight >= threshold + blendHalfWidth) return 1;
  return smoothstep(threshold - blendHalfWidth, threshold + blendHalfWidth, centerHeight);
}

function getHighAltitudeBiomeBlendWeightAt(x, z) {
  const center = fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch);
  const centerHeight = center.mountainAdditiveHeight || 0;
  const threshold = HIGH_ALTITUDE_BIOME_THRESHOLD_METERS;
  const blendHalfWidth = HIGH_ALTITUDE_BIOME_BORDER_BLEND_HEIGHT_METERS;
  if (centerHeight <= threshold - blendHalfWidth) return 0;
  if (centerHeight >= threshold + blendHalfWidth) return 1;
  return smoothstep(threshold - blendHalfWidth, threshold + blendHalfWidth, centerHeight);
}

function applyMountainVariantsToBiomeBlend(x, z, target) {
  if (!target) return target;
  const mountainWeight = getMountainBiomeBlendWeightAt(x, z);
  if (!(mountainWeight > 0)) {
    return target;
  }

  const centerMountainSample = fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch);
  const centerMountainHeight = centerMountainSample.mountainAdditiveHeight || 0;
  const baseWeight = 1 - mountainWeight;
  const originalCount = target.count;
  const originalBiomes = target.biomes.slice(0, originalCount);
  const originalWeights = target.weights.slice(0, originalCount);
  const dominantBaseBiome = getBaseBiomeVariant(target.dominantBiome);

  target.count = 0;
  for (let i = 0; i < target.biomes.length; i += 1) {
    target.biomes[i] = null;
    target.weights[i] = 0;
  }

  for (let i = 0; i < originalCount; i += 1) {
    const biome = getBaseBiomeVariant(originalBiomes[i]);
    const weight = originalWeights[i];
    if (!biome || !(weight > 0)) continue;

    const modernMountainBiome = getMountainBiomeVariant(biome);
    const simpleMountainBiome = getSimpleMountainBiomeVariant(biome);
    const simpleMountainShare =
      simpleMountainBiome && simpleMountainBiome.id !== modernMountainBiome?.id
        ? getSimpleMountainShareAt(x, z, biome, centerMountainHeight)
        : 0;
    const modernMountainShare = 1 - simpleMountainShare;

    if (baseWeight > 0.0001) upsertBiomeBlendEntry(target, biome, weight * baseWeight);
    if (mountainWeight > 0.0001 && modernMountainShare > 0.0001) {
      upsertBiomeBlendEntry(target, modernMountainBiome, weight * mountainWeight * modernMountainShare);
    }
    if (mountainWeight > 0.0001 && simpleMountainShare > 0.0001) {
      upsertBiomeBlendEntry(target, simpleMountainBiome, weight * mountainWeight * simpleMountainShare);
    }
  }

  normalizeBiomeBlendResult(target);
  target.dominantBiome =
    mountainWeight >= 0.5 ? pickMountainBiomeVariantAt(x, z, dominantBaseBiome, centerMountainHeight) : dominantBaseBiome;
  return target;
}

function applyHighAltitudeVariantsToBiomeBlend(x, z, target) {
  if (!target) return target;
  const highAltitudeWeight = getHighAltitudeBiomeBlendWeightAt(x, z);
  if (!(highAltitudeWeight > 0)) return target;

  const dominantCategory = target.dominantBiome?.category || "temperate";
  const dominantHumidityBand = target.dominantBiome?.humidityBand || "mesic";
  if (highAltitudeWeight >= 0.999) {
    for (let i = 0; i < target.count; i += 1) {
      target.biomes[i] = getHighAltitudeBiomeVariant(target.biomes[i], dominantCategory, dominantHumidityBand);
    }
    target.dominantBiome = getHighAltitudeBiomeVariant(target.dominantBiome, dominantCategory, dominantHumidityBand);
    return target;
  }

  const baseWeight = 1 - highAltitudeWeight;
  const originalCount = target.count;
  const originalBiomes = target.biomes.slice(0, originalCount);
  const originalWeights = target.weights.slice(0, originalCount);
  const dominantBaseBiome = target.dominantBiome || null;

  target.count = 0;
  for (let i = 0; i < target.biomes.length; i += 1) {
    target.biomes[i] = null;
    target.weights[i] = 0;
  }

  for (let i = 0; i < originalCount; i += 1) {
    const biome = originalBiomes[i];
    const weight = originalWeights[i];
    if (!biome || !(weight > 0)) continue;
    if (baseWeight > 0.0001) upsertBiomeBlendEntry(target, biome, weight * baseWeight);
    if (highAltitudeWeight > 0.0001) {
      const highAltitudeBiome = getHighAltitudeBiomeVariant(biome, dominantCategory, dominantHumidityBand);
      upsertBiomeBlendEntry(target, highAltitudeBiome, weight * highAltitudeWeight);
    }
  }

  normalizeBiomeBlendResult(target);
  target.dominantBiome =
    highAltitudeWeight >= 0.5
      ? getHighAltitudeBiomeVariant(dominantBaseBiome, dominantCategory, dominantHumidityBand)
      : dominantBaseBiome;
  return target;
}

function applyBumpySubdivisionsToBiomeBlend(x, z, target) {
  if (!target || target.count <= 0) return target;
  const originalCount = target.count;
  const originalBiomes = target.biomes.slice(0, originalCount);
  const originalWeights = target.weights.slice(0, originalCount);
  target.count = 0;
  for (let i = 0; i < target.biomes.length; i += 1) {
    target.biomes[i] = null;
    target.weights[i] = 0;
  }

  for (let i = 0; i < originalCount; i += 1) {
    const biome = originalBiomes[i];
    const weight = originalWeights[i];
    if (!biome || !(weight > 0)) continue;
    const variants = BUMPY_BIOME_SUBDIVISIONS[biome.id];
    if (!variants) {
      upsertBiomeBlendEntry(target, biome, weight);
      continue;
    }
    const [smoothW, normalW, jaggedW] = getBumpySubdivisionVariantWeightsAt(x, z, biome.id);
    if (smoothW > 0.0001) upsertBiomeBlendEntry(target, BIOME_DEFS[variants.smoothId] || biome, weight * smoothW);
    if (normalW > 0.0001) upsertBiomeBlendEntry(target, BIOME_DEFS[variants.normalId] || biome, weight * normalW);
    if (jaggedW > 0.0001) upsertBiomeBlendEntry(target, BIOME_DEFS[variants.jaggedId] || biome, weight * jaggedW);
  }
  target.dominantBiome = null;
  return normalizeBiomeBlendResult(target);
}

function finalizeBiomeBlendAt(x, z, target) {
  applyMountainVariantsToBiomeBlend(x, z, target);
  applyWetlandHeightOverride(x, z, target);
  applyHighAltitudeVariantsToBiomeBlend(x, z, target);
  return applyBumpySubdivisionsToBiomeBlend(x, z, target);
}

function getBiomeWithMountainVariantAt(x, z, biome) {
  if (!biome) return biome;
  return getMountainBiomeBlendWeightAt(x, z) >= 0.5
    ? pickMountainBiomeVariantAt(x, z, biome)
    : biome;
}

function getBiomeWithHighAltitudeVariantAt(x, z, biome, category = "temperate", humidityBand = "mesic") {
  if (!biome) return biome;
  return getHighAltitudeBiomeBlendWeightAt(x, z) >= 0.5
    ? getHighAltitudeBiomeVariant(biome, category, humidityBand)
    : biome;
}

function fillBiomeBlendSample(x, z, target = createBiomeBlendSampleResult()) {
  const center = sampleBiomeClimateFields(x, z);
  const dominantCategory = getTemperatureCategoryFromValue(center.temperature);
  const variantIndex = Math.min(2, Math.floor(center.selector * 3));
  const dominantHumidityBand = getHumidityBandKey(center.humidity);
  const dominantBaseBiome = BIOME_DEFS[BIOME_VARIANTS[dominantCategory][variantIndex]];
  const dominantLandBiome = getHumidityMappedBiome(dominantBaseBiome, dominantHumidityBand);
  const centerMountainSample = fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch);
  const centerMountainAdditiveHeight = centerMountainSample.mountainAdditiveHeight || 0;
  const centerMountainRangeMask = centerMountainSample.rangeMask || 0;
  const dominantOceanRegime = getOceanRegimeFromMountainAdditiveHeight(centerMountainAdditiveHeight);
  const dominantOceanBiome =
    dominantOceanRegime === "land" ? null : getOceanBiome(dominantOceanRegime, dominantCategory, variantIndex);
  const dominantBiome = dominantOceanBiome || dominantLandBiome;
  target.dominantBiome = dominantBiome;
  const needsDeepOceanGapCheck = dominantOceanRegime === "open" && isDeepOpenOceanBiome(dominantOceanBiome);

  const nearOceanOpenBoundary =
    Math.abs(centerMountainAdditiveHeight - OCEAN_BIOME_OPEN_MAX_MOUNTAIN_ADDITIVE_HEIGHT) <=
    OCEAN_BIOME_OPEN_BLEND_PRECHECK_HEIGHT;
  const nearOceanLandBoundary =
    Math.abs(centerMountainAdditiveHeight - OCEAN_BIOME_COASTAL_MAX_MOUNTAIN_ADDITIVE_HEIGHT) <=
      OCEAN_BIOME_LAND_BLEND_PRECHECK_HEIGHT;
  const nearTempBoundary =
    Math.abs(center.temperature - CLIMATE_ZONE_THRESHOLD_LOW) <= BIOME_BLEND_PRECHECK_MARGIN ||
    Math.abs(center.temperature - CLIMATE_ZONE_THRESHOLD_HIGH) <= BIOME_BLEND_PRECHECK_MARGIN;
  const nearSelectorBoundary =
    Math.abs(center.selector - 1 / 3) <= BIOME_BLEND_PRECHECK_MARGIN ||
    Math.abs(center.selector - 2 / 3) <= BIOME_BLEND_PRECHECK_MARGIN;
  const shouldBlendHumidity = dominantOceanRegime === "land" || nearOceanLandBoundary;
  const nearHumidityBoundary =
    shouldBlendHumidity &&
    (Math.abs(center.humidity - HUMIDITY_ZONE_THRESHOLD_LOW) <= BIOME_BLEND_PRECHECK_MARGIN ||
      Math.abs(center.humidity - HUMIDITY_ZONE_THRESHOLD_HIGH) <= BIOME_BLEND_PRECHECK_MARGIN);

  if (
    !nearTempBoundary &&
    !nearSelectorBoundary &&
    !nearHumidityBoundary &&
    !nearOceanOpenBoundary &&
    !nearOceanLandBoundary &&
    !needsDeepOceanGapCheck
  ) {
    setSingleBiomeBlendResult(target, dominantBiome);
    return finalizeBiomeBlendAt(x, z, target);
  }

  if (!nearTempBoundary && !nearSelectorBoundary && !nearHumidityBoundary && !nearOceanOpenBoundary && !nearOceanLandBoundary && needsDeepOceanGapCheck) {
    const deepAllowance = getDeepOceanAllowance(centerMountainAdditiveHeight, centerMountainRangeMask);
    const deepBiome = dominantOceanBiome;
    const bufferedOceanBiome = getOceanBiome("open", dominantCategory, 0) || deepBiome;
    if (!(deepAllowance > 0.0001) || !deepBiome || !bufferedOceanBiome || deepBiome.id === bufferedOceanBiome.id) {
      setSingleBiomeBlendResult(target, bufferedOceanBiome || dominantBiome);
      return finalizeBiomeBlendAt(x, z, target);
    }
    if (deepAllowance >= 0.9999) {
      setSingleBiomeBlendResult(target, deepBiome);
      return finalizeBiomeBlendAt(x, z, target);
    }
    target.count = 0;
    target.dominantBiome = deepAllowance >= 0.5 ? deepBiome : bufferedOceanBiome;
    for (let i = 0; i < target.biomes.length; i += 1) {
      target.biomes[i] = null;
      target.weights[i] = 0;
    }
    upsertBiomeBlendEntry(target, bufferedOceanBiome, 1 - deepAllowance);
    upsertBiomeBlendEntry(target, deepBiome, deepAllowance);
    normalizeBiomeBlendResult(target);
    return finalizeBiomeBlendAt(x, z, target);
  }

  const h = BIOME_BLEND_GRADIENT_STEP_METERS;
  const xp = sampleBiomeClimateFields(x + h, z);
  const xm = sampleBiomeClimateFields(x - h, z);
  const zp = sampleBiomeClimateFields(x, z + h);
  const zm = sampleBiomeClimateFields(x, z - h);
  const invSpan = 1 / (2 * h);
  const tempGradX = (xp.temperature - xm.temperature) * invSpan;
  const tempGradZ = (zp.temperature - zm.temperature) * invSpan;
  const selectorGradX = (xp.selector - xm.selector) * invSpan;
  const selectorGradZ = (zp.selector - zm.selector) * invSpan;
  const humidityGradX = (xp.humidity - xm.humidity) * invSpan;
  const humidityGradZ = (zp.humidity - zm.humidity) * invSpan;
  const tempGradientPerMeter = Math.hypot(tempGradX, tempGradZ);
  const selectorGradientPerMeter = Math.hypot(selectorGradX, selectorGradZ);
  const humidityGradientPerMeter = Math.hypot(humidityGradX, humidityGradZ);

  const [coldW, temperateW, hotW] = getBiomeCategoryWeights(center.temperature, tempGradientPerMeter);
  const [lowW, midW, highW] = getBiomeVariantWeights(center.selector, selectorGradientPerMeter);
  const [xericW, mesicW, hydricW] = getHumidityZoneWeights(center.humidity, humidityGradientPerMeter);

  let oceanOpenWeight = 0;
  let oceanCoastalWeight = 0;
  let landWeight = 1;
  if (dominantOceanRegime === "open") {
    oceanOpenWeight = 1;
    landWeight = 0;
  } else if (dominantOceanRegime === "coastal") {
    oceanCoastalWeight = 1;
    landWeight = 0;
  }

  if (nearOceanOpenBoundary || nearOceanLandBoundary) {
    const openToCoastal = smoothstep(
      OCEAN_BIOME_OPEN_MAX_MOUNTAIN_ADDITIVE_HEIGHT - OCEAN_BIOME_OPEN_COASTAL_BLEND_HALF_WIDTH_METERS,
      OCEAN_BIOME_OPEN_MAX_MOUNTAIN_ADDITIVE_HEIGHT + OCEAN_BIOME_OPEN_COASTAL_BLEND_HALF_WIDTH_METERS,
      centerMountainAdditiveHeight
    );
    const coastalToLand = smoothstep(
      OCEAN_BIOME_COASTAL_MAX_MOUNTAIN_ADDITIVE_HEIGHT - OCEAN_BIOME_LAND_BLEND_HALF_WIDTH_METERS,
      OCEAN_BIOME_COASTAL_MAX_MOUNTAIN_ADDITIVE_HEIGHT + OCEAN_BIOME_LAND_BLEND_HALF_WIDTH_METERS,
      centerMountainAdditiveHeight
    );
    oceanOpenWeight = 1 - openToCoastal;
    oceanCoastalWeight = openToCoastal * (1 - coastalToLand);
    landWeight = openToCoastal * coastalToLand;
  }
  [oceanOpenWeight, oceanCoastalWeight, landWeight] = normalizeWeightTriplet(
    oceanOpenWeight,
    oceanCoastalWeight,
    landWeight
  );
  const deepOceanAllowance =
    oceanOpenWeight > 0.0001 && midW > 0.0001
      ? getDeepOceanAllowance(centerMountainAdditiveHeight, centerMountainRangeMask)
      : 1;

  target.count = 0;
  const categoryWeights = [coldW, temperateW, hotW];
  const categoryKeys = ["cold", "temperate", "hot"];
  const variantWeights = [lowW, midW, highW];
  const humidityWeights = [xericW, mesicW, hydricW];
  for (let ci = 0; ci < categoryKeys.length; ci += 1) {
    const cWeight = categoryWeights[ci];
    if (!(cWeight > 0.0001)) continue;
    const variants = BIOME_VARIANTS[categoryKeys[ci]];
    for (let vi = 0; vi < variants.length; vi += 1) {
      const variantWeight = variantWeights[vi];
      if (!(variantWeight > 0.0001)) continue;
      const climateWeight = cWeight * variantWeight;
      if (!(climateWeight > 0.0001)) continue;
      const categoryKey = categoryKeys[ci];

      if (oceanOpenWeight > 0.0001) {
        const openBiome = getOceanBiome("open", categoryKey, vi);
        const openWeight = climateWeight * oceanOpenWeight;
        if (openBiome && openWeight > 0.0001) {
          if (deepOceanAllowance < 0.9999 && isDeepOpenOceanBiome(openBiome)) {
            const deepWeight = openWeight * deepOceanAllowance;
            const bufferedWeight = openWeight - deepWeight;
            if (deepWeight > 0.0001) upsertBiomeBlendEntry(target, openBiome, deepWeight);
            if (bufferedWeight > 0.0001) {
              const bufferedBiome = getOceanBiome("open", categoryKey, 0) || openBiome;
              upsertBiomeBlendEntry(target, bufferedBiome, bufferedWeight);
            }
          } else {
            upsertBiomeBlendEntry(target, openBiome, openWeight);
          }
        }
      }

      if (oceanCoastalWeight > 0.0001) {
        const coastalBiome = getOceanBiome("coastal", categoryKey, vi);
        if (coastalBiome) upsertBiomeBlendEntry(target, coastalBiome, climateWeight * oceanCoastalWeight);
      }

      if (landWeight > 0.0001) {
        const baseBiome = BIOME_DEFS[variants[vi]];
        if (!baseBiome) continue;
        for (let hi = 0; hi < humidityWeights.length; hi += 1) {
          const humidityWeight = humidityWeights[hi];
          if (!(humidityWeight > 0.0001)) continue;
          const weight = climateWeight * humidityWeight * landWeight;
          if (!(weight > 0.0001)) continue;
          const humidityBand = HUMIDITY_ZONE_KEYS[hi];
          upsertBiomeBlendEntry(target, getHumidityMappedBiome(baseBiome, humidityBand), weight);
        }
      }
    }
  }
  if (target.count === 0) {
    setSingleBiomeBlendResult(target, dominantBiome);
    return finalizeBiomeBlendAt(x, z, target);
  }
  normalizeBiomeBlendResult(target);
  return finalizeBiomeBlendAt(x, z, target);
}

const terrainColorBlendScratch = createBiomeBlendSampleResult();
const visualBlendScratch = createBiomeBlendSampleResult();
const tempTerrainBlendColor = new THREE.Color();
const tempWaterBlendColor = new THREE.Color();
const tempFogBlendColor = new THREE.Color();
const tempFogLookupColor = new THREE.Color();
const tempWaterLookupColor = new THREE.Color();
const blendedVisualStateScratch = {
  fogColor: tempFogBlendColor,
  waterColor: tempWaterBlendColor,
  fogDensity: 0,
  biome: null,
};

const heightAt = createTerrainHeightSampler({
  getNoiseSeed: () => noiseSeed,
  getTerrain: () => state.world.terrain,
  getWaterLevel: () => state.world.water.level,
  terrainHorizontalScale: TERRAIN_HORIZONTAL_SCALE,
  sampleBiomeTerrainBlend: (x, z, target) => fillBiomeBlendSample(x, z, target),
  getBiomeTerrainProfile,
  getDefaultBiomeTerrainProfile: () => getBiomeTerrainProfile(BIOME_DEFS[DEFAULT_TRANSITION_BIOME_ID]),
  biomeEdgeSmooth: { start: BIOME_EDGE_SMOOTH_START_METERS, max: BIOME_EDGE_SMOOTH_MAX_METERS },
});
heightAt.mountainBiomeThresholdMeters = 100;

function getBiomeAt(x, z) {
  const climate = sampleBiomeClimateFields(x, z);
  const category = getTemperatureCategoryFromValue(climate.temperature);
  const humidityBand = getHumidityBandKey(climate.humidity);
  const index = Math.min(2, Math.floor(climate.selector * 3));
  const mountainSample = fillTerrainAdditiveSampleAt(x, z, mountainBiomeAdditiveScratch);
  const mountainAdditiveHeight = mountainSample.mountainAdditiveHeight || 0;
  const mountainRangeMask = mountainSample.rangeMask || 0;
  const oceanRegime = getOceanRegimeFromMountainAdditiveHeight(mountainAdditiveHeight);
  if (oceanRegime !== "land") {
    const oceanBiome = getOceanBiome(oceanRegime, category, index);
    if (oceanRegime === "open" && isDeepOpenOceanBiome(oceanBiome)) {
      const deepAllowance = getDeepOceanAllowance(mountainAdditiveHeight, mountainRangeMask);
      if (deepAllowance < 0.5) {
        return getOceanBiome("open", category, 0) || oceanBiome || BIOME_DEFS.ocean || BIOME_DEFS.meadow;
      }
    }
    return oceanBiome || BIOME_DEFS.ocean || BIOME_DEFS.meadow;
  }

  const variants = BIOME_VARIANTS[category];
  const baseBiome = getHumidityMappedBiome(BIOME_DEFS[variants[index]], humidityBand);
  const mountainAdjusted = getBiomeWithMountainVariantAt(x, z, baseBiome);
  let wetlandAdjusted = mountainAdjusted;
  if (mountainAdjusted?.wetlandRetentionGroup === "wetland" && shouldDemoteWetlandAt(x, z)) {
    const fallbackHumidityBand = mountainAdjusted.humidityBand || humidityBand;
    const fallbackId = BIOME_HUMIDITY_LOOKUP.meadow?.[fallbackHumidityBand] || "meadow";
    wetlandAdjusted = BIOME_DEFS[fallbackId] || BIOME_DEFS.meadow;
  }
  const highAltitudeAdjusted = getBiomeWithHighAltitudeVariantAt(x, z, wetlandAdjusted, category, humidityBand);
  return getBumpySubdividedBiomeForPoint(x, z, highAltitudeAdjusted);
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
    y: groundY,
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
    player.position.set(0, heightAt(0, 0), 0);
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
      const d2 = dx * dx + dz * dz;
      if (d2 > CHUNK_RADIUS * CHUNK_RADIUS) continue;
      const key = `${cx + dx},${cz + dz}`;
      if (!chunks.has(key)) {
        const mesh = buildChunk(cx + dx, cz + dz);
        worldGroup.add(mesh);
        chunks.set(key, mesh);
      }
      ensureTreeChunk(cx + dx, cz + dz, key);
    }
  }

  const chunkKeepRadiusSq = (CHUNK_RADIUS + 1) * (CHUNK_RADIUS + 1);
  for (const [key, mesh] of chunks.entries()) {
    const [x, z] = key.split(",").map(Number);
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz > chunkKeepRadiusSq) {
      worldGroup.remove(mesh);
      mesh.geometry.dispose();
      const treeGroup = treeChunks.get(key);
      if (treeGroup) {
        worldGroup.remove(treeGroup);
      }
      treeChunks.delete(key);
      chunks.delete(key);
    }
  }
}

function buildChunkCoordinateQueue(cx, cz, radius = CHUNK_RADIUS) {
  const coords = [];
  const playerX = player.position.x;
  const playerZ = player.position.z;
  const radiusMeters = radius * CHUNK_SIZE;
  const radiusSq = radiusMeters * radiusMeters;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const tileX = cx + dx;
      const tileZ = cz + dz;
      const centerX = tileX * CHUNK_SIZE - playerX;
      const centerZ = tileZ * CHUNK_SIZE - playerZ;
      const d2 = centerX * centerX + centerZ * centerZ;
      if (d2 > radiusSq) continue;
      coords.push({ x: tileX, z: tileZ, d2 });
    }
  }
  coords.sort((a, b) => a.d2 - b.d2);
  return coords;
}

function buildMidTileCoordinateQueue(cx, cz, radius = MID_TILE_RADIUS) {
  const coords = [];
  const outerRadiusSq = MID_TILE_CULL_RADIUS * MID_TILE_CULL_RADIUS;
  const playerX = player.position.x;
  const playerZ = player.position.z;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const tileX = cx + dx;
      const tileZ = cz + dz;
      const centerX = tileX * MID_TILE_SIZE - playerX;
      const centerZ = tileZ * MID_TILE_SIZE - playerZ;
      const d2 = centerX * centerX + centerZ * centerZ;
      if (d2 > outerRadiusSq) continue;
      coords.push({ x: tileX, z: tileZ, d2 });
    }
  }
  coords.sort((a, b) => a.d2 - b.d2);
  return coords;
}

function buildFarTileCoordinateQueue(cx, cz, radius = FAR_TILE_RADIUS) {
  const coords = [];
  const outerRadiusSq = FAR_TILE_CULL_RADIUS * FAR_TILE_CULL_RADIUS;
  const playerX = player.position.x;
  const playerZ = player.position.z;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const tileX = cx + dx;
      const tileZ = cz + dz;
      const centerX = tileX * FAR_TILE_SIZE - playerX;
      const centerZ = tileZ * FAR_TILE_SIZE - playerZ;
      const d2 = centerX * centerX + centerZ * centerZ;
      if (d2 > outerRadiusSq) continue;
      coords.push({ x: tileX, z: tileZ, d2 });
    }
  }
  coords.sort((a, b) => a.d2 - b.d2);
  return coords;
}

function ensureChunksIncremental(cx, cz, options = {}) {
  const jobId = ++activeChunkBuildJobId;
  const queue = buildChunkCoordinateQueue(cx, cz, CHUNK_RADIUS);
  const total = queue.length;
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 4));
  let index = 0;

  const step = () => {
    if (jobId !== activeChunkBuildJobId) return;
    const end = Math.min(total, index + batchSize);
    for (; index < end; index += 1) {
      const { x, z } = queue[index];
      const key = `${x},${z}`;
      if (!chunks.has(key)) {
        const mesh = buildChunk(x, z);
        worldGroup.add(mesh);
        chunks.set(key, mesh);
      }
      ensureTreeChunk(x, z, key);
    }

    if (typeof options.onProgress === "function") {
      options.onProgress(index, total, jobId);
    }

    if (index < total) {
      requestAnimationFrame(step);
      return;
    }

    const playerX = player.position.x;
    const playerZ = player.position.z;
    const chunkKeepRadiusMeters = (CHUNK_RADIUS + 1) * CHUNK_SIZE;
    const chunkKeepRadiusSq = chunkKeepRadiusMeters * chunkKeepRadiusMeters;
    for (const [key, mesh] of chunks.entries()) {
      const [x, z] = key.split(",").map(Number);
      const centerX = x * CHUNK_SIZE - playerX;
      const centerZ = z * CHUNK_SIZE - playerZ;
      const d2 = centerX * centerX + centerZ * centerZ;
      if (d2 > chunkKeepRadiusSq) {
        worldGroup.remove(mesh);
        mesh.geometry.dispose();
        const treeGroup = treeChunks.get(key);
        if (treeGroup) {
          worldGroup.remove(treeGroup);
        }
        treeChunks.delete(key);
        chunks.delete(key);
      }
    }

    if (typeof options.onComplete === "function") {
      options.onComplete(jobId);
    }
  };

  requestAnimationFrame(step);
  return jobId;
}

function ensureMidTerrainIncremental(cx, cz, options = {}) {
  const jobId = ++activeMidBuildJobId;
  const queue = buildMidTileCoordinateQueue(cx, cz, MID_TILE_RADIUS);
  const total = queue.length;
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 3));
  let index = 0;

  const step = () => {
    if (jobId !== activeMidBuildJobId) return;
    const end = Math.min(total, index + batchSize);
    for (; index < end; index += 1) {
      const { x, z } = queue[index];
      const key = `${x},${z}`;
      if (!midTiles.has(key)) {
        const mesh = buildMidTile(x, z);
        if (MID_TILE_INNER_CULL_RADIUS > 0) {
          const dx = x * MID_TILE_SIZE - player.position.x;
          const dz = z * MID_TILE_SIZE - player.position.z;
          mesh.visible = dx * dx + dz * dz > MID_TILE_INNER_CULL_RADIUS * MID_TILE_INNER_CULL_RADIUS;
        }
        worldGroup.add(mesh);
        midTiles.set(key, mesh);
      }
    }

    if (typeof options.onProgress === "function") {
      options.onProgress(index, total, jobId);
    }

    if (index < total) {
      requestAnimationFrame(step);
      return;
    }

    const outerKeepRadiusSq = MID_TILE_KEEP_RADIUS * MID_TILE_KEEP_RADIUS;
    const innerRadiusSq = MID_TILE_INNER_CULL_RADIUS * MID_TILE_INNER_CULL_RADIUS;
    const playerX = player.position.x;
    const playerZ = player.position.z;
    for (const [key, mesh] of midTiles.entries()) {
      const [x, z] = key.split(",").map(Number);
      const centerX = x * MID_TILE_SIZE - playerX;
      const centerZ = z * MID_TILE_SIZE - playerZ;
      const d2 = centerX * centerX + centerZ * centerZ;
      if (d2 > outerKeepRadiusSq) {
        worldGroup.remove(mesh);
        mesh.geometry.dispose();
        midTiles.delete(key);
        continue;
      }
      if (innerRadiusSq > 0) {
        mesh.visible = d2 > innerRadiusSq;
      }
    }

    if (typeof options.onComplete === "function") {
      options.onComplete(jobId);
    }
  };

  requestAnimationFrame(step);
  return jobId;
}

function ensureFarTerrainIncremental(cx, cz, options = {}) {
  const jobId = ++activeFarBuildJobId;
  const queue = buildFarTileCoordinateQueue(cx, cz, FAR_TILE_RADIUS);
  const total = queue.length;
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 2));
  let index = 0;

  const step = () => {
    if (jobId !== activeFarBuildJobId) return;
    const end = Math.min(total, index + batchSize);
    for (; index < end; index += 1) {
      const { x, z } = queue[index];
      const key = `${x},${z}`;
      if (!farTiles.has(key)) {
        const mesh = buildFarTile(x, z);
        if (FAR_TILE_INNER_CULL_RADIUS > 0) {
          const dx = x * FAR_TILE_SIZE - player.position.x;
          const dz = z * FAR_TILE_SIZE - player.position.z;
          mesh.visible = dx * dx + dz * dz > FAR_TILE_INNER_CULL_RADIUS * FAR_TILE_INNER_CULL_RADIUS;
        }
        worldGroup.add(mesh);
        farTiles.set(key, mesh);
      }
    }

    if (typeof options.onProgress === "function") {
      options.onProgress(index, total, jobId);
    }

    if (index < total) {
      requestAnimationFrame(step);
      return;
    }

    const outerKeepRadiusSq = FAR_TILE_KEEP_RADIUS * FAR_TILE_KEEP_RADIUS;
    const innerRadiusSq = FAR_TILE_INNER_CULL_RADIUS * FAR_TILE_INNER_CULL_RADIUS;
    const playerX = player.position.x;
    const playerZ = player.position.z;
    for (const [key, mesh] of farTiles.entries()) {
      const [x, z] = key.split(",").map(Number);
      const centerX = x * FAR_TILE_SIZE - playerX;
      const centerZ = z * FAR_TILE_SIZE - playerZ;
      const d2 = centerX * centerX + centerZ * centerZ;
      if (d2 > outerKeepRadiusSq) {
        worldGroup.remove(mesh);
        mesh.geometry.dispose();
        farTiles.delete(key);
        continue;
      }
      if (innerRadiusSq > 0) {
        mesh.visible = d2 > innerRadiusSq;
      }
    }

    if (typeof options.onComplete === "function") {
      options.onComplete(jobId);
    }
  };

  requestAnimationFrame(step);
  return jobId;
}

function ensureChunksRuntimeIncremental(cx, cz) {
  const target = { x: cx, z: cz };
  runtimeChunkBuildQueuedTarget = target;
  if (runtimeChunkBuildAppliedTarget && runtimeChunkBuildAppliedTarget.x === cx && runtimeChunkBuildAppliedTarget.z === cz) {
    return;
  }
  if (chunkBuildInProgress) {
    return;
  }
  if (runtimeChunkBuildRunning) {
    return;
  }

  const jobId = ++runtimeChunkBuildJobId;
  const runTarget = target;
  runtimeChunkBuildRunning = true;
  ensureChunksIncremental(runTarget.x, runTarget.z, {
    batchSize: 4,
    onComplete() {
      if (jobId !== runtimeChunkBuildJobId) return;
      runtimeChunkBuildRunning = false;
      runtimeChunkBuildAppliedTarget = runTarget;
      if (
        runtimeChunkBuildQueuedTarget &&
        (runtimeChunkBuildQueuedTarget.x !== runTarget.x || runtimeChunkBuildQueuedTarget.z !== runTarget.z)
      ) {
        ensureChunksRuntimeIncremental(runtimeChunkBuildQueuedTarget.x, runtimeChunkBuildQueuedTarget.z);
      }
    },
  });
}

function ensureMidTerrainRuntimeIncremental(cx, cz) {
  const target = { x: cx, z: cz };
  runtimeMidBuildQueuedTarget = target;
  if (runtimeMidBuildAppliedTarget && runtimeMidBuildAppliedTarget.x === cx && runtimeMidBuildAppliedTarget.z === cz) {
    return;
  }
  if (chunkBuildInProgress) {
    return;
  }
  if (runtimeMidBuildRunning) {
    return;
  }

  const jobId = ++runtimeMidBuildJobId;
  const runTarget = target;
  runtimeMidBuildRunning = true;
  ensureMidTerrainIncremental(runTarget.x, runTarget.z, {
    batchSize: 3,
    onComplete() {
      if (jobId !== runtimeMidBuildJobId) return;
      runtimeMidBuildRunning = false;
      runtimeMidBuildAppliedTarget = runTarget;
      if (
        runtimeMidBuildQueuedTarget &&
        (runtimeMidBuildQueuedTarget.x !== runTarget.x || runtimeMidBuildQueuedTarget.z !== runTarget.z)
      ) {
        ensureMidTerrainRuntimeIncremental(runtimeMidBuildQueuedTarget.x, runtimeMidBuildQueuedTarget.z);
      }
    },
  });
}

function ensureFarTerrainRuntimeIncremental(cx, cz) {
  const target = { x: cx, z: cz };
  runtimeFarBuildQueuedTarget = target;
  if (runtimeFarBuildAppliedTarget && runtimeFarBuildAppliedTarget.x === cx && runtimeFarBuildAppliedTarget.z === cz) {
    return;
  }
  if (chunkBuildInProgress) {
    return;
  }
  if (runtimeFarBuildRunning) {
    return;
  }

  const jobId = ++runtimeFarBuildJobId;
  const runTarget = target;
  runtimeFarBuildRunning = true;
  ensureFarTerrainIncremental(runTarget.x, runTarget.z, {
    batchSize: 2,
    onComplete() {
      if (jobId !== runtimeFarBuildJobId) return;
      runtimeFarBuildRunning = false;
      runtimeFarBuildAppliedTarget = runTarget;
      if (
        runtimeFarBuildQueuedTarget &&
        (runtimeFarBuildQueuedTarget.x !== runTarget.x || runtimeFarBuildQueuedTarget.z !== runTarget.z)
      ) {
        ensureFarTerrainRuntimeIncremental(runtimeFarBuildQueuedTarget.x, runtimeFarBuildQueuedTarget.z);
      }
    },
  });
}

function clearChunks() {
  chunks.forEach((mesh) => {
    worldGroup.remove(mesh);
    mesh.geometry.dispose();
  });
  chunks.clear();
  treeChunks.forEach((treeGroup) => {
          worldGroup.remove(treeGroup);
  });
  treeChunks.clear();
}

function clearFarTerrain() {
  farTiles.forEach((mesh) => {
    worldGroup.remove(mesh);
    mesh.geometry.dispose();
  });
  farTiles.clear();
  runtimeFarBuildAppliedTarget = null;
  runtimeFarBuildQueuedTarget = null;
  runtimeFarBuildRunning = false;
  runtimeFarBuildJobId += 1;
  activeFarBuildJobId += 1;
}

function clearMidTerrain() {
  midTiles.forEach((mesh) => {
    worldGroup.remove(mesh);
    mesh.geometry.dispose();
  });
  midTiles.clear();
  runtimeMidBuildAppliedTarget = null;
  runtimeMidBuildQueuedTarget = null;
  runtimeMidBuildRunning = false;
  runtimeMidBuildJobId += 1;
  activeMidBuildJobId += 1;
}

function rebuildTerrain() {
  clearChunks();
  clearMidTerrain();
  clearFarTerrain();
  const cx = Math.floor(player.position.x / CHUNK_SIZE);
  const cz = Math.floor(player.position.z / CHUNK_SIZE);
  beginChunkBuildUi("rebuild", "Rebuilding terrain chunks (0%)");
  ensureChunksIncremental(cx, cz, {
    batchSize: 3,
    onProgress(done, total) {
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      setStartupLoadingMessage("Loading...", `Rebuilding terrain chunks (${pct}%)`);
    },
    onComplete() {
      rebuildLandmarks();
      finishChunkBuildUi("rebuild");
      ensureMidTerrainRuntimeIncremental(Math.floor(player.position.x / MID_TILE_SIZE), Math.floor(player.position.z / MID_TILE_SIZE));
      ensureFarTerrainRuntimeIncremental(Math.floor(player.position.x / FAR_TILE_SIZE), Math.floor(player.position.z / FAR_TILE_SIZE));
    },
  });
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
    if (existing) worldGroup.remove(existing);
    treeChunks.delete(key);
    return;
  }
  if (treeChunks.has(key)) return;
  const group = buildTreeChunk(cx, cz);
  if (!group) return;
  worldGroup.add(group);
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
    const treeStyle = biome.treeStyle ?? "broadleaf";
    const trunkHeightScale =
      treeStyle === "shrubland"
        ? 0.56
        : treeStyle === "thorn"
          ? 0.74
          : treeStyle === "muskeg"
            ? 0.82
            : treeStyle === "rainforest" || treeStyle === "monsoon"
              ? 1.18
              : 1;
    const trunkWidthScale = treeStyle === "shrubland" ? 1.0 : treeStyle === "thorn" ? 1.2 : 1.5;
    const trunk = new THREE.Mesh(treeTrunkGeometry, materialSet.trunk);
    trunk.position.set(worldX, groundY + 2.0 * scale * trunkHeightScale, worldZ);
    trunk.scale.set(trunkWidthScale * scale, scale * trunkHeightScale, trunkWidthScale * scale);
    trunk.receiveShadow = true;
    trunk.castShadow = scale > 0.92;
    trunk.renderOrder = TREE_RENDER_ORDER;
    group.add(trunk);

    const canopyMaterial =
      materialSet.canopies[Math.floor(hash2(cx * 181 + i * 9 + 17, cz * 223 + i * 13 + 43) * materialSet.canopies.length)];
    const variant = Math.floor(hash2(cx * 131 + i * 7 + 31, cz * 197 + i * 5 + 61) * 3);

    if (treeStyle === "conifer" || treeStyle === "subalpine") {
      const canopy = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      canopy.position.set(worldX, groundY + 5.8 * scale * trunkHeightScale, worldZ);
      canopy.scale.set(2.05 * scale, 1.15 * scale, 2.05 * scale);
      canopy.receiveShadow = true;
      canopy.castShadow = scale > 0.96;
      canopy.renderOrder = TREE_RENDER_ORDER;
      group.add(canopy);
      const upper = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      upper.position.set(worldX, groundY + 7.3 * scale * trunkHeightScale, worldZ);
      upper.scale.set(1.28 * scale, 0.72 * scale, 1.28 * scale);
      upper.receiveShadow = true;
      upper.castShadow = false;
      upper.renderOrder = TREE_RENDER_ORDER;
      group.add(upper);
    } else if (treeStyle === "savanna") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX + 0.08 * scale, groundY + 5.35 * scale, worldZ - 0.06 * scale);
      canopyMain.scale.set(1.9 * scale, 0.56 * scale, 1.65 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 1;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      if (variant !== 0) {
        const canopySide = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
        canopySide.position.set(worldX - 0.85 * scale, groundY + 5.25 * scale, worldZ + 0.45 * scale);
        canopySide.scale.set(0.92 * scale, 0.42 * scale, 0.84 * scale);
        canopySide.receiveShadow = true;
        canopySide.castShadow = false;
        canopySide.renderOrder = TREE_RENDER_ORDER;
        group.add(canopySide);
      }
    } else if (treeStyle === "rainforest" || treeStyle === "monsoon") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 6.95 * scale, worldZ);
      canopyMain.scale.set(1.85 * scale, 1.34 * scale, 1.85 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.9;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      const canopyUpper = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyUpper.position.set(worldX - 0.2 * scale, groundY + 8.15 * scale, worldZ + 0.14 * scale);
      canopyUpper.scale.set(1.08 * scale, 0.84 * scale, 1.08 * scale);
      canopyUpper.receiveShadow = true;
      canopyUpper.castShadow = false;
      canopyUpper.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyUpper);

      if (variant !== 0 || treeStyle === "monsoon") {
        const flank = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
        flank.position.set(worldX + 0.86 * scale, groundY + 6.55 * scale, worldZ - 0.65 * scale);
        flank.scale.set(0.9 * scale, 0.64 * scale, 0.9 * scale);
        flank.receiveShadow = true;
        flank.castShadow = false;
        flank.renderOrder = TREE_RENDER_ORDER;
        group.add(flank);
      }
    } else if (treeStyle === "woodland") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 5.75 * scale, worldZ);
      canopyMain.scale.set(1.56 * scale, 0.82 * scale, 1.56 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.94;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      if (variant === 2) {
        const canopySide = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
        canopySide.position.set(worldX - 0.62 * scale, groundY + 5.38 * scale, worldZ + 0.42 * scale);
        canopySide.scale.set(0.76 * scale, 0.4 * scale, 0.76 * scale);
        canopySide.receiveShadow = true;
        canopySide.castShadow = false;
        canopySide.renderOrder = TREE_RENDER_ORDER;
        group.add(canopySide);
      }
    } else if (treeStyle === "wetland") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 6.0 * scale, worldZ);
      canopyMain.scale.set(1.68 * scale, 1.02 * scale, 1.68 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.92;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      const droop = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      droop.position.set(worldX, groundY + 4.85 * scale, worldZ);
      droop.scale.set(1.65 * scale, 0.6 * scale, 1.65 * scale);
      droop.receiveShadow = true;
      droop.castShadow = false;
      droop.renderOrder = TREE_RENDER_ORDER;
      group.add(droop);
    } else if (treeStyle === "shrubland") {
      const shrubA = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      shrubA.position.set(worldX, groundY + 3.2 * scale, worldZ);
      shrubA.scale.set(1.24 * scale, 0.54 * scale, 1.24 * scale);
      shrubA.receiveShadow = true;
      shrubA.castShadow = false;
      shrubA.renderOrder = TREE_RENDER_ORDER;
      group.add(shrubA);

      if (variant !== 1) {
        const shrubB = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
        shrubB.position.set(worldX + 0.46 * scale, groundY + 3.0 * scale, worldZ - 0.38 * scale);
        shrubB.scale.set(0.84 * scale, 0.34 * scale, 0.84 * scale);
        shrubB.receiveShadow = true;
        shrubB.castShadow = false;
        shrubB.renderOrder = TREE_RENDER_ORDER;
        group.add(shrubB);
      }
    } else if (treeStyle === "thorn") {
      const canopyMain = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 4.95 * scale, worldZ);
      canopyMain.scale.set(1.08 * scale, 0.86 * scale, 1.08 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.96;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      const thornSpire = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      thornSpire.position.set(worldX + 0.16 * scale, groundY + 6.1 * scale, worldZ - 0.12 * scale);
      thornSpire.scale.set(0.52 * scale, 0.66 * scale, 0.52 * scale);
      thornSpire.receiveShadow = true;
      thornSpire.castShadow = false;
      thornSpire.renderOrder = TREE_RENDER_ORDER;
      group.add(thornSpire);
    } else if (treeStyle === "cloudforest") {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 6.4 * scale, worldZ);
      canopyMain.scale.set(1.72 * scale, 1.08 * scale, 1.72 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.9;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      const mossCape = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      mossCape.position.set(worldX, groundY + 5.05 * scale, worldZ);
      mossCape.scale.set(1.52 * scale, 0.52 * scale, 1.52 * scale);
      mossCape.receiveShadow = true;
      mossCape.castShadow = false;
      mossCape.renderOrder = TREE_RENDER_ORDER;
      group.add(mossCape);

      if (variant === 2) {
        const upper = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
        upper.position.set(worldX - 0.08 * scale, groundY + 7.65 * scale, worldZ + 0.1 * scale);
        upper.scale.set(0.88 * scale, 0.56 * scale, 0.88 * scale);
        upper.receiveShadow = true;
        upper.castShadow = false;
        upper.renderOrder = TREE_RENDER_ORDER;
        group.add(upper);
      }
    } else if (treeStyle === "muskeg") {
      const canopy = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      canopy.position.set(worldX, groundY + 4.7 * scale, worldZ);
      canopy.scale.set(1.32 * scale, 0.82 * scale, 1.32 * scale);
      canopy.receiveShadow = true;
      canopy.castShadow = scale > 1.02;
      canopy.renderOrder = TREE_RENDER_ORDER;
      group.add(canopy);

      if (variant !== 0) {
        const side = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
        side.position.set(worldX - 0.48 * scale, groundY + 4.35 * scale, worldZ + 0.34 * scale);
        side.scale.set(0.56 * scale, 0.36 * scale, 0.56 * scale);
        side.receiveShadow = true;
        side.castShadow = false;
        side.renderOrder = TREE_RENDER_ORDER;
        group.add(side);
      }
    } else if (variant === 1) {
      const canopyMain = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyMain.position.set(worldX, groundY + 6.1 * scale, worldZ);
      canopyMain.scale.set(1.5 * scale, 1.16 * scale, 1.5 * scale);
      canopyMain.receiveShadow = true;
      canopyMain.castShadow = scale > 0.92;
      canopyMain.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyMain);

      const canopyCap = new THREE.Mesh(treeCanopySphereGeometry, canopyMaterial);
      canopyCap.position.set(worldX + 0.25 * scale, groundY + 7.3 * scale, worldZ - 0.18 * scale);
      canopyCap.scale.set(0.84 * scale, 0.68 * scale, 0.84 * scale);
      canopyCap.receiveShadow = true;
      canopyCap.castShadow = false;
      canopyCap.renderOrder = TREE_RENDER_ORDER;
      group.add(canopyCap);
    } else {
      const lower = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      lower.position.set(worldX, groundY + 5.1 * scale, worldZ);
      lower.scale.set(1.9 * scale, 0.88 * scale, 1.9 * scale);
      lower.receiveShadow = true;
      lower.castShadow = scale > 1.0;
      lower.renderOrder = TREE_RENDER_ORDER;
      group.add(lower);

      const upper = new THREE.Mesh(treeCanopyConeGeometry, canopyMaterial);
      upper.position.set(worldX, groundY + 7.0 * scale, worldZ);
      upper.scale.set(1.2 * scale, 0.78 * scale, 1.2 * scale);
      upper.receiveShadow = true;
      upper.castShadow = false;
      upper.renderOrder = TREE_RENDER_ORDER;
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
  const detailBiomeFades = new Float32Array(vertices.count);
  const heightGrid = new Float32Array(CHUNK_GRID_STRIDE * CHUNK_GRID_STRIDE);
  const colorGrid = new Float32Array(CHUNK_GRID_STRIDE * CHUNK_GRID_STRIDE * 3);
  const chunkBiomeBlendScratch = createBiomeBlendSampleResult();
  for (let i = 0; i < vertices.count; i += 1) {
    const localX = vertices.getX(i);
    const localZ = vertices.getZ(i);
    const x = localX + cx * CHUNK_SIZE;
    const z = localZ + cz * CHUNK_SIZE;
    const blend = fillBiomeBlendSample(x, z, chunkBiomeBlendScratch);
    const y =
      typeof heightAt.sampleWithBiomeBlend === "function"
        ? heightAt.sampleWithBiomeBlend(x, z, blend)
        : heightAt(x, z);
    vertices.setY(i, y);
    const gx = clampNumber(Math.round((localX + CHUNK_SIZE * 0.5) / CHUNK_CELL_SIZE), 0, CHUNK_RES, 0);
    const gz = clampNumber(Math.round((localZ + CHUNK_SIZE * 0.5) / CHUNK_CELL_SIZE), 0, CHUNK_RES, 0);
    heightGrid[gz * CHUNK_GRID_STRIDE + gx] = y;
    const biome = blend.dominantBiome || getBiomeAt(x, z);
    const color = fillTerrainColorFromBiomeBlend(blend);
    const n = hash2(Math.floor(x * 0.5), Math.floor(z * 0.5));
    const brighten = 0.93 + n * 0.14;
    colors[i * 3] = color.r * brighten;
    colors[i * 3 + 1] = color.g * brighten;
    colors[i * 3 + 2] = color.b * brighten;
    const gridIndex = (gz * CHUNK_GRID_STRIDE + gx) * 3;
    colorGrid[gridIndex] = colors[i * 3];
    colorGrid[gridIndex + 1] = colors[i * 3 + 1];
    colorGrid[gridIndex + 2] = colors[i * 3 + 2];
    detailBiomes[i] = getTerrainDetailBiomeId(biome);
    detailBiomeFades[i] = getTerrainDetailBiomeFadeFromBlend(blend);
  }
  vertices.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("detailBiome", new THREE.BufferAttribute(detailBiomes, 1));
  geometry.setAttribute("detailBiomeFade", new THREE.BufferAttribute(detailBiomeFades, 1));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, terrainMaterial);
  mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.renderOrder = 1;
  mesh.userData.heightGrid = heightGrid;
  mesh.userData.colorGrid = colorGrid;
  mesh.userData.gridStride = CHUNK_GRID_STRIDE;
  mesh.userData.tileSize = CHUNK_SIZE;
  mesh.userData.tileRes = CHUNK_RES;
  mesh.userData.chunkCoordX = cx;
  mesh.userData.chunkCoordZ = cz;
  return mesh;
}

function buildFarTile(cx, cz) {
  const geometry = new THREE.PlaneGeometry(FAR_TILE_SIZE, FAR_TILE_SIZE, FAR_TILE_RES, FAR_TILE_RES);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position;
  const colors = new Float32Array(vertices.count * 3);
  const detailBiomes = new Float32Array(vertices.count);
  const detailBiomeFades = new Float32Array(vertices.count);
  const tileStride = FAR_TILE_RES + 1;
  const cellSize = FAR_TILE_SIZE / FAR_TILE_RES;
  const colorGrid = new Float32Array(tileStride * tileStride * 3);
  const heightGrid = new Float32Array(tileStride * tileStride);
  const tileBiomeBlendScratch = createBiomeBlendSampleResult();
  for (let i = 0; i < vertices.count; i += 1) {
    const localX = vertices.getX(i);
    const localZ = vertices.getZ(i);
    const gx = clampNumber(Math.round((localX + FAR_TILE_SIZE * 0.5) / cellSize), 0, FAR_TILE_RES, 0);
    const gz = clampNumber(Math.round((localZ + FAR_TILE_SIZE * 0.5) / cellSize), 0, FAR_TILE_RES, 0);
    const x = localX + cx * FAR_TILE_SIZE;
    const z = localZ + cz * FAR_TILE_SIZE;
    const blend = fillBiomeBlendSample(x, z, tileBiomeBlendScratch);
    const y =
      typeof heightAt.sampleWithBiomeBlend === "function"
        ? heightAt.sampleWithBiomeBlend(x, z, blend)
        : heightAt(x, z);
    vertices.setY(i, y);
    heightGrid[gz * tileStride + gx] = y;
    const biome = blend.dominantBiome || getBiomeAt(x, z);
    const color = fillTerrainColorFromBiomeBlend(blend);
    const n = hash2(Math.floor(x * 0.5), Math.floor(z * 0.5));
    const brighten = 0.93 + n * 0.14;
    colors[i * 3] = color.r * brighten;
    colors[i * 3 + 1] = color.g * brighten;
    colors[i * 3 + 2] = color.b * brighten;
    const gridIndex = (gz * tileStride + gx) * 3;
    colorGrid[gridIndex] = colors[i * 3];
    colorGrid[gridIndex + 1] = colors[i * 3 + 1];
    colorGrid[gridIndex + 2] = colors[i * 3 + 2];
    detailBiomes[i] = getTerrainDetailBiomeId(biome);
    detailBiomeFades[i] = getTerrainDetailBiomeFadeFromBlend(blend);
  }
  vertices.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("detailBiome", new THREE.BufferAttribute(detailBiomes, 1));
  geometry.setAttribute("detailBiomeFade", new THREE.BufferAttribute(detailBiomeFades, 1));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, farTerrainMaterial);
  mesh.position.set(cx * FAR_TILE_SIZE, 0, cz * FAR_TILE_SIZE);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = 0;
  mesh.userData.colorGrid = colorGrid;
  mesh.userData.heightGrid = heightGrid;
  mesh.userData.gridStride = tileStride;
  mesh.userData.tileSize = FAR_TILE_SIZE;
  mesh.userData.tileRes = FAR_TILE_RES;
  return mesh;
}

function buildMidTile(cx, cz) {
  const geometry = new THREE.PlaneGeometry(MID_TILE_SIZE, MID_TILE_SIZE, MID_TILE_RES, MID_TILE_RES);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position;
  const colors = new Float32Array(vertices.count * 3);
  const detailBiomes = new Float32Array(vertices.count);
  const detailBiomeFades = new Float32Array(vertices.count);
  const tileStride = MID_TILE_RES + 1;
  const cellSize = MID_TILE_SIZE / MID_TILE_RES;
  const colorGrid = new Float32Array(tileStride * tileStride * 3);
  const heightGrid = new Float32Array(tileStride * tileStride);
  const tileBiomeBlendScratch = createBiomeBlendSampleResult();
  for (let i = 0; i < vertices.count; i += 1) {
    const localX = vertices.getX(i);
    const localZ = vertices.getZ(i);
    const gx = clampNumber(Math.round((localX + MID_TILE_SIZE * 0.5) / cellSize), 0, MID_TILE_RES, 0);
    const gz = clampNumber(Math.round((localZ + MID_TILE_SIZE * 0.5) / cellSize), 0, MID_TILE_RES, 0);
    const x = localX + cx * MID_TILE_SIZE;
    const z = localZ + cz * MID_TILE_SIZE;
    const blend = fillBiomeBlendSample(x, z, tileBiomeBlendScratch);
    const y =
      typeof heightAt.sampleWithBiomeBlend === "function"
        ? heightAt.sampleWithBiomeBlend(x, z, blend)
        : heightAt(x, z);
    vertices.setY(i, y);
    heightGrid[gz * tileStride + gx] = y;
    const biome = blend.dominantBiome || getBiomeAt(x, z);
    const color = fillTerrainColorFromBiomeBlend(blend);
    const n = hash2(Math.floor(x * 0.5), Math.floor(z * 0.5));
    const brighten = 0.93 + n * 0.14;
    colors[i * 3] = color.r * brighten;
    colors[i * 3 + 1] = color.g * brighten;
    colors[i * 3 + 2] = color.b * brighten;
    const gridIndex = (gz * tileStride + gx) * 3;
    colorGrid[gridIndex] = colors[i * 3];
    colorGrid[gridIndex + 1] = colors[i * 3 + 1];
    colorGrid[gridIndex + 2] = colors[i * 3 + 2];
    detailBiomes[i] = getTerrainDetailBiomeId(biome);
    detailBiomeFades[i] = getTerrainDetailBiomeFadeFromBlend(blend);
  }
  vertices.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("detailBiome", new THREE.BufferAttribute(detailBiomes, 1));
  geometry.setAttribute("detailBiomeFade", new THREE.BufferAttribute(detailBiomeFades, 1));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, midTerrainMaterial);
  mesh.position.set(cx * MID_TILE_SIZE, 0, cz * MID_TILE_SIZE);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = 0.5;
  mesh.userData.colorGrid = colorGrid;
  mesh.userData.heightGrid = heightGrid;
  mesh.userData.gridStride = tileStride;
  mesh.userData.tileSize = MID_TILE_SIZE;
  mesh.userData.tileRes = MID_TILE_RES;
  return mesh;
}

function sampleChunkHeightGridAt(x, z) {
  const cx = Math.floor((x + CHUNK_SIZE * 0.5) / CHUNK_SIZE);
  const cz = Math.floor((z + CHUNK_SIZE * 0.5) / CHUNK_SIZE);
  const mesh = chunks.get(`${cx},${cz}`);
  const grid = mesh?.userData?.heightGrid;
  if (!(grid instanceof Float32Array)) return null;

  const localX = x - cx * CHUNK_SIZE;
  const localZ = z - cz * CHUNK_SIZE;
  if (localX < -CHUNK_SIZE * 0.5 || localX > CHUNK_SIZE * 0.5 || localZ < -CHUNK_SIZE * 0.5 || localZ > CHUNK_SIZE * 0.5) {
    return null;
  }
  const gridX = clampNumber((localX + CHUNK_SIZE * 0.5) / CHUNK_CELL_SIZE, 0, CHUNK_RES, 0);
  const gridZ = clampNumber((localZ + CHUNK_SIZE * 0.5) / CHUNK_CELL_SIZE, 0, CHUNK_RES, 0);
  const x0 = Math.floor(gridX);
  const z0 = Math.floor(gridZ);
  const x1 = Math.min(CHUNK_RES, x0 + 1);
  const z1 = Math.min(CHUNK_RES, z0 + 1);
  const tx = gridX - x0;
  const tz = gridZ - z0;

  const h00 = grid[z0 * CHUNK_GRID_STRIDE + x0];
  const h10 = grid[z0 * CHUNK_GRID_STRIDE + x1];
  const h01 = grid[z1 * CHUNK_GRID_STRIDE + x0];
  const h11 = grid[z1 * CHUNK_GRID_STRIDE + x1];
  // Match THREE.PlaneGeometry triangulation:
  // triangles are (00, 01, 10) and (01, 11, 10), i.e. diagonal 01 -> 10.
  if (tx + tz <= 1) {
    return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
  }
  const ux = 1 - tx;
  const uz = 1 - tz;
  return h11 + (h01 - h11) * ux + (h10 - h11) * uz;
}

function sampleGroundHeightForCollision(x, z) {
  const fast = sampleChunkHeightGridAt(x, z);
  return Number.isFinite(fast) ? fast : heightAt(x, z);
}

function queueTeleportChunkLoad(subtitle = "Loading destination") {
  beginChunkBuildUi("teleport", `${subtitle} (0%)`);
  const chunkCx = Math.floor(player.position.x / CHUNK_SIZE);
  const chunkCz = Math.floor(player.position.z / CHUNK_SIZE);
  ensureChunksIncremental(chunkCx, chunkCz, {
    batchSize: 4,
    onProgress(done, total) {
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      setStartupLoadingMessage("Loading...", `${subtitle} (${pct}%)`);
    },
    onComplete() {
      finishChunkBuildUi("teleport");
      ensureMidTerrainRuntimeIncremental(
        Math.floor(player.position.x / MID_TILE_SIZE),
        Math.floor(player.position.z / MID_TILE_SIZE)
      );
      ensureFarTerrainRuntimeIncremental(
        Math.floor(player.position.x / FAR_TILE_SIZE),
        Math.floor(player.position.z / FAR_TILE_SIZE)
      );
    },
  });
}

function teleportPlayerToWorldCoordinates(x, z, options = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const groundY = sampleGroundHeightForCollision(x, z);
  if (!Number.isFinite(groundY)) return false;
  player.position.set(x, groundY, z);
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  minimapNeedsRender = true;
  updateBiomeHud();
  queueTeleportChunkLoad(options.subtitle || "Loading destination");
  saveState();
  return true;
}

const minimapColorScratch = { r: 0, g: 0, b: 0 };
const minimapWaterBaseScratch = new THREE.Color();
const minimapWaterShallowScratch = new THREE.Color();
const minimapWaterMidScratch = new THREE.Color();
const minimapWaterDeepScratch = new THREE.Color();
const minimapWaterAbyssScratch = new THREE.Color();

function syncMinimapCanvasSize() {
  if (!minimapCanvas || !minimapCtx) return;
  const rect = minimapCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (width === minimapPixelWidth && height === minimapPixelHeight) return;
  minimapPixelWidth = width;
  minimapPixelHeight = height;
  minimapCanvas.width = width;
  minimapCanvas.height = height;
  minimapCtx.imageSmoothingEnabled = false;
  minimapImageData = minimapCtx.createImageData(width, height);
  minimapPixelData = minimapImageData.data;
  minimapNeedsRender = true;
}

function normalizeYawDelta(delta) {
  const twoPi = Math.PI * 2;
  let next = delta % twoPi;
  if (next > Math.PI) next -= twoPi;
  if (next < -Math.PI) next += twoPi;
  return next;
}

function sampleColorFromMeshGrid(mesh, x, z, size, res, out) {
  if (!mesh) return false;
  const grid = mesh.userData?.colorGrid;
  if (!(grid instanceof Float32Array)) return false;
  const stride = Number.isFinite(mesh.userData?.gridStride) ? mesh.userData.gridStride : res + 1;
  const half = size * 0.5;
  const localX = x - mesh.position.x;
  const localZ = z - mesh.position.z;
  if (localX < -half || localX > half || localZ < -half || localZ > half) return false;
  const cellSize = size / res;
  const gridX = clampNumber((localX + half) / cellSize, 0, res, 0);
  const gridZ = clampNumber((localZ + half) / cellSize, 0, res, 0);
  const x0 = Math.floor(gridX);
  const z0 = Math.floor(gridZ);
  const x1 = Math.min(res, x0 + 1);
  const z1 = Math.min(res, z0 + 1);
  const tx = gridX - x0;
  const tz = gridZ - z0;
  const i00 = (z0 * stride + x0) * 3;
  const i10 = (z0 * stride + x1) * 3;
  const i01 = (z1 * stride + x0) * 3;
  const i11 = (z1 * stride + x1) * 3;
  const r0 = grid[i00] + (grid[i10] - grid[i00]) * tx;
  const r1 = grid[i01] + (grid[i11] - grid[i01]) * tx;
  const g0 = grid[i00 + 1] + (grid[i10 + 1] - grid[i00 + 1]) * tx;
  const g1 = grid[i01 + 1] + (grid[i11 + 1] - grid[i01 + 1]) * tx;
  const b0 = grid[i00 + 2] + (grid[i10 + 2] - grid[i00 + 2]) * tx;
  const b1 = grid[i01 + 2] + (grid[i11 + 2] - grid[i01 + 2]) * tx;
  out.r = r0 + (r1 - r0) * tz;
  out.g = g0 + (g1 - g0) * tz;
  out.b = b0 + (b1 - b0) * tz;
  return true;
}

function sampleHeightFromMeshGrid(mesh, x, z, size, res) {
  if (!mesh) return null;
  const grid = mesh.userData?.heightGrid;
  if (!(grid instanceof Float32Array)) return null;
  const stride = Number.isFinite(mesh.userData?.gridStride) ? mesh.userData.gridStride : res + 1;
  const half = size * 0.5;
  const localX = x - mesh.position.x;
  const localZ = z - mesh.position.z;
  if (localX < -half || localX > half || localZ < -half || localZ > half) return null;
  const cellSize = size / res;
  const gridX = clampNumber((localX + half) / cellSize, 0, res, 0);
  const gridZ = clampNumber((localZ + half) / cellSize, 0, res, 0);
  const x0 = Math.floor(gridX);
  const z0 = Math.floor(gridZ);
  const x1 = Math.min(res, x0 + 1);
  const z1 = Math.min(res, z0 + 1);
  const tx = gridX - x0;
  const tz = gridZ - z0;
  const h00 = grid[z0 * stride + x0];
  const h10 = grid[z0 * stride + x1];
  const h01 = grid[z1 * stride + x0];
  const h11 = grid[z1 * stride + x1];
  if (tx + tz <= 1) {
    return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
  }
  const ux = 1 - tx;
  const uz = 1 - tz;
  return h11 + (h01 - h11) * ux + (h10 - h11) * uz;
}

function sampleColorFromTileMap(tileMap, size, res, x, z, out) {
  if (!tileMap || tileMap.size === 0) return false;
  const cx = Math.floor((x + size * 0.5) / size);
  const cz = Math.floor((z + size * 0.5) / size);
  const mesh = tileMap.get(`${cx},${cz}`);
  if (!mesh) return false;
  return sampleColorFromMeshGrid(mesh, x, z, size, res, out);
}

function sampleHeightFromTileMap(tileMap, size, res, x, z) {
  if (!tileMap || tileMap.size === 0) return null;
  const cx = Math.floor((x + size * 0.5) / size);
  const cz = Math.floor((z + size * 0.5) / size);
  const mesh = tileMap.get(`${cx},${cz}`);
  if (!mesh) return null;
  return sampleHeightFromMeshGrid(mesh, x, z, size, res);
}

function sampleLoadedBiomeColorAt(x, z, out, mode = "far") {
  switch (mode) {
    case "near":
      if (sampleColorFromTileMap(chunks, CHUNK_SIZE, CHUNK_RES, x, z, out)) return out;
      return null;
    case "mid":
      if (sampleColorFromTileMap(midTiles, MID_TILE_SIZE, MID_TILE_RES, x, z, out)) return out;
      return null;
    case "far":
    default:
      if (sampleColorFromTileMap(farTiles, FAR_TILE_SIZE, FAR_TILE_RES, x, z, out)) return out;
      return null;
  }
}

function sampleLoadedHeightAt(x, z, mode = "far") {
  switch (mode) {
    case "near":
      return sampleChunkHeightGridAt(x, z);
    case "mid":
      return sampleHeightFromTileMap(midTiles, MID_TILE_SIZE, MID_TILE_RES, x, z);
    case "far":
    default:
      return sampleHeightFromTileMap(farTiles, FAR_TILE_SIZE, FAR_TILE_RES, x, z);
  }
}

function renderMinimap() {
  if (!minimapCtx || !minimapCanvas) return;
  syncMinimapCanvasSize();
  const width = minimapPixelWidth;
  const height = minimapPixelHeight;
  if (!width || !height) return;
  const nearSafeRadius = NEAR_FADE_END_METERS - CHUNK_SIZE * 0.5;
  const midSafeRadius = MID_TILE_CULL_RADIUS - MID_TILE_HALF_DIAGONAL;
  const maxSquareRadius = minimapWorldRadius * Math.SQRT2;
  const useNearOnly = minimapZoomIndex <= 4 && maxSquareRadius <= nearSafeRadius;
  const useMidOnly = !useNearOnly && maxSquareRadius <= midSafeRadius;
  const sampleMode = useNearOnly ? "near" : useMidOnly ? "mid" : "far";
  const waterLevel = state.world.water.level;
  minimapWaterBaseScratch.set(state.world.water.colorHex);
  minimapWaterShallowScratch.copy(minimapWaterBaseScratch).lerp(MINIMAP_WATER_SHALLOW_TINT, 0.42);
  minimapWaterMidScratch.copy(minimapWaterBaseScratch).lerp(MINIMAP_WATER_MID_TINT, 0.58);
  minimapWaterDeepScratch.copy(minimapWaterBaseScratch).lerp(MINIMAP_WATER_DEEP_TINT, 0.8);
  minimapWaterAbyssScratch.copy(minimapWaterBaseScratch).lerp(MINIMAP_WATER_ABYSS_TINT, 0.92);
  const span = minimapWorldRadius * 2;
  const startX = player.position.x - minimapWorldRadius;
  const startZ = player.position.z - minimapWorldRadius;
  const stepX = span / width;
  const stepZ = span / height;
  if (!minimapPixelData || minimapPixelData.length !== width * height * 4) {
    minimapImageData = minimapCtx.createImageData(width, height);
    minimapPixelData = minimapImageData.data;
  }
  const data = minimapPixelData;
  let offset = 0;
  for (let py = 0; py < height; py += 1) {
    const worldZ = startZ + py * stepZ;
    for (let px = 0; px < width; px += 1) {
      const worldX = startX + px * stepX;
      const heightSample = sampleLoadedHeightAt(worldX, worldZ, sampleMode);
      let r = MINIMAP_FALLBACK_COLOR.r;
      let g = MINIMAP_FALLBACK_COLOR.g;
      let b = MINIMAP_FALLBACK_COLOR.b;
      if (Number.isFinite(heightSample) && heightSample < waterLevel) {
        const depth = waterLevel - heightSample;
        const clampedDepth = clampNumber(depth, 0, MINIMAP_WATER_DEPTH_MAX, 0);
        if (clampedDepth <= MINIMAP_WATER_DEPTH_MID) {
          const t = smoothstep(0, MINIMAP_WATER_DEPTH_MID, clampedDepth);
          r = minimapWaterShallowScratch.r + (minimapWaterMidScratch.r - minimapWaterShallowScratch.r) * t;
          g = minimapWaterShallowScratch.g + (minimapWaterMidScratch.g - minimapWaterShallowScratch.g) * t;
          b = minimapWaterShallowScratch.b + (minimapWaterMidScratch.b - minimapWaterShallowScratch.b) * t;
        } else {
          const t = smoothstep(MINIMAP_WATER_DEPTH_MID, MINIMAP_WATER_DEPTH_MAX, clampedDepth);
          r = minimapWaterMidScratch.r + (minimapWaterDeepScratch.r - minimapWaterMidScratch.r) * t;
          g = minimapWaterMidScratch.g + (minimapWaterDeepScratch.g - minimapWaterMidScratch.g) * t;
          b = minimapWaterMidScratch.b + (minimapWaterDeepScratch.b - minimapWaterMidScratch.b) * t;
        }
        if (clampedDepth > MINIMAP_WATER_DEPTH_ABYSS_START) {
          const abyssT = smoothstep(MINIMAP_WATER_DEPTH_ABYSS_START, MINIMAP_WATER_DEPTH_MAX, clampedDepth);
          r += (minimapWaterAbyssScratch.r - r) * abyssT;
          g += (minimapWaterAbyssScratch.g - g) * abyssT;
          b += (minimapWaterAbyssScratch.b - b) * abyssT;
        }
      } else {
        const color = sampleLoadedBiomeColorAt(worldX, worldZ, minimapColorScratch, sampleMode);
        r = clampNumber(color ? color.r : MINIMAP_FALLBACK_COLOR.r, 0, 1, 0);
        g = clampNumber(color ? color.g : MINIMAP_FALLBACK_COLOR.g, 0, 1, 0);
        b = clampNumber(color ? color.b : MINIMAP_FALLBACK_COLOR.b, 0, 1, 0);
      }
      if (Number.isFinite(heightSample) && stepX > 0 && stepZ > 0) {
        const hx0 = sampleLoadedHeightAt(worldX - stepX, worldZ, sampleMode);
        const hx1 = sampleLoadedHeightAt(worldX + stepX, worldZ, sampleMode);
        const hz0 = sampleLoadedHeightAt(worldX, worldZ - stepZ, sampleMode);
        const hz1 = sampleLoadedHeightAt(worldX, worldZ + stepZ, sampleMode);
        if (Number.isFinite(hx0) && Number.isFinite(hx1) && Number.isFinite(hz0) && Number.isFinite(hz1)) {
          const dhx = (hx1 - hx0) / (2 * stepX);
          const dhz = (hz1 - hz0) / (2 * stepZ);
          const grad = Math.hypot(dhx, dhz);
          if (grad > 0) {
            const slopeAngle = Math.atan(grad);
            if (slopeAngle > MINIMAP_SLOPE_MIN_RADIANS) {
              const t = clampNumber(
                (slopeAngle - MINIMAP_SLOPE_MIN_RADIANS) / (MINIMAP_SLOPE_MAX_RADIANS - MINIMAP_SLOPE_MIN_RADIANS),
                0,
                1,
                0
              );
              const slopeT = t * t * (3 - 2 * t);
              const invGrad = 1 / grad;
              const downhillX = -dhx * invGrad;
              const downhillZ = -dhz * invGrad;
              const dirDot = downhillX * MINIMAP_SLOPE_DIR_X + downhillZ * MINIMAP_SLOPE_DIR_Z;
              const dirAmount = Math.abs(dirDot);
              if (dirAmount > 0) {
              if (dirDot > 0) {
                const lightBlend = slopeT * dirAmount * MINIMAP_SLOPE_LIGHT_BLEND_MAX;
                const additive = lightBlend * 0.5;
                r = Math.min(1, r + additive);
                g = Math.min(1, g + additive);
                b = Math.min(1, b + additive);
              } else {
                const darkBlend = slopeT * dirAmount * MINIMAP_SLOPE_BLEND_MAX;
                r *= 1 - darkBlend;
                g *= 1 - darkBlend;
                b *= 1 - darkBlend;
              }
            }
          }
        }
        }
      }
      data[offset] = Math.round(r * 255);
      data[offset + 1] = Math.round(g * 255);
      data[offset + 2] = Math.round(b * 255);
      data[offset + 3] = 255;
      offset += 4;
    }
  }
  minimapCtx.putImageData(minimapImageData, 0, 0);

  const pointerSize = Math.max(6, Math.min(width, height) * 0.07);
  minimapCtx.save();
  minimapCtx.translate(width * 0.5, height * 0.5);
  minimapCtx.rotate(-player.yaw);
  minimapCtx.beginPath();
  minimapCtx.moveTo(0, -pointerSize);
  minimapCtx.lineTo(pointerSize * 0.6, pointerSize * 0.7);
  minimapCtx.lineTo(0, pointerSize * 0.4);
  minimapCtx.lineTo(-pointerSize * 0.6, pointerSize * 0.7);
  minimapCtx.closePath();
  minimapCtx.fillStyle = "#e53935";
  minimapCtx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  minimapCtx.lineWidth = Math.max(1, pointerSize * 0.15);
  minimapCtx.fill();
  minimapCtx.stroke();
  minimapCtx.restore();
}

function updateMinimap() {
  if (!minimapCtx) return;
  const now = performance.now();
  const interval = now - lastMinimapUpdateAt;
  if (interval < MINIMAP_MIN_UPDATE_INTERVAL_MS) return;
  const dx = player.position.x - lastMinimapSampleX;
  const dz = player.position.z - lastMinimapSampleZ;
  const moved =
    !Number.isFinite(lastMinimapSampleX) ||
    !Number.isFinite(lastMinimapSampleZ) ||
    dx * dx + dz * dz >= MINIMAP_MOVE_THRESHOLD_SQ;
  const yawDelta = Number.isFinite(lastMinimapSampleYaw)
    ? Math.abs(normalizeYawDelta(player.yaw - lastMinimapSampleYaw))
    : Infinity;
  const turned = yawDelta >= MINIMAP_YAW_THRESHOLD;
  const stale = interval >= MINIMAP_STALE_UPDATE_MS;
  const zoomed = minimapZoomIndex !== lastMinimapSampleZoomIndex;
  if (!moved && !turned && !stale && !zoomed && !minimapNeedsRender) return;
  renderMinimap();
  lastMinimapUpdateAt = now;
  lastMinimapSampleX = player.position.x;
  lastMinimapSampleZ = player.position.z;
  lastMinimapSampleYaw = player.yaw;
  lastMinimapSampleZoomIndex = minimapZoomIndex;
  minimapNeedsRender = false;
}

const player = {
  position: new THREE.Vector3(state.player.position.x, state.player.position.y, state.player.position.z),
  velocity: new THREE.Vector3(),
  yaw: state.player.yaw,
  pitch: state.player.pitch,
  grounded: false,
};
if (!state.__loadedFromStorage) {
  maybeRetargetInitialSpawnToLand();
}
player.position.set(state.player.position.x, state.player.position.y, state.player.position.z);
syncAtmosphereFromState();
syncWaterColorFromState();
updateDayNightCycle(0);

const keys = new Set();
let pointerLocked = false;
let chatOpen = false;
let actionTraceVisible = true;
let suppressNextUnlockChatOpen = false;
let resumePointerLockAfterUnlock = false;
let lastEscapeChatCloseAt = -Infinity;
const ESCAPE_CHAT_REOPEN_GUARD_MS = 250;
const LOOK_SENSITIVITY = 0.002;
const LOOK_MAX_PITCH = Math.PI / 2 - 0.02;
const LOOK_SMOOTHING_HZ = 20;
const LOOK_MAX_EVENT_DELTA_PX = 180;
const LOOK_REJECT_EVENT_DELTA_PX = 1200;
const LOOK_MAX_RADIANS_PER_FRAME = Math.PI / 8;
const lookInput = {
  pendingYaw: 0,
  pendingPitch: 0,
  ignoreEventsRemaining: 0,
};

function resetQueuedLookInput() {
  lookInput.pendingYaw = 0;
  lookInput.pendingPitch = 0;
}

function queueLookDelta(event) {
  if (!pointerLocked) return;
  if (lookInput.ignoreEventsRemaining > 0) {
    lookInput.ignoreEventsRemaining -= 1;
    return;
  }
  const rawX = Number(event.movementX);
  const rawY = Number(event.movementY);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
    return;
  }
  if (Math.abs(rawX) > LOOK_REJECT_EVENT_DELTA_PX || Math.abs(rawY) > LOOK_REJECT_EVENT_DELTA_PX) {
    return;
  }
  const clampedX = clampNumber(rawX, -LOOK_MAX_EVENT_DELTA_PX, LOOK_MAX_EVENT_DELTA_PX, 0);
  const clampedY = clampNumber(rawY, -LOOK_MAX_EVENT_DELTA_PX, LOOK_MAX_EVENT_DELTA_PX, 0);
  lookInput.pendingYaw -= clampedX * LOOK_SENSITIVITY;
  lookInput.pendingPitch -= clampedY * LOOK_SENSITIVITY;
}

function applyQueuedLookInput(dt) {
  if (!(dt > 0)) return;
  if (!Number.isFinite(lookInput.pendingYaw) || !Number.isFinite(lookInput.pendingPitch)) {
    resetQueuedLookInput();
    return;
  }
  const alpha = 1 - Math.exp(-LOOK_SMOOTHING_HZ * dt);
  if (!(alpha > 0)) return;
  const applyAxis = (pending) => {
    if (pending === 0) return 0;
    const step = pending * alpha;
    return clampNumber(step, -LOOK_MAX_RADIANS_PER_FRAME, LOOK_MAX_RADIANS_PER_FRAME, 0);
  };
  const yawStep = applyAxis(lookInput.pendingYaw);
  const pitchStep = applyAxis(lookInput.pendingPitch);
  player.yaw += yawStep;
  player.pitch += pitchStep;
  lookInput.pendingYaw -= yawStep;
  lookInput.pendingPitch -= pitchStep;
  if (Math.abs(lookInput.pendingYaw) < 1e-5) lookInput.pendingYaw = 0;
  if (Math.abs(lookInput.pendingPitch) < 1e-5) lookInput.pendingPitch = 0;
  player.pitch = Math.max(-LOOK_MAX_PITCH, Math.min(LOOK_MAX_PITCH, player.pitch));
}

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
  syncMinimapCanvasSize();
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

  const zoomInKey =
    event.key === "+" ||
    event.key === "=" ||
    event.code === "Equal" ||
    event.code === "NumpadAdd" ||
    event.code === "NumpadEqual";
  const zoomOutKey =
    event.key === "-" || event.key === "_" || event.code === "Minus" || event.code === "NumpadSubtract";
  if (zoomInKey || zoomOutKey) {
    setMinimapZoomIndex(minimapZoomIndex + (zoomInKey ? -1 : 1));
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.code === "Enter") {
    if (document.activeElement !== chatInput) {
      setChatOpen(true, { focusInput: true });
      event.preventDefault();
    }
  }

  keys.add(event.code);

  if (
    event.code === "KeyR" &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
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

minimapZoomInBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  setMinimapZoomIndex(minimapZoomIndex - 1);
});

minimapZoomOutBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  setMinimapZoomIndex(minimapZoomIndex + 1);
});

minimapCanvas?.addEventListener("click", (event) => {
  if (event.button !== 0) return;
  const worldPoint = mapMinimapClickToWorld(
    event,
    minimapCanvas,
    player.position.x,
    player.position.z,
    minimapWorldRadius
  );
  if (!worldPoint) return;
  event.preventDefault();
  if (!teleportPlayerToWorldCoordinates(worldPoint.x, worldPoint.z)) return;
  addChatEntry({
    role: "codex_output",
    content: `Teleported to ${Math.round(worldPoint.x)}, ${Math.round(worldPoint.z)} from minimap click.`,
    ts: Date.now(),
  });
});

window.addEventListener("mousemove", (event) => {
  queueLookDelta(event);
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
    resetQueuedLookInput();
    lookInput.ignoreEventsRemaining = 1;
  } else {
    resetQueuedLookInput();
    lookInput.ignoreEventsRemaining = 0;
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

function formatHudCoord(value) {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? "0.0" : rounded.toFixed(1);
}

function updateHudYReadout() {
  if (
    !feetYEl &&
    !eyeYEl &&
    !waterYEl &&
    !playerYEl &&
    !cameraYEl &&
    !velYEl &&
    !groundedEl &&
    !moveVersionEl
  ) {
    return;
  }
  const groundY = Number.isFinite(player._lastGroundHeight)
    ? player._lastGroundHeight
    : getGroundYAt(player.position.x, player.position.z, sampleGroundHeightForCollision, heightAt);
  const feetY = Number.isFinite(groundY) ? groundY : getFeetY(player);
  if (feetYEl) feetYEl.textContent = formatHudCoord(feetY);
  if (eyeYEl) eyeYEl.textContent = formatHudCoord(getEyeY(player, PLAYER_HEIGHT));
  if (waterYEl) waterYEl.textContent = formatHudCoord(state.world.water.level);
  if (playerYEl) playerYEl.textContent = formatHudCoord(player.position.y);
  if (cameraYEl) cameraYEl.textContent = formatHudCoord(camera.position.y);
  if (velYEl) velYEl.textContent = formatHudCoord(player.velocity.y);
  if (groundedEl) groundedEl.textContent = player.grounded ? "true" : "false";
  if (moveVersionEl) moveVersionEl.textContent = MOVEMENT_VERSION;
}

function updateWorldGroupTransform() {
  worldGroup.position.set(-originOffset.x, -originOffset.y, -originOffset.z);
}

function maybeRecenterWorldOrigin() {
  const dx = player.position.x - originOffset.x;
  const dz = player.position.z - originOffset.z;
  if (Math.abs(dx) <= ORIGIN_RECENTER_THRESHOLD_METERS && Math.abs(dz) <= ORIGIN_RECENTER_THRESHOLD_METERS) {
    return;
  }
  const targetX = Math.round(player.position.x / ORIGIN_RECENTER_GRID_METERS) * ORIGIN_RECENTER_GRID_METERS;
  const targetZ = Math.round(player.position.z / ORIGIN_RECENTER_GRID_METERS) * ORIGIN_RECENTER_GRID_METERS;
  originOffset.set(targetX, 0, targetZ);
  updateWorldGroupTransform();
  minimapNeedsRender = true;
}

function updateRenderTransforms() {
  renderPlayerPosition.copy(player.position).sub(originOffset);
  renderCameraPosition.copy(renderPlayerPosition);
  renderCameraPosition.y += PLAYER_HEIGHT;
  camera.position.copy(renderCameraPosition);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
  sky.position.copy(renderPlayerPosition);
  renderTargetPosition.copy(renderPlayerPosition);
  renderTargetPosition.y = 0;
  sunLight.target.position.copy(renderTargetPosition);
  moonLight.target.position.copy(renderTargetPosition);
  shadowFillLight.target.position.copy(renderTargetPosition);
  playerGlowLight.position.set(renderPlayerPosition.x, renderPlayerPosition.y + PLAYER_HEIGHT + 1.4, renderPlayerPosition.z);
  playerGroundFill.position.set(renderPlayerPosition.x, renderPlayerPosition.y + PLAYER_HEIGHT + 8.8, renderPlayerPosition.z);
  playerGroundFill.target.position.set(renderPlayerPosition.x, renderPlayerPosition.y + PLAYER_HEIGHT - 1.6, renderPlayerPosition.z);
}

function updatePlayer(dt) {
  updatePlayerRuntime({
    dt,
    keys,
    player,
    playerHeight: PLAYER_HEIGHT,
    heightAt,
    sampleGroundHeight: sampleGroundHeightForCollision,
    ensureChunks: ensureChunksRuntimeIncremental,
    chunkSize: CHUNK_SIZE,
    xyzEl,
    chunkEl,
    Vector3: THREE.Vector3,
  });
  maybeRecenterWorldOrigin();
}

function updateFarTerrainFromPlayer() {
  const tileX = Math.floor(player.position.x / FAR_TILE_SIZE);
  const tileZ = Math.floor(player.position.z / FAR_TILE_SIZE);
  ensureFarTerrainRuntimeIncremental(tileX, tileZ);
}

function updateMidTerrainFromPlayer() {
  const tileX = Math.floor(player.position.x / MID_TILE_SIZE);
  const tileZ = Math.floor(player.position.z / MID_TILE_SIZE);
  ensureMidTerrainRuntimeIncremental(tileX, tileZ);
}

function updateBiomeHud() {
  const x = player.position.x;
  const z = player.position.z;
  const nowMs = performance.now();
  const movedFar =
    !Number.isFinite(lastVisualSampleX) ||
    !Number.isFinite(lastVisualSampleZ) ||
    (x - lastVisualSampleX) * (x - lastVisualSampleX) + (z - lastVisualSampleZ) * (z - lastVisualSampleZ) >= VISUAL_SAMPLE_MIN_DISTANCE_SQ;
  const stale = nowMs - lastVisualSampleAtMs >= VISUAL_SAMPLE_MIN_INTERVAL_MS;
  if (!movedFar && !stale) return;

  const visual = fillBlendedVisualSampleAt(x, z);
  const climate = sampleBiomeClimateFields(x, z);
  const temperatureCategory = getTemperatureCategoryFromValue(climate.temperature);
  const humidityBand = getHumidityBandKey(climate.humidity);
  applyVisualSampleToAtmosphereAndWater(visual);
  if (biomeEl) {
    biomeEl.textContent = visual?.biome?.label ?? visual?.biome?.id ?? "Unknown";
  }
  if (temperatureTypeEl) {
    temperatureTypeEl.textContent = `${temperatureCategory[0].toUpperCase()}${temperatureCategory.slice(1)}`;
  }
  if (humidityTypeEl) {
    humidityTypeEl.textContent = HUMIDITY_ZONE_LABELS[humidityBand] || "Unknown";
  }
  lastVisualSampleX = x;
  lastVisualSampleZ = z;
  lastVisualSampleAtMs = nowMs;
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  applyQueuedLookInput(dt);
  if (!chunkBuildInProgress || chunkBuildContext === "startup") {
    updatePlayer(dt);
    updateHudYReadout();
  }
  updateMidTerrainFromPlayer();
  updateFarTerrainFromPlayer();
  updateBiomeHud();
  updateMinimap();
  updateDayNightCycle(dt);
  updateUnderwaterVisualEffects(dt);
  updateStatusClock();
  updateStatusFps(dt);
  if (cloudGroup.parent) {
    cloudGroup.position.set(
      player.position.x * 0.34 + Math.sin(clock.elapsedTime * 0.03) * 90,
      0,
      player.position.z * 0.34 + Math.cos(clock.elapsedTime * 0.025) * 90
    );
  }
  const targetOpacity = state.world.water.opacity;
  const underwaterOpacityBoost = lerpScalar(0, 0.22, underwaterState.submersion);
  water.material.opacity = clampNumber(
    targetOpacity + underwaterOpacityBoost + Math.sin(clock.elapsedTime * 0.6) * 0.04,
    0.05,
    1,
    targetOpacity
  );
  water.position.x = player.position.x;
  water.position.z = player.position.z;
  if (water.material instanceof THREE.MeshPhysicalMaterial) {
    water.material.roughness = clampNumber(0.2 + Math.sin(clock.elapsedTime * 0.35) * 0.04, 0.12, 0.3, 0.2);
  }
  updateRenderTransforms();
  renderer.render(scene, camera);
  if (pendingInitialNightSync) {
    pendingInitialNightSync = false;
    updateDayNightCycle(0);
    syncTerrainShaderUniforms();
  }
  if (!startupLoadingDismissed) {
    startupLoadingDismissed = true;
    if (chunkBuildContext !== "rebuild") {
      setStartupLoadingVisible(false);
    }
    if (pendingTimeCycleRefresh) {
      pendingTimeCycleRefresh = false;
      // Hack: on cold boot at night the mid/far fog uniforms can stick to a light blend
      // until time is changed. Force a silent time flip after the initial load completes.
      forceTimeCycleRefresh();
    }
  }
  requestAnimationFrame(animate);
}

function runStartupPhase(title, subtitle, task, next) {
  setStartupLoadingMessage(title, subtitle);
  requestAnimationFrame(() => {
    task();
    if (typeof next === "function") requestAnimationFrame(next);
  });
}

function startAppBootSequence() {
  beginChunkBuildUi("startup", "Preparing world systems");
  runStartupPhase("Loading...", "Preparing world systems", () => {}, () => {
    setStartupLoadingMessage("Loading...", "Generating nearby terrain chunks (0%)");
    const startCx = Math.floor(player.position.x / CHUNK_SIZE);
    const startCz = Math.floor(player.position.z / CHUNK_SIZE);
    ensureChunksIncremental(startCx, startCz, {
      batchSize: 3,
      onProgress(done, total) {
        const pct = total > 0 ? Math.round((done / total) * 100) : 100;
        setStartupLoadingMessage("Loading...", `Generating nearby terrain chunks (${pct}%)`);
      },
      onComplete() {
        runStartupPhase("Loading...", "Placing landmarks and finishing scene", () => {
          rebuildLandmarks();
        }, () => {
          setStartupLoadingMessage("Loading...", "Starting renderer");
          setTimeOfDay(state.timeOfDay, null, { silent: true });
          pendingInitialNightSync = true;
          pendingTimeCycleRefresh = true;
          chunkBuildInProgress = false;
          chunkBuildContext = "startup";
          animate();
        });
      },
    });
  });
}

startAppBootSequence();
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
    const coords = tryParseTeleportCoordinates(tpAliasMatch[1]);
    if (coords) {
      teleportPlayerToCoordinates(coords.x, coords.z);
    } else {
      teleportPlayerToBiome(tpAliasMatch[1]);
    }
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
  const biomeNames = Array.from(new Set(Object.keys(BIOME_DEFS)))
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

function applyBiomeSettingsVisualRefresh({ terrainProfileTouched = false, fogDensityTouched = false, styleKeys = [] } = {}) {
  if (terrainProfileTouched) {
    biomeTerrainProfileCache.clear();
    rebuildTerrain();
  }
  if (fogDensityTouched) {
    syncAtmosphereFromState();
  }
  if (styleKeys.length > 0) {
    applyBiomeStyleVisualRefresh(styleKeys);
    return;
  }
  if (terrainProfileTouched || fogDensityTouched) {
    saveState();
  }
}

function applyBiomeSettingsUpdateFromAction(action) {
  const biomeId = String(action?.biomeId || "").trim().toLowerCase();
  if (!biomeId || !BIOME_DEFS[biomeId]) {
    return { ok: false, reason: "unknown biomeId" };
  }

  const styleColorKeys = ["terrainColor", "waterColorHex", "fogColorHex"];
  const hasStyleFields = styleColorKeys.some((key) => typeof action[key] === "string");
  const hasTerrainProfileFields =
    action.terrainProfile && typeof action.terrainProfile === "object" && Object.keys(action.terrainProfile).length > 0;
  const hasFogDensityMultiplier = typeof action.fogDensityMultiplier === "number" && Number.isFinite(action.fogDensityMultiplier);
  const isClear = action.clear === true;
  if (!isClear && !hasStyleFields && !hasTerrainProfileFields && !hasFogDensityMultiplier) {
    return { ok: false, reason: "no valid fields" };
  }

  let terrainProfileTouched = false;
  let fogDensityTouched = false;
  const touchedStyleKeys = [];

  if (hasStyleFields || isClear) {
    if (!state.world.biomeStyles || typeof state.world.biomeStyles !== "object") {
      state.world.biomeStyles = {};
    }
    const currentStyle = state.world.biomeStyles[biomeId] && typeof state.world.biomeStyles[biomeId] === "object"
      ? { ...state.world.biomeStyles[biomeId] }
      : {};
    const nextStyle = { ...currentStyle };

    for (const key of styleColorKeys) {
      if (isClear && (action[key] == null || typeof action[key] === "string")) {
        if (key in nextStyle) {
          delete nextStyle[key];
          touchedStyleKeys.push(key);
        }
        continue;
      }
      if (typeof action[key] === "string") {
        const normalized = toColorHex(action[key], null);
        if (!normalized) continue;
        if (nextStyle[key] !== normalized) {
          nextStyle[key] = normalized;
          touchedStyleKeys.push(key);
        }
      }
    }
    if (Object.keys(nextStyle).length > 0) {
      state.world.biomeStyles[biomeId] = nextStyle;
    } else {
      delete state.world.biomeStyles[biomeId];
    }
  }

  if (hasTerrainProfileFields || hasFogDensityMultiplier || isClear) {
    const settings = ensureBiomeSettingsState();
    const current = settings[biomeId] && typeof settings[biomeId] === "object" ? settings[biomeId] : {};
    const next = { ...current };

    if (isClear && (!action.terrainProfile || Object.keys(action.terrainProfile || {}).length > 0)) {
      if (next.terrainProfile) {
        delete next.terrainProfile;
        terrainProfileTouched = true;
      }
    }
    if (isClear && (action.fogDensityMultiplier == null || hasFogDensityMultiplier)) {
      if (typeof next.fogDensityMultiplier === "number") {
        delete next.fogDensityMultiplier;
        fogDensityTouched = true;
      }
    }

    if (hasTerrainProfileFields) {
      const terrainProfile = { ...(next.terrainProfile && typeof next.terrainProfile === "object" ? next.terrainProfile : {}) };
      const incoming = action.terrainProfile;
      const assignNumber = (key, min, max, integer = false) => {
        if (typeof incoming[key] !== "number" || !Number.isFinite(incoming[key])) return;
        const raw = integer ? Math.round(incoming[key]) : incoming[key];
        const clamped = clampNumber(raw, min, max, terrainProfile[key]);
        if (terrainProfile[key] !== clamped) {
          terrainProfile[key] = clamped;
          terrainProfileTouched = true;
        }
      };
      const assignFiniteNumber = (key) => {
        if (typeof incoming[key] !== "number" || !Number.isFinite(incoming[key])) return;
        if (terrainProfile[key] !== incoming[key]) {
          terrainProfile[key] = incoming[key];
          terrainProfileTouched = true;
        }
      };
      if (typeof incoming.noiseAlgorithm === "string") {
        const nextAlgorithm = incoming.noiseAlgorithm;
        if (terrainProfile.noiseAlgorithm !== nextAlgorithm) {
          terrainProfile.noiseAlgorithm = nextAlgorithm;
          terrainProfileTouched = true;
        }
      }
      assignNumber("noiseScaleMultiplier", 0.2, 4);
      assignNumber("baseHeightMultiplier", 0.1, 4);
      assignNumber("ridgeScaleMultiplier", 0.2, 4);
      assignNumber("ridgeHeightMultiplier", 0, 4);
      assignNumber("octaves", 1, 8, true);
      assignNumber("lacunarity", 1.1, 4);
      assignNumber("gain", 0.1, 0.9);
      assignNumber("warpStrength", 0, 1.2);
      assignNumber("warpScaleMultiplier", 0.2, 5);
      assignNumber("secondaryAmount", -1, 1);
      assignFiniteNumber("heightMultiplier");
      assignNumber("heightOffset", -200, 200);
      if (Object.keys(terrainProfile).length > 0) next.terrainProfile = terrainProfile;
      else if (next.terrainProfile) {
        delete next.terrainProfile;
        terrainProfileTouched = true;
      }
    }

    if (hasFogDensityMultiplier) {
      const clampedFogDensityMultiplier = clampNumber(action.fogDensityMultiplier, 0.2, 3, next.fogDensityMultiplier);
      if (next.fogDensityMultiplier !== clampedFogDensityMultiplier) {
        next.fogDensityMultiplier = clampedFogDensityMultiplier;
        fogDensityTouched = true;
      }
    }

    if (Object.keys(next).length > 0) settings[biomeId] = next;
    else delete settings[biomeId];
  }

  const uniqueStyleKeys = [...new Set(touchedStyleKeys)];
  if (!terrainProfileTouched && !fogDensityTouched && uniqueStyleKeys.length === 0) {
    return { ok: false, reason: "no changes" };
  }
  applyBiomeSettingsVisualRefresh({
    terrainProfileTouched,
    fogDensityTouched,
    styleKeys: uniqueStyleKeys,
  });
  return {
    ok: true,
    detail: [
      terrainProfileTouched ? "terrainProfile" : null,
      fogDensityTouched ? "fogDensityMultiplier" : null,
      uniqueStyleKeys.length ? `style:${uniqueStyleKeys.join(",")}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
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
  queueTeleportChunkLoad("Loading biome destination");
  updateBiomeHud();
  saveState();

  addChatEntry({
    role: "codex_output",
    content: `Teleported to ${targetBiome.label} at ${Math.round(target.x)}, ${Math.round(target.z)}.`,
    ts: Date.now(),
  });
}

function teleportPlayerToCoordinates(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    addChatEntry({
      role: "codex_output",
      content: `Invalid coordinates "${String(x)}, ${String(z)}".`,
      ts: Date.now(),
    });
    return;
  }

  const success = teleportPlayerToWorldCoordinates(x, z);
  if (!success) {
    addChatEntry({
      role: "codex_output",
      content: `Failed to teleport to ${Math.round(x)}, ${Math.round(z)}. Try another location.`,
      ts: Date.now(),
    });
    return;
  }

  addChatEntry({
    role: "codex_output",
    content: `Teleported to ${Math.round(x)}, ${Math.round(z)}.`,
    ts: Date.now(),
  });
}

function tryParseTeleportCoordinates(rawArg) {
  if (!rawArg) return null;
  const tokens = rawArg
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length < 2) return null;
  const x = Number.parseFloat(tokens[0]);
  const z = Number.parseFloat(tokens[1]);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z };
}

function resolveBiomeName(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!normalized) return null;
  for (const [key, biome] of Object.entries(BIOME_DEFS)) {
    const keyName = String(key).toLowerCase().replace(/[^a-z]/g, "");
    const idKey = biome.id.toLowerCase().replace(/[^a-z]/g, "");
    const labelKey = biome.label.toLowerCase().replace(/[^a-z]/g, "");
    if (normalized === keyName || normalized === idKey || normalized === labelKey) {
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
  applyBiomeSettingsUpdate: applyBiomeSettingsUpdateFromAction,
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
    worldGroup.remove(treeGroup);
  });
  treeChunks.clear();
  rebuildTerrain();
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

const saveTimer = setInterval(saveState, 10000);
function handleBeforeUnload() {
  saveState();
}
window.addEventListener("beforeunload", handleBeforeUnload);
