import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 180000;

export async function handleRepoMessage(payload, send, options) {
  const { message, snapshot } = payload;
  const repoRoot = options.repoRoot;

  send({ type: "trace", status: "info", phrase: "Repo edit requested" });
  send({ type: "thinking", content: "Routing request to local Codex repo agent..." });

  const tempOut = path.join(os.tmpdir(), `endless-codex-last-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  const prompt = buildPrompt(message, snapshot);

  const args = [
    "exec",
    "--cd",
    repoRoot,
    "--sandbox",
    process.env.CODEX_CLI_SANDBOX || "workspace-write",
    "--skip-git-repo-check",
    "--output-last-message",
    tempOut,
    prompt,
  ];

  if ((process.env.CODEX_CLI_FULL_AUTO || "1") === "1") {
    args.splice(1, 0, "--full-auto");
  }

  if (process.env.CODEX_MODEL && process.env.CODEX_MODEL.trim()) {
    args.splice(1, 0, "--model", process.env.CODEX_MODEL.trim());
  }

  const execResult = await runCodexExec(args, {
    timeoutMs: Number(process.env.CODEX_CLI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  });

  let lastMessage = "";
  try {
    lastMessage = (await fs.readFile(tempOut, "utf8")).trim();
  } catch {
    lastMessage = "";
  }

  await fs.rm(tempOut, { force: true }).catch(() => {});

  if (!execResult.ok) {
    if (execResult.timedOut) {
      const seconds = Math.floor(execResult.timeoutMs / 1000);
      send({ type: "trace", status: "rejected", phrase: `Repo edit timed out (${seconds}s)` });
    } else {
      send({ type: "trace", status: "rejected", phrase: "Repo edit failed" });
    }
    const detail = [
      execResult.timedOut
        ? `Codex repo agent timed out after ${Math.floor(execResult.timeoutMs / 1000)} seconds (exit ${execResult.code}).`
        : `Codex repo agent failed (exit ${execResult.code}).`,
      execResult.stderr ? `stderr (tail): ${tail(execResult.stderr, 1200)}` : "",
      execResult.stdout ? `stdout (tail): ${tail(execResult.stdout, 1200)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    send({ type: "output", content: detail });
    return;
  }

  const changedFiles = await getChangedFiles(repoRoot);
  send({
    type: "trace",
    status: "applied",
    phrase: changedFiles.length > 0 ? `Repo edit applied (${changedFiles.length} file(s))` : "Repo edit produced no file changes",
  });
  const summaryLines = [];
  if (lastMessage) summaryLines.push(lastMessage);
  if (changedFiles.length > 0) {
    summaryLines.push(`Changed files (${changedFiles.length}): ${changedFiles.slice(0, 20).join(", ")}`);
  } else {
    summaryLines.push("No file changes detected in git status.");
  }

  send({ type: "output", content: summaryLines.join("\n\n") });
}

function buildPrompt(message, snapshot) {
  return [
    "You are modifying the local repo for the Endless project.",
    "Make concrete code changes in the working tree when requested.",
    "Do not ask for approval prompts; proceed with edits and commands needed.",
    "Keep changes minimal and focused.",
    "At the end, provide a concise summary and include changed file paths.",
    "",
    `User request: ${message}`,
    "",
    `Runtime snapshot for context: ${JSON.stringify(snapshot).slice(0, 6000)}`,
  ].join("\n");
}

function runCodexExec(args, { timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn("codex", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({
        ok: false,
        code: -1,
        stdout,
        stderr: `${stderr}\nTimed out after ${timeoutMs}ms.`.trim(),
        timedOut: true,
        timeoutMs,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      finish({ ok: false, code: -1, stdout, stderr: `${stderr}\n${err.message}`.trim(), timedOut: false, timeoutMs });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      finish({ ok: code === 0, code: code ?? -1, stdout, stderr, timedOut: false, timeoutMs });
    });
  });
}

async function getChangedFiles(repoRoot) {
  const { spawnSync } = await import("node:child_process");
  const out = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], {
    encoding: "utf8",
  });
  if (out.status !== 0) return [];
  return out.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

function truncate(text, maxLen) {
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function tail(text, maxLen) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `...${text.slice(text.length - maxLen)}`;
}
