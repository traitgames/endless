import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { handleCodexMessage } from "../codexAdapter.js";
import { handleRepoMessage } from "../repoAgent.js";

test("world handler contract when OPENAI_API_KEY is missing", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const sent = [];
  const send = (msg) => sent.push(msg);

  try {
    const result = await handleCodexMessage(
      {
        message: "adjust fog",
        snapshot: { world: {} },
      },
      send
    );

    assert.equal(result.ok, false);
    assert.equal(result.taskComplete, false);

    const output = sent.find((msg) => msg.type === "output");
    assert.ok(output, "expected output message");
    assert.ok(output.content.includes("OPENAI_API_KEY"));
  } finally {
    if (typeof previous === "string") process.env.OPENAI_API_KEY = previous;
  }
});

test("repo handler contract returns completion boolean and emits trace/output", async () => {
  const repoRoot = path.resolve(process.cwd(), "..");
  const sent = [];
  const send = (msg) => sent.push(msg);
  const prevTimeout = process.env.CODEX_CLI_TIMEOUT_MS;
  const prevFullAuto = process.env.CODEX_CLI_FULL_AUTO;
  process.env.CODEX_CLI_TIMEOUT_MS = "2500";
  process.env.CODEX_CLI_FULL_AUTO = "0";

  try {
    const result = await handleRepoMessage(
      {
        message: "small change",
        snapshot: { state: "test" },
      },
      send,
      { repoRoot }
    );

    assert.equal(typeof result?.taskComplete, "boolean");
    assert.equal(typeof result?.ok, "boolean");

    const hasTrace = sent.some((msg) => msg.type === "trace");
    const hasOutput = sent.some((msg) => msg.type === "output");
    assert.equal(hasTrace, true);
    assert.equal(hasOutput, true);
  } finally {
    if (typeof prevTimeout === "string") process.env.CODEX_CLI_TIMEOUT_MS = prevTimeout;
    else delete process.env.CODEX_CLI_TIMEOUT_MS;
    if (typeof prevFullAuto === "string") process.env.CODEX_CLI_FULL_AUTO = prevFullAuto;
    else delete process.env.CODEX_CLI_FULL_AUTO;
  }
});
