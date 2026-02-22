import test from "node:test";
import assert from "node:assert/strict";
import {
  PROTOCOL_VERSION,
  negotiateProtocol,
  normalizeAction,
  normalizeUpdate,
} from "../../shared/protocol.js";

test("negotiateProtocol picks common version", () => {
  const picked = negotiateProtocol([2, 1, 3], PROTOCOL_VERSION);
  assert.equal(picked, 1);
});

test("normalizeAction rejects malformed action", () => {
  assert.equal(normalizeAction({ type: "set_seed", seed: "bad" }), null);
  assert.equal(normalizeAction({ type: "unknown" }), null);
});

test("normalizeUpdate supports legacy keys", () => {
  const out = normalizeUpdate({ seed: 42, terrainColor: "#aabbcc" });
  assert.equal(out.ok, true);
  assert.equal(out.data.actions.length, 2);
  assert.equal(out.data.actions[0].type, "set_seed");
  assert.equal(out.data.actions[1].type, "set_terrain_color");
});

test("normalizeUpdate carries valid action batch and generates updateId", () => {
  const out = normalizeUpdate({
    actions: [
      { type: "set_trees", density: 0.3 },
      { type: "set_seed", seed: 77 },
    ],
  });
  assert.equal(out.ok, true);
  assert.equal(out.data.actions.length, 2);
  assert.ok(out.data.updateId.startsWith("upd_"));
});
