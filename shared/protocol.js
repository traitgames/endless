export const PROTOCOL_VERSION = 1;
export const SUPPORTED_PROTOCOL_VERSIONS = [1];

export const CLIENT_CAPABILITIES = {
  updateId: true,
  actionBatch: true,
  legacyUpdateFields: true,
};

export const SERVER_CAPABILITIES = {
  routeInfo: true,
  trace: true,
  finalReply: true,
  health: true,
};

const ACTION_TYPES = new Set([
  "set_seed",
  "set_time",
  "set_terrain",
  "set_biome_settings",
  "set_water",
  "set_fog",
  "set_terrain_color",
  "set_trees",
  "spawn_landmark",
  "clear_landmarks",
  "run_local_world_command",
]);

export function negotiateProtocol(peerVersions, fallbackVersion = PROTOCOL_VERSION) {
  const offered = Array.isArray(peerVersions)
    ? peerVersions.filter((v) => Number.isInteger(v))
    : [];
  const common = offered.find((v) => SUPPORTED_PROTOCOL_VERSIONS.includes(v));
  return common || (SUPPORTED_PROTOCOL_VERSIONS.includes(fallbackVersion) ? fallbackVersion : PROTOCOL_VERSION);
}

export function normalizeEnvelope(payload, defaults = {}) {
  const input = payload && typeof payload === "object" ? payload : {};
  return {
    type: typeof input.type === "string" ? input.type : "unknown",
    requestId: safeText(input.requestId) || defaults.requestId || null,
    timestamp: Number.isFinite(input.timestamp) ? input.timestamp : Date.now(),
    protocolVersion: Number.isInteger(input.protocolVersion) ? input.protocolVersion : defaults.protocolVersion || PROTOCOL_VERSION,
    capabilities: normalizeCapabilities(input.capabilities),
    message: safeText(input.message),
    snapshot: input.snapshot,
    update: input.update,
    reply: input.reply,
    route: safeText(input.route),
    mode: safeText(input.mode),
    status: safeText(input.status),
    phrase: safeText(input.phrase),
    content: safeText(input.content),
  };
}

export function normalizeCapabilities(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (key === "protocolVersions" && Array.isArray(enabled)) {
      out.protocolVersions = enabled.filter((v) => Number.isInteger(v));
      continue;
    }
    if (typeof key === "string" && typeof enabled === "boolean") {
      out[key] = enabled;
    }
  }
  return out;
}

export function normalizeUpdate(update) {
  if (!update || typeof update !== "object") {
    return { ok: false, error: "invalid update payload" };
  }

  const normalized = {
    updateId: safeText(update.updateId) || randomId("upd"),
    actions: [],
    chatNote: safeText(update.chatNote),
  };

  if (Array.isArray(update.actions)) {
    const mapped = normalizeActions(update.actions);
    normalized.actions = mapped.actions;
    return { ok: true, data: normalized, rejected: mapped.rejected };
  }

  const fallbackActions = [];
  if (typeof update.seed === "number") {
    fallbackActions.push({ type: "set_seed", seed: update.seed });
  }
  if (typeof update.terrainColor === "string") {
    fallbackActions.push({ type: "set_terrain_color", colorHex: update.terrainColor });
  }
  const mapped = normalizeActions(fallbackActions);
  normalized.actions = mapped.actions;
  return { ok: true, data: normalized, rejected: mapped.rejected };
}

export function normalizeActions(actions) {
  const accepted = [];
  const rejected = [];
  const list = Array.isArray(actions) ? actions : [];
  for (const action of list) {
    const normalized = normalizeAction(action);
    if (normalized) accepted.push(normalized);
    else rejected.push(action);
  }
  return { actions: accepted, rejected };
}

export function normalizeAction(action) {
  if (!action || typeof action !== "object") return null;
  const type = safeText(action.type);
  if (!ACTION_TYPES.has(type)) return null;

  if (type === "set_seed") {
    const seed = toInt(action.seed);
    if (seed === null) return null;
    return { type, seed };
  }

  if (type === "set_time") {
    const timeOfDay = toNumber(action.timeOfDay ?? action.cycle);
    if (timeOfDay === null) return null;
    return { type, timeOfDay };
  }

  if (type === "set_terrain") {
    const out = { type };
    maybeNumber(action, out, "noiseScale");
    maybeNumber(action, out, "baseHeight");
    maybeNumber(action, out, "ridgeScale");
    maybeNumber(action, out, "ridgeHeight");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "set_biome_settings") {
    const biomeId = safeBiomeId(action.biomeId ?? action.biome ?? action.id);
    if (!biomeId) return null;
    const out = { type, biomeId };
    if (typeof action.clear === "boolean") out.clear = action.clear;
    maybeColor(action, out, "terrainColor");
    maybeColor(action, out, "waterColorHex");
    maybeColor(action, out, "fogColorHex");
    maybeNumber(action, out, "fogDensityMultiplier");

    const terrainProfileIn =
      action.terrainProfile && typeof action.terrainProfile === "object"
        ? action.terrainProfile
        : action.terrain && typeof action.terrain === "object"
          ? action.terrain
          : null;
    if (terrainProfileIn) {
      const terrainProfile = {};
      maybeNumber(terrainProfileIn, terrainProfile, "noiseScaleMultiplier");
      maybeNumber(terrainProfileIn, terrainProfile, "baseHeightMultiplier");
      maybeNumber(terrainProfileIn, terrainProfile, "ridgeScaleMultiplier");
      maybeNumber(terrainProfileIn, terrainProfile, "ridgeHeightMultiplier");
      maybeNumber(terrainProfileIn, terrainProfile, "octaves");
      maybeNumber(terrainProfileIn, terrainProfile, "lacunarity");
      maybeNumber(terrainProfileIn, terrainProfile, "gain");
      maybeNumber(terrainProfileIn, terrainProfile, "warpStrength");
      maybeNumber(terrainProfileIn, terrainProfile, "warpScaleMultiplier");
      maybeNumber(terrainProfileIn, terrainProfile, "secondaryAmount");
      maybeNumber(terrainProfileIn, terrainProfile, "heightMultiplier");
      maybeNumber(terrainProfileIn, terrainProfile, "heightOffset");
      const algorithm = safeTerrainNoiseAlgorithm(terrainProfileIn.noiseAlgorithm ?? terrainProfileIn.algorithm);
      if (algorithm) terrainProfile.noiseAlgorithm = algorithm;
      if (Object.keys(terrainProfile).length > 0) out.terrainProfile = terrainProfile;
    }
    return Object.keys(out).length > 2 || out.clear ? out : null;
  }

  if (type === "set_water") {
    const out = { type };
    maybeNumber(action, out, "level");
    maybeNumber(action, out, "opacity");
    maybeColor(action, out, "colorHex");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "set_fog") {
    const out = { type };
    maybeNumber(action, out, "density");
    maybeColor(action, out, "colorHex");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "set_terrain_color") {
    const colorHex = toColor(action.colorHex);
    if (!colorHex) return null;
    return { type, colorHex };
  }

  if (type === "set_trees") {
    const out = { type };
    maybeNumber(action, out, "density");
    maybeColor(action, out, "trunkColor");
    maybeColor(action, out, "canopyColor");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "spawn_landmark") {
    const kind = safeText(action.kind);
    if (kind !== "pillar" && kind !== "beacon") return null;
    const out = { type, kind };
    maybeNumber(action, out, "x");
    maybeNumber(action, out, "z");
    maybeNumber(action, out, "yOffset");
    maybeNumber(action, out, "scale");
    maybeColor(action, out, "colorHex");
    if (typeof out.x !== "number") out.x = 0;
    if (typeof out.z !== "number") out.z = 0;
    return out;
  }

  if (type === "clear_landmarks") {
    return { type };
  }

  if (type === "run_local_world_command") {
    const command = safeText(action.command || action.message);
    if (!command) return null;
    return { type, command };
  }

  return null;
}

function maybeNumber(src, target, key) {
  const value = toNumber(src[key]);
  if (value !== null) target[key] = value;
}

function maybeColor(src, target, key) {
  const value = toColor(src[key]);
  if (value) target[key] = value;
}

function toNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function toInt(value) {
  const n = toNumber(value);
  if (n === null) return null;
  return Math.trunc(n);
}

function toColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function safeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function safeBiomeId(value) {
  const text = safeText(value).toLowerCase();
  if (!text) return "";
  if (!/^[a-z][a-z0-9_-]*$/.test(text)) return "";
  return text;
}

function safeTerrainNoiseAlgorithm(value) {
  const text = safeText(value).toLowerCase();
  if (!text) return "";
  return ["fbm_ridged", "billow", "ridged", "warped", "hybrid"].includes(text) ? text : "";
}

export function randomId(prefix = "id") {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function buildError(code, message, details = {}) {
  return {
    code,
    message,
    details,
  };
}

export function serializeMessage(msg) {
  return JSON.stringify(msg);
}
