import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSpawnRingOffsets,
  buildSpawnRingPositions,
  buildSpawnSearchRadii,
  isWithinSpawnSearchDistance,
} from "../../app/world/spawnSearch.js";

test("spawn search radii include the exact max distance ring", () => {
  const radii = buildSpawnSearchRadii(2000, 24);

  assert.equal(radii[0], 0);
  assert.equal(radii.at(-2), 1992);
  assert.equal(radii.at(-1), 2000);
});

test("spawn ring offsets include the exact radius endpoint", () => {
  const offsets = buildSpawnRingOffsets(2000, 24);

  assert.equal(offsets[0], -2000);
  assert.equal(offsets.at(-2), 1984);
  assert.equal(offsets.at(-1), 2000);
});

test("spawn ring positions keep corners unique and include the final corner", () => {
  const smallRing = buildSpawnRingPositions(48, 24);
  const largeRing = buildSpawnRingPositions(2000, 24);

  assert.equal(smallRing.length, 16);
  assert.equal(
    smallRing.filter(([x, z]) => x === 48 && z === 48).length,
    1
  );
  assert.equal(
    largeRing.filter(([x, z]) => x === 2000 && z === 2000).length,
    1
  );
});

test("spawn search distance is capped at a 2km radial boundary", () => {
  assert.equal(isWithinSpawnSearchDistance(2000, 0, 2000), true);
  assert.equal(isWithinSpawnSearchDistance(2000, 24, 2000), false);
  assert.equal(isWithinSpawnSearchDistance(1414, 1414, 2000), true);
});
