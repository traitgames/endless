import test from "node:test";
import assert from "node:assert/strict";
import { createUpdateEngine } from "../../app/updateEngine.js";

test("update engine applies batch, reports counts, and calls trace", () => {
  const traces = [];
  const notes = [];
  const applied = [];
  const engine = createUpdateEngine({
    applyAction(action) {
      applied.push(action.type);
      return { status: "applied", type: action.type, detail: "ok" };
    },
    snapshot() {
      return { marker: 1 };
    },
    restore() {
      throw new Error("restore should not be called");
    },
    onTrace(result, action) {
      traces.push({ result, action });
    },
    onChatNote(content) {
      notes.push(content);
    },
  });

  const result = engine.applyUpdate({
    updateId: "upd_test_1",
    actions: [
      { type: "set_seed", seed: 10 },
      { type: "set_trees", density: 0.2 },
      { type: "not_supported" },
    ],
    chatNote: "done",
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.appliedCount, 2);
  assert.equal(result.totalCount, 2);
  assert.equal(result.rejectedCount, 1);
  assert.deepEqual(applied, ["set_seed", "set_trees"]);
  assert.equal(traces.length, 2);
  assert.deepEqual(notes, ["done"]);
});

test("update engine rolls back when action application throws", () => {
  let restored = null;
  const engine = createUpdateEngine({
    applyAction(action) {
      if (action.type === "set_trees") {
        throw new Error("boom");
      }
      return { status: "applied", type: action.type, detail: "ok" };
    },
    snapshot() {
      return { before: true };
    },
    restore(snapshot) {
      restored = snapshot;
    },
  });

  const result = engine.applyUpdate({
    updateId: "upd_test_2",
    actions: [
      { type: "set_seed", seed: 9 },
      { type: "set_trees", density: 0.3 },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "apply_failed:boom");
  assert.deepEqual(restored, { before: true });
});

test("update engine dedupes update ids", () => {
  const engine = createUpdateEngine({
    applyAction(action) {
      return { status: "applied", type: action.type, detail: "ok" };
    },
    snapshot() {
      return { snap: 1 };
    },
    restore() {},
  });

  const first = engine.applyUpdate({
    updateId: "upd_same",
    actions: [{ type: "set_seed", seed: 1 }],
  });
  const second = engine.applyUpdate({
    updateId: "upd_same",
    actions: [{ type: "set_seed", seed: 2 }],
  });

  assert.equal(first.ok, true);
  assert.equal(first.skipped, false);
  assert.equal(second.ok, true);
  assert.equal(second.skipped, true);
  assert.equal(second.reason, "duplicate_update");
});
