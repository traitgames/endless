import test from "node:test";
import assert from "node:assert/strict";

import { buildWorldSystemPrompt } from "../codexAdapter.js";

test("world system prompt includes injected frontend command catalog and biome settings action", () => {
  const prompt = buildWorldSystemPrompt();

  assert.equal(typeof prompt, "string");
  assert.ok(prompt.includes("set_biome_settings"), "expected biome settings action in world system prompt");
  assert.ok(
    prompt.includes("Frontend local command catalog (source: app/commandHelp.json):"),
    "expected injected frontend command catalog context"
  );
  assert.ok(prompt.includes("/world detail"), "expected /world detail command to be present in prompt context");
  assert.ok(prompt.includes("/world style"), "expected /world style command to be present in prompt context");
  assert.ok(prompt.includes("yes"), "expected confirmation command context to be present");
  assert.ok(prompt.includes("no"), "expected confirmation command context to be present");
});
