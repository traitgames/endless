export function loadPersistedState({ storageKey, defaultState, stateVersion, defaultWorld, legacyWorld }) {
  const raw = localStorage.getItem(storageKey);
  const attachFlag = (state, loadedFromStorage) => {
    state.__loadedFromStorage = loadedFromStorage;
    return state;
  };

  if (!raw) return attachFlag(structuredClone(defaultState), false);

  try {
    const parsed = migrateState(JSON.parse(raw), { defaultState, stateVersion });
    return attachFlag(
      {
        seed: typeof parsed.seed === "number" ? parsed.seed : defaultState.seed,
        world: normalizeWorld(parsed.world, { defaultWorld, legacyWorld }),
        timeOfDay: clampNumber(parsed.timeOfDay, 0, 1, defaultState.timeOfDay),
        ui: {
          chatOpen: Boolean(parsed.ui?.chatOpen),
          actionTraceVisible: parsed.ui?.actionTraceVisible !== false,
        },
        player: {
          position: parsed.player?.position || defaultState.player.position,
          yaw: parsed.player?.yaw || 0,
          pitch: parsed.player?.pitch || 0,
        },
        chat: Array.isArray(parsed.chat) ? parsed.chat : [],
      },
      true
    );
  } catch {
    return attachFlag(structuredClone(defaultState), false);
  }
}

export function savePersistedState({
  storageKey,
  stateVersion,
  resetInProgress,
  state,
  worldTime,
  dayLengthSeconds,
  chatOpen,
  player,
  chatState,
}) {
  if (resetInProgress) return;
  const payload = {
    version: stateVersion,
    seed: state.seed,
    world: state.world,
    timeOfDay: clampNumber(worldTime / dayLengthSeconds, 0, 1, 0),
    ui: {
      chatOpen,
      actionTraceVisible: state.ui?.actionTraceVisible !== false,
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
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function migrateState(parsed, { defaultState, stateVersion }) {
  if (!parsed || typeof parsed !== "object") {
    return { ...defaultState, version: stateVersion };
  }
  const version = Number.isInteger(parsed.version) ? parsed.version : 1;
  if (version >= stateVersion) {
    return parsed;
  }
  let next = { ...parsed };
  if (version < 2) {
    next = {
      ...next,
      version: 2,
      ui: {
        chatOpen: Boolean(next.ui?.chatOpen),
        actionTraceVisible: next.ui?.actionTraceVisible !== false,
      },
      chat: Array.isArray(next.chat) ? next.chat.slice(-120) : [],
    };
  }
  return next;
}

function normalizeWorld(value, { defaultWorld, legacyWorld }) {
  const source = value && typeof value === "object" ? value : {};
  const terrain = source.terrain && typeof source.terrain === "object" ? source.terrain : {};
  const terrainDetailCfg = source.terrainDetail && typeof source.terrainDetail === "object" ? source.terrainDetail : {};
  const biomeStylesCfg = source.biomeStyles && typeof source.biomeStyles === "object" ? source.biomeStyles : {};
  const biomeSettingsCfg = source.biomeSettings && typeof source.biomeSettings === "object" ? source.biomeSettings : {};
  const waterCfg = source.water && typeof source.water === "object" ? source.water : {};
  const fogCfg = source.fog && typeof source.fog === "object" ? source.fog : {};
  const treesCfg = source.trees && typeof source.trees === "object" ? source.trees : {};
  const landmarks = Array.isArray(source.landmarks) ? source.landmarks : [];
  const rawFogDensity = clampNumber(fogCfg.density, 0.001, 0.08, defaultWorld.fog.density);
  const fogDensity = rawFogDensity === 0.015 ? defaultWorld.fog.density : rawFogDensity;
  const terrainColor = remapLegacyColor(
    toColorHex(source.terrainColor, defaultWorld.terrainColor),
    legacyWorld.terrainColor,
    defaultWorld.terrainColor
  );
  const trunkColor = remapLegacyColor(
    toColorHex(treesCfg.trunkColor, defaultWorld.trees.trunkColor),
    legacyWorld.trees.trunkColor,
    defaultWorld.trees.trunkColor
  );
  const canopyColor = remapLegacyColor(
    toColorHex(treesCfg.canopyColor, defaultWorld.trees.canopyColor),
    legacyWorld.trees.canopyColor,
    defaultWorld.trees.canopyColor
  );
  const waterColor = remapLegacyColor(
    toColorHex(waterCfg.colorHex, defaultWorld.water.colorHex),
    legacyWorld.water.colorHex,
    defaultWorld.water.colorHex
  );
  const fogColor = remapLegacyColor(
    toColorHex(fogCfg.colorHex, defaultWorld.fog.colorHex),
    legacyWorld.fog.colorHex,
    defaultWorld.fog.colorHex
  );
  return {
    terrain: {
      noiseScale: clampNumber(terrain.noiseScale, 0.005, 0.25, defaultWorld.terrain.noiseScale),
      baseHeight: clampNumber(terrain.baseHeight, 1, 80, defaultWorld.terrain.baseHeight),
      ridgeScale: clampNumber(terrain.ridgeScale, 0.5, 6, defaultWorld.terrain.ridgeScale),
      ridgeHeight: clampNumber(terrain.ridgeHeight, 0, 50, defaultWorld.terrain.ridgeHeight),
    },
    terrainDetail: {
      renderDistance: clampNumber(terrainDetailCfg.renderDistance, 0, 300, defaultWorld.terrainDetail.renderDistance),
      intensity: clampNumber(terrainDetailCfg.intensity, 0, 3, defaultWorld.terrainDetail.intensity ?? 1),
    },
    terrainColor,
    biomeStyles: normalizeBiomeStyles(biomeStylesCfg),
    biomeSettings: normalizeBiomeSettings(biomeSettingsCfg),
    trees: {
      density: clampNumber(treesCfg.density, 0, 1.2, defaultWorld.trees.density),
      trunkColor,
      canopyColor,
    },
    water: {
      level: clampNumber(waterCfg.level, -30, 80, defaultWorld.water.level),
      colorHex: waterColor,
      opacity: clampNumber(waterCfg.opacity, 0.05, 1, defaultWorld.water.opacity),
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

function normalizeBiomeStyles(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [biomeId, cfg] of Object.entries(value)) {
    if (!cfg || typeof cfg !== "object") continue;
    const next = {};
    const terrainColor = toColorHex(cfg.terrainColor, null);
    const waterColorHex = toColorHex(cfg.waterColorHex, null);
    const fogColorHex = toColorHex(cfg.fogColorHex, null);
    const treeTrunkColor = toColorHex(cfg.treeTrunkColor, null);
    const treeCanopyColor = toColorHex(cfg.treeCanopyColor, null);
    if (terrainColor) next.terrainColor = terrainColor;
    if (waterColorHex) next.waterColorHex = waterColorHex;
    if (fogColorHex) next.fogColorHex = fogColorHex;
    if (treeTrunkColor) next.treeTrunkColor = treeTrunkColor;
    if (treeCanopyColor) next.treeCanopyColor = treeCanopyColor;
    if (Object.keys(next).length > 0) out[String(biomeId)] = next;
  }
  return out;
}

function normalizeBiomeSettings(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [biomeId, cfg] of Object.entries(value)) {
    if (!cfg || typeof cfg !== "object") continue;
    const next = {};
    const fogDensityMultiplier = clampNumber(cfg.fogDensityMultiplier, 0.2, 3, null);
    if (typeof fogDensityMultiplier === "number") {
      next.fogDensityMultiplier = fogDensityMultiplier;
    }
    const terrainCfg = cfg.terrainProfile && typeof cfg.terrainProfile === "object" ? cfg.terrainProfile : {};
    const terrainProfile = {};
    if (typeof terrainCfg.noiseAlgorithm === "string") {
      const algorithm = String(terrainCfg.noiseAlgorithm).trim().toLowerCase();
      if (["fbm_ridged", "billow", "ridged", "warped", "hybrid"].includes(algorithm)) {
        terrainProfile.noiseAlgorithm = algorithm;
      }
    }
    copyClampedNumber(terrainCfg, terrainProfile, "noiseScaleMultiplier", 0.2, 4);
    copyClampedNumber(terrainCfg, terrainProfile, "baseHeightMultiplier", 0.1, 4);
    copyClampedNumber(terrainCfg, terrainProfile, "ridgeScaleMultiplier", 0.2, 4);
    copyClampedNumber(terrainCfg, terrainProfile, "ridgeHeightMultiplier", 0, 4);
    copyClampedNumber(terrainCfg, terrainProfile, "octaves", 1, 8, true);
    copyClampedNumber(terrainCfg, terrainProfile, "lacunarity", 1.1, 4);
    copyClampedNumber(terrainCfg, terrainProfile, "gain", 0.1, 0.9);
    copyClampedNumber(terrainCfg, terrainProfile, "warpStrength", 0, 1.2);
    copyClampedNumber(terrainCfg, terrainProfile, "warpScaleMultiplier", 0.2, 5);
    copyClampedNumber(terrainCfg, terrainProfile, "secondaryAmount", -1, 1);
    copyClampedNumber(terrainCfg, terrainProfile, "heightOffset", -200, 200);
    if (Object.keys(terrainProfile).length > 0) {
      next.terrainProfile = terrainProfile;
    }
    if (Object.keys(next).length > 0) {
      out[String(biomeId)] = next;
    }
  }
  return out;
}

function copyClampedNumber(src, target, key, min, max, integer = false) {
  if (typeof src?.[key] !== "number" || !Number.isFinite(src[key])) return;
  const raw = integer ? Math.round(src[key]) : src[key];
  target[key] = clampNumber(raw, min, max, raw);
}

export function clampNumber(value, min, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function toColorHex(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return fallback;
  return trimmed.toLowerCase();
}

export function remapLegacyColor(color, legacyColor, nextColor) {
  return color === legacyColor ? nextColor : color;
}
