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
const DEFAULT_WORLD = {
  terrain: {
    noiseScale: 0.03,
    baseHeight: 14,
    ridgeScale: 1.8,
    ridgeHeight: 6,
  },
  terrainColor: "#1d3b35",
  trees: {
    density: 0.22,
    trunkColor: "#4c3826",
    canopyColor: "#2f6a3e",
  },
  water: {
    level: 1.5,
    colorHex: "#0f2b2f",
    opacity: 0.6,
  },
  fog: {
    colorHex: "#0b1112",
    density: 0.0015,
  },
  landmarks: [],
};

const DEFAULT_STATE = {
  seed: Math.floor(Math.random() * 1e9),
  world: DEFAULT_WORLD,
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

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(state.world.fog.colorHex, state.world.fog.density);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const light = new THREE.DirectionalLight(0xdff6ff, 1.2);
light.position.set(12, 24, 8);
scene.add(light);
scene.add(new THREE.AmbientLight(0x4a5c61, 0.6));

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshPhongMaterial({
    color: state.world.water.colorHex,
    transparent: true,
    opacity: state.world.water.opacity,
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = state.world.water.level;
scene.add(water);

const terrainMaterial = new THREE.MeshStandardMaterial({
  color: state.world.terrainColor,
  roughness: 0.9,
  metalness: 0.05,
});

const CHUNK_SIZE = 64;
const CHUNK_RES = 32;
const CHUNK_RADIUS = 8;
const chunks = new Map();
const treeChunks = new Map();
const landmarkGroup = new THREE.Group();
scene.add(landmarkGroup);
const treeTrunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 5.2, 8);
const treeCanopyGeometry = new THREE.ConeGeometry(1.05, 5.2, 10);
const treeTrunkMaterial = new THREE.MeshStandardMaterial({
  color: state.world.trees.trunkColor,
  roughness: 0.94,
  metalness: 0.02,
});
const treeCanopyMaterial = new THREE.MeshStandardMaterial({
  color: state.world.trees.canopyColor,
  roughness: 0.92,
  metalness: 0.01,
});
const TERRAIN_HORIZONTAL_SCALE = 3;

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
    trunk.scale.set(2 * scale, scale, 2 * scale);
    trunk.receiveShadow = true;
    trunk.castShadow = false;
    group.add(trunk);

    const canopy = new THREE.Mesh(treeCanopyGeometry, treeCanopyMaterial);
    canopy.position.set(worldX, groundY + 5.6 * scale, worldZ);
    canopy.scale.set(2 * scale, scale, 2 * scale);
    canopy.receiveShadow = true;
    canopy.castShadow = false;
    group.add(canopy);
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
    toggleChatPause();
    event.preventDefault();
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
});

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
  pointerLocked = document.pointerLockElement === canvas;
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
  const targetOpacity = state.world.water.opacity;
  water.material.opacity = clampNumber(
    targetOpacity + Math.sin(clock.elapsedTime * 0.6) * 0.05,
    0.05,
    1,
    targetOpacity
  );
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
      scene.fog.color.set(state.world.fog.colorHex);
      renderer.setClearColor(state.world.fog.colorHex, 1);
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
      treeTrunkMaterial.color.set(state.world.trees.trunkColor);
      touched = true;
    }
    if (typeof action.canopyColor === "string") {
      state.world.trees.canopyColor = toColorHex(action.canopyColor, state.world.trees.canopyColor);
      treeCanopyMaterial.color.set(state.world.trees.canopyColor);
      touched = true;
    }
    if (!touched) return traceResult("rejected", "set_trees", "no valid fields");
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
  return {
    terrain: {
      noiseScale: clampNumber(terrain.noiseScale, 0.005, 0.25, DEFAULT_WORLD.terrain.noiseScale),
      baseHeight: clampNumber(terrain.baseHeight, 1, 80, DEFAULT_WORLD.terrain.baseHeight),
      ridgeScale: clampNumber(terrain.ridgeScale, 0.5, 6, DEFAULT_WORLD.terrain.ridgeScale),
      ridgeHeight: clampNumber(terrain.ridgeHeight, 0, 50, DEFAULT_WORLD.terrain.ridgeHeight),
    },
    terrainColor: toColorHex(source.terrainColor, DEFAULT_WORLD.terrainColor),
    trees: {
      density: clampNumber(treesCfg.density, 0, 1.2, DEFAULT_WORLD.trees.density),
      trunkColor: toColorHex(treesCfg.trunkColor, DEFAULT_WORLD.trees.trunkColor),
      canopyColor: toColorHex(treesCfg.canopyColor, DEFAULT_WORLD.trees.canopyColor),
    },
    water: {
      level: clampNumber(waterCfg.level, -30, 80, DEFAULT_WORLD.water.level),
      colorHex: toColorHex(waterCfg.colorHex, DEFAULT_WORLD.water.colorHex),
      opacity: clampNumber(waterCfg.opacity, 0.05, 1, DEFAULT_WORLD.water.opacity),
    },
    fog: {
      colorHex: toColorHex(fogCfg.colorHex, DEFAULT_WORLD.fog.colorHex),
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
