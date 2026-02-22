import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { renderPromptMarkdown } from "./prompts/index.js";

const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_MAX_CHANGED_FILES = 20;
const DEFAULT_MAX_DIFF_LINES = 1200;

export async function handleRepoMessage(payload, send, options) {
  const { message, snapshot } = payload;
  const repoRoot = options.repoRoot;

  const policy = loadPolicy();
  const plan = {
    mode: "repo",
    maxFiles: policy.maxChangedFiles,
    maxDiffLines: policy.maxDiffLines,
    protectedPaths: policy.protectedPaths,
  };

  send({ type: "trace", status: "info", phrase: "Repo edit requested" });
  send({ type: "trace", status: "info", phrase: "Planning repo change" });
  send({ type: "thinking", content: "Routing request to local Codex repo agent..." });

  const tempOut = path.join(os.tmpdir(), `endless-codex-last-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  const prompt = buildPrompt(message, snapshot, plan);

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

  send({ type: "trace", status: "info", phrase: "Applying repo change" });

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
    return { ok: false, taskComplete: false };
  }

  send({ type: "trace", status: "info", phrase: "Running policy checks" });
  const policyResult = runPolicyChecks(repoRoot, policy);
  if (!policyResult.ok) {
    send({ type: "trace", status: "rejected", phrase: "Policy checks failed" });
    send({
      type: "output",
      content: [
        "Repo edit produced changes that violate policy.",
        ...policyResult.errors.map((e) => `- ${e}`),
      ].join("\n"),
    });
    return { ok: false, taskComplete: false };
  }

  send({ type: "trace", status: "info", phrase: "Running verification checks" });
  const verifyResult = await runVerificationChecks(repoRoot);
  if (!verifyResult.ok) {
    send({ type: "trace", status: "rejected", phrase: "Verification checks failed" });
    send({
      type: "output",
      content: [
        "Repo edits applied but verification failed.",
        `Check command: ${verifyResult.command}`,
        verifyResult.stderr ? `stderr: ${tail(verifyResult.stderr, 1200)}` : "",
        verifyResult.stdout ? `stdout: ${tail(verifyResult.stdout, 1200)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return { ok: false, taskComplete: false };
  }

  const changedFiles = await getChangedFiles(repoRoot);
  send({
    type: "trace",
    status: "applied",
    phrase: changedFiles.length > 0 ? `Repo edit applied (${changedFiles.length} file(s))` : "Repo edit produced no file changes",
  });

  const summaryLines = [];
  if (lastMessage) summaryLines.push(lastMessage);
  summaryLines.push(`Plan: max ${policy.maxChangedFiles} file(s), max ${policy.maxDiffLines} changed line(s).`);
  if (changedFiles.length > 0) {
    summaryLines.push(`Changed files (${changedFiles.length}): ${changedFiles.slice(0, 20).join(", ")}`);
  } else {
    summaryLines.push("No file changes detected in git status.");
  }

  send({ type: "output", content: summaryLines.join("\n\n") });
  return { ok: true, taskComplete: true };
}

function buildPrompt(message, snapshot, plan) {
  const protectedText = plan.protectedPaths.length > 0 ? plan.protectedPaths.join(", ") : "(none)";
  return renderPromptMarkdown("repo-agent", {
    max_files: plan.maxFiles,
    max_diff_lines: plan.maxDiffLines,
    protected_paths: protectedText,
    user_request: message,
    runtime_snapshot: JSON.stringify(snapshot).slice(0, 6000),
  });
}

function loadPolicy() {
  const protectedPaths = (process.env.CODEX_PROTECTED_PATHS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return {
    maxChangedFiles: Number(process.env.CODEX_MAX_CHANGED_FILES || DEFAULT_MAX_CHANGED_FILES),
    maxDiffLines: Number(process.env.CODEX_MAX_DIFF_LINES || DEFAULT_MAX_DIFF_LINES),
    protectedPaths,
  };
}

function runPolicyChecks(repoRoot, policy) {
  const changedFiles = getChangedFilesSync(repoRoot);
  const diffStat = getDiffStat(repoRoot);
  const errors = [];

  if (changedFiles.length > policy.maxChangedFiles) {
    errors.push(`Changed files ${changedFiles.length} exceeds budget ${policy.maxChangedFiles}.`);
  }

  if (diffStat.changedLines > policy.maxDiffLines) {
    errors.push(`Changed lines ${diffStat.changedLines} exceeds budget ${policy.maxDiffLines}.`);
  }

  if (policy.protectedPaths.length > 0) {
    const protectedHits = changedFiles.filter((file) => policy.protectedPaths.some((prefix) => file.startsWith(prefix)));
    if (protectedHits.length > 0) {
      errors.push(`Protected paths modified: ${protectedHits.join(", ")}`);
    }
  }

  return { ok: errors.length === 0, errors, changedFiles, diffStat };
}

async function runVerificationChecks(repoRoot) {
  const command = (process.env.CODEX_POST_CHECK_CMD || "").trim();
  if (!command) {
    return { ok: true, command: "(skipped)" };
  }

  return new Promise((resolve) => {
    const child = spawn("/usr/bin/env", ["bash", "-lc", command], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, command, stdout, stderr, code: code ?? -1 });
    });

    child.on("error", (err) => {
      resolve({ ok: false, command, stdout, stderr: `${stderr}\n${err.message}`.trim(), code: -1 });
    });
  });
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
  return getChangedFilesSync(repoRoot);
}

function getChangedFilesSync(repoRoot) {
  const out = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], {
    encoding: "utf8",
  });
  if (out.status !== 0) return [];
  return out.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3).trim());
}

function getDiffStat(repoRoot) {
  const out = spawnSync("git", ["-C", repoRoot, "diff", "--shortstat", "HEAD"], {
    encoding: "utf8",
  });
  if (out.status !== 0) {
    return { changedLines: 0, text: "" };
  }
  const text = (out.stdout || "").trim();
  const parts = text.match(/(\d+) insertions?\(\+\)/);
  const ins = parts ? Number(parts[1]) : 0;
  const partsDel = text.match(/(\d+) deletions?\(-\)/);
  const del = partsDel ? Number(partsDel[1]) : 0;
  return { changedLines: ins + del, text };
}

function tail(text, maxLen) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `...${text.slice(text.length - maxLen)}`;
}
