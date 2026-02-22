import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { handleCodexMessage } from "./codexAdapter.js";
import { handleRepoMessage } from "./repoAgent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(__dirname, ".env"), override: false, quiet: true });

const port = Number(process.env.PORT || 8787);
const backendMode = (process.env.CODEX_BACKEND_MODE || "repo").trim().toLowerCase();
const wss = new WebSocketServer({ port });

console.log(`Codex bridge listening on ws://localhost:${port} (mode=${backendMode})`);

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "backend_info", mode: backendMode }));

  socket.on("message", async (data) => {
    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch (err) {
      socket.send(JSON.stringify({ type: "output", content: `Invalid JSON: ${err.message}` }));
      return;
    }

    if (payload.type !== "message") return;

    const requestId = payload.requestId || null;
    const send = (msg) => {
      socket.send(JSON.stringify({ ...msg, requestId }));
    };

    try {
      const route = shouldUseWorldMode(payload.message, backendMode) ? "world" : "repo";
      send({ type: "route_info", route });
      send({ type: "trace", status: "info", phrase: route === "repo" ? "Routing to repo editor" : "Routing to world updater" });
      if (route === "world") {
        await handleCodexMessage(payload, send);
      } else {
        await handleRepoMessage(payload, send, { repoRoot });
      }
      if (requestId) {
        send({ type: "final", reply: { output: "Update pipeline complete.", taskComplete: true } });
      }
    } catch (err) {
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
