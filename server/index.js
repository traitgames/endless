import dotenv from "dotenv";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
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
      const route = shouldUseWorldMode(incoming.message, backendMode) ? "world" : "repo";
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

function shouldUseWorldMode(message, mode) {
  if (mode === "world") return true;
  if (mode === "repo") return false;
  const text = (message || "").trim().toLowerCase();
  if (text.startsWith("/world ")) return true;
  if (text === "/world") return true;
  return false;
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
