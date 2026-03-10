export const DEFAULT_SPAWN_SEARCH_STEP = 24;
export const DEFAULT_SPAWN_SEARCH_MAX_DISTANCE = 2000;

function normalizeDistance(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeStep(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function buildSpawnSearchRadii(
  maxDistance = DEFAULT_SPAWN_SEARCH_MAX_DISTANCE,
  step = DEFAULT_SPAWN_SEARCH_STEP
) {
  const safeMaxDistance = normalizeDistance(maxDistance, DEFAULT_SPAWN_SEARCH_MAX_DISTANCE);
  const safeStep = normalizeStep(step, DEFAULT_SPAWN_SEARCH_STEP);
  const radii = [0];
  for (let radius = safeStep; radius < safeMaxDistance; radius += safeStep) {
    radii.push(radius);
  }
  if (radii[radii.length - 1] !== safeMaxDistance) {
    radii.push(safeMaxDistance);
  }
  return radii;
}

export function buildSpawnRingOffsets(radius, step = DEFAULT_SPAWN_SEARCH_STEP) {
  const safeRadius = normalizeDistance(radius, 0);
  const safeStep = normalizeStep(step, DEFAULT_SPAWN_SEARCH_STEP);
  if (safeRadius === 0) return [0];
  const offsets = [];
  for (let offset = -safeRadius; offset < safeRadius; offset += safeStep) {
    offsets.push(offset);
  }
  offsets.push(safeRadius);
  return offsets;
}

export function buildSpawnRingPositions(radius, step = DEFAULT_SPAWN_SEARCH_STEP) {
  const safeRadius = normalizeDistance(radius, 0);
  if (safeRadius === 0) return [[0, 0]];
  const offsets = buildSpawnRingOffsets(safeRadius, step);
  const positions = [];
  const seen = new Set();
  const addPosition = (x, z) => {
    const key = `${x},${z}`;
    if (seen.has(key)) return;
    seen.add(key);
    positions.push([x, z]);
  };
  for (const offset of offsets) {
    addPosition(offset, -safeRadius);
    addPosition(safeRadius, offset);
    addPosition(offset, safeRadius);
    addPosition(-safeRadius, offset);
  }
  return positions;
}

export function isWithinSpawnSearchDistance(
  x,
  z,
  maxDistance = DEFAULT_SPAWN_SEARCH_MAX_DISTANCE
) {
  const safeMaxDistance = normalizeDistance(maxDistance, DEFAULT_SPAWN_SEARCH_MAX_DISTANCE);
  return x * x + z * z <= safeMaxDistance * safeMaxDistance;
}
