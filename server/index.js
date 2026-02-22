import dotenv from "dotenv";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import { handleCodexMessage } from "./codexAdapter.js";
import { handleRepoMessage } from "./repoAgent.js";
import {
  PROTOCOL_VERSION,
  SERVER_CAPABILITIES,
  negotiateProtocol,
  normalizeEnvelope,
  serializeMessage,
} from "../shared/protocol.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(__dirname, ".env"), override: false, quiet: true });

const port = Number(process.env.PORT || 8787);
const backendMode = (process.env.CODEX_BACKEND_MODE || "repo").trim().toLowerCase();
const routerModel = (process.env.CODEX_ROUTER_MODEL || process.env.CODEX_MODEL || "gpt-5-mini").trim();

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const body = {
      ok: true,
      service: "endless-codex-bridge",
      mode: backendMode,
      protocolVersion: PROTOCOL_VERSION,
      now: new Date().toISOString(),
    };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not_found" }));
});

const wss = new WebSocketServer({ server });
server.listen(port, () => {
  log("info", "server_started", { port, mode: backendMode, protocolVersion: PROTOCOL_VERSION });
  console.log(`Codex bridge listening on ws://localhost:${port} (mode=${backendMode})`);
});

wss.on("connection", (socket) => {
  socket.send(
    serializeMessage({
      type: "backend_info",
      mode: backendMode,
      protocolVersion: PROTOCOL_VERSION,
      capabilities: SERVER_CAPABILITIES,
      timestamp: Date.now(),
    })
  );

  socket.on("message", async (data) => {
    let incoming;
    try {
      incoming = normalizeEnvelope(JSON.parse(data.toString()), { protocolVersion: PROTOCOL_VERSION });
    } catch (err) {
      socket.send(serializeMessage({ type: "output", content: `Invalid JSON: ${err.message}` }));
      return;
    }

    if (incoming.type !== "message") return;

    const requestId = incoming.requestId || null;
    const negotiatedProtocol = negotiateProtocol(
      Array.isArray(incoming.capabilities?.protocolVersions)
        ? incoming.capabilities.protocolVersions
        : [incoming.protocolVersion],
      incoming.protocolVersion
    );

    const send = (msg) => {
      const envelope = {
        ...msg,
        requestId,
        protocolVersion: negotiatedProtocol,
        timestamp: Date.now(),
      };
      socket.send(serializeMessage(envelope));
    };

    try {
      const route = await determineRoute(incoming, backendMode);
      log("info", "request_received", { requestId, route, mode: backendMode, protocolVersion: negotiatedProtocol });
      send({ type: "route_info", route });
      send({ type: "trace", status: "info", phrase: route === "repo" ? "Routing to repo editor" : "Routing to world updater" });

      let handlerResult = { ok: true, taskComplete: true };
      if (route === "world") {
        handlerResult = (await handleCodexMessage(incoming, send)) || handlerResult;
      } else {
        handlerResult = (await handleRepoMessage(incoming, send, { repoRoot })) || handlerResult;
      }

      if (requestId) {
        send({ type: "final", reply: { output: "Update pipeline complete.", taskComplete: Boolean(handlerResult.taskComplete) } });
      }
      log("info", "request_completed", { requestId, route, ok: handlerResult.ok !== false, taskComplete: Boolean(handlerResult.taskComplete) });
    } catch (err) {
      log("error", "request_failed", { requestId, error: err.message });
      send({ type: "output", content: `Codex adapter error: ${err.message}` });
    }
  });
});

async function determineRoute(incoming, mode) {
  if (mode === "world") return "world";
  if (mode === "repo") return "repo";
  const text = normalizeText(incoming?.message);
  if (isForcedWorldCommand(text)) return "world";
  const llmRoute = await classifyHybridRouteWithLlm(incoming);
  if (llmRoute === "world" || llmRoute === "repo") return llmRoute;
  return "repo";
}

function shouldUseWorldMode(message, mode) {
  if (mode === "world") return true;
  if (mode === "repo") return false;
  const text = normalizeText(message);
  if (isForcedWorldCommand(text)) return true;
  return false;
}

function isForcedWorldCommand(text) {
  if (!text) return false;
  if (text.startsWith("/world ")) return true;
  if (text === "/world") return true;
  return false;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

let openaiClient = null;
let openaiClientInitialized = false;

function getOpenAiClient() {
  if (openaiClientInitialized) return openaiClient;
  openaiClientInitialized = true;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    openaiClient = null;
    return null;
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

async function classifyHybridRouteWithLlm(incoming) {
  const client = getOpenAiClient();
  if (!client) return fallbackHybridRoute(incoming?.message);

  try {
    const response = await client.responses.create({
      model: routerModel,
      input: [
        {
          role: "system",
          content: [
            "You route requests for the Endless project.",
            "Choose exactly one label: world or repo.",
            "Return only the single word label with no punctuation.",
            "world = runtime/in-world changes, terrain, biomes, teleporting, world command help, player/world state actions.",
            "repo = code edits, code review, implementation changes, tests, debugging source files, explaining code paths.",
            "If the latest user message is ambiguous, use recent chat context to infer intent.",
            "If unsure between repo and world after using context, prefer world only when the message is about game behavior or world commands; otherwise repo.",
          ].join(" "),
        },
        {
          role: "user",
          content: buildRouteClassifierContext(incoming),
        },
      ],
    });

    const raw = extractResponseText(response).trim().toLowerCase();
    const match = raw.match(/\b(world|repo)\b/);
    if (match) return match[1];
  } catch (err) {
    log("error", "route_classification_failed", { error: err.message, model: routerModel });
  }

  return fallbackHybridRoute(incoming?.message);
}

function buildRouteClassifierContext(incoming) {
  const message = typeof incoming?.message === "string" ? incoming.message : "";
  const snapshot = incoming?.snapshot && typeof incoming.snapshot === "object" ? incoming.snapshot : {};
  const chat = Array.isArray(snapshot.chat) ? snapshot.chat : [];
  const recentChat = chat.slice(-8).map((entry) => ({
    role: typeof entry?.role === "string" ? entry.role : "unknown",
    content: typeof entry?.content === "string" ? truncate(entry.content, 280) : "",
  }));

  return [
    `Latest user message: ${JSON.stringify(message)}`,
    `Recent chat context: ${JSON.stringify(recentChat)}`,
    `Snapshot hints: ${JSON.stringify({
      hasWorld: Boolean(snapshot.world),
      hasPlayer: Boolean(snapshot.player),
      timeOfDay: snapshot.timeOfDay,
    })}`,
  ].join("\n");
}

function extractResponseText(response) {
  if (!response) return "";
  if (typeof response.output_text === "string") return response.output_text;
  if (Array.isArray(response.output)) {
    const parts = [];
    for (const item of response.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const content of item.content) {
        if (content?.type === "output_text" && typeof content.text === "string") {
          parts.push(content.text);
        }
      }
    }
    return parts.join("");
  }
  return "";
}

function fallbackHybridRoute(message) {
  return shouldUseWorldMode(message, "hybrid") ? "world" : "repo";
}

function truncate(value, maxLen) {
  if (typeof value !== "string") return "";
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}...`;
}

function log(level, event, details = {}) {
  const line = {
    level,
    event,
    details,
    ts: new Date().toISOString(),
  };
  const text = JSON.stringify(line);
  if (level === "error") {
    console.error(text);
  } else {
    console.log(text);
  }
}
