export function createRuntimeActionExecutor(deps) {
  const {
    state,
    player,
    scene,
    water,
    seedEl,
    terrainMaterial,
    treeChunks,
    chunkSize,
    clampNumber,
    toColorHex,
    syncAtmosphereFromState,
    syncTerrainShaderUniforms,
    syncTreeMaterials,
    ensureChunks,
    rebuildTerrain,
    rebuildLandmarks,
    setNoiseSeed,
    setTimeOfDay,
    runLocalWorldCommand,
  } = deps;

  function setTerrainNumber(key, value, min, max) {
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
    state.world.terrain[key] = clampNumber(value, min, max, state.world.terrain[key]);
    return true;
  }

  const actionHandlers = {
    set_seed(action) {
      if (typeof action.seed !== "number" || !Number.isFinite(action.seed)) {
        return traceResult("rejected", "set_seed", "invalid seed");
      }
      if (action.seed === state.seed) return traceResult("applied", "set_seed", "unchanged");
      state.seed = Math.trunc(action.seed);
      setNoiseSeed(state.seed);
      seedEl.textContent = state.seed;
      rebuildTerrain();
      return traceResult("applied", "set_seed", `seed=${state.seed}`);
    },
    set_terrain(action) {
      let touched = false;
      touched = setTerrainNumber("noiseScale", action.noiseScale, 0.005, 0.25) || touched;
      touched = setTerrainNumber("baseHeight", action.baseHeight, 1, 80) || touched;
      touched = setTerrainNumber("ridgeScale", action.ridgeScale, 0.5, 6) || touched;
      touched = setTerrainNumber("ridgeHeight", action.ridgeHeight, 0, 50) || touched;
      if (!touched) return traceResult("rejected", "set_terrain", "no valid fields");
      rebuildTerrain();
      return traceResult("applied", "set_terrain", "terrain params updated");
    },
    set_time(action) {
      if (typeof action.timeOfDay !== "number" || !Number.isFinite(action.timeOfDay)) {
        return traceResult("rejected", "set_time", "invalid timeOfDay");
      }
      const applied = setTimeOfDay(action.timeOfDay, null, { silent: true });
      return applied
        ? traceResult("applied", "set_time", `time=${state.timeOfDay.toFixed(3)}`)
        : traceResult("rejected", "set_time", "invalid timeOfDay");
    },
    set_water(action) {
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
    },
    set_fog(action) {
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
    },
    set_terrain_color(action) {
      if (typeof action.colorHex !== "string") return traceResult("rejected", "set_terrain_color", "invalid color");
      state.world.terrainColor = toColorHex(action.colorHex, state.world.terrainColor);
      terrainMaterial.color.set(state.world.terrainColor);
      syncTerrainShaderUniforms();
      return traceResult("applied", "set_terrain_color", `color=${state.world.terrainColor}`);
    },
    set_trees(action) {
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
      const cx = Math.floor(player.position.x / chunkSize);
      const cz = Math.floor(player.position.z / chunkSize);
      ensureChunks(cx, cz);
      return traceResult("applied", "set_trees", "tree settings updated");
    },
    spawn_landmark(action) {
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
    },
    clear_landmarks() {
      state.world.landmarks = [];
      rebuildLandmarks();
      return traceResult("applied", "clear_landmarks", "all landmarks cleared");
    },
    run_local_world_command(action) {
      if (typeof action.command !== "string" || !action.command.trim()) {
        return traceResult("rejected", "run_local_world_command", "invalid command");
      }
      if (typeof runLocalWorldCommand !== "function") {
        return traceResult("rejected", "run_local_world_command", "handler unavailable");
      }
      const handled = runLocalWorldCommand(action.command);
      return handled
        ? traceResult("applied", "run_local_world_command", action.command.trim())
        : traceResult("rejected", "run_local_world_command", "unhandled command");
    },
  };

  return {
    applyAction(action) {
      if (!action || typeof action !== "object" || typeof action.type !== "string") {
        return traceResult("rejected", "unknown", "invalid action payload");
      }
      const handler = actionHandlers[action.type];
      if (!handler) {
        return traceResult("rejected", action.type, "unsupported action type");
      }
      return handler(action);
    },
  };
}

function traceResult(status, type, detail) {
  return { status, type, detail };
}
