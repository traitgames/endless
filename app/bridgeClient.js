import {
  CLIENT_CAPABILITIES,
  PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  normalizeEnvelope,
} from "../shared/protocol.js";

export function createBridgeClient(options) {
  const {
    url,
    onPayload,
    onStatus,
    connectTimeoutMs = 5000,
    requestTimeoutMs = 20000,
  } = options;

  let socket = null;
  let ready = false;
  let connectWaiters = [];
  const pending = new Map();

  const connect = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(url);
    onStatus("connecting");

    socket.addEventListener("open", () => {
      ready = true;
      onStatus("connected");
      resolveConnectWaiters(true);
    });

    socket.addEventListener("message", (event) => {
      let parsed;
      try {
        parsed = normalizeEnvelope(JSON.parse(event.data), { protocolVersion: PROTOCOL_VERSION });
      } catch (err) {
        onPayload({ type: "output", content: `Codex server message error: ${err.message}` });
        return;
      }

      if (parsed.requestId && pending.has(parsed.requestId) && parsed.type === "final") {
        pending.get(parsed.requestId)(parsed.reply || null);
        pending.delete(parsed.requestId);
        return;
      }

      onPayload(parsed);
    });

    socket.addEventListener("close", () => {
      ready = false;
      onStatus("offline");
      resolveConnectWaiters(false);
    });

    socket.addEventListener("error", () => {
      ready = false;
      onStatus("error");
      resolveConnectWaiters(false);
    });
  };

  const send = async ({ message, state }) => {
    connect();
    if (socket.readyState === WebSocket.CONNECTING) {
      const opened = await waitForOpen(connectTimeoutMs);
      if (!opened) throw new Error("Codex server connection timed out");
    }
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error("Codex server is not connected");
    }

    const requestId = crypto.randomUUID();
    const payload = {
      type: "message",
      message,
      snapshot: state,
      requestId,
      timestamp: Date.now(),
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        ...CLIENT_CAPABILITIES,
        protocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
      },
    };
    socket.send(JSON.stringify(payload));

    return new Promise((resolve) => {
      pending.set(requestId, resolve);
      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          resolve(null);
        }
      }, requestTimeoutMs);
    });
  };

  return {
    connect,
    send,
    isReady: () => ready,
  };

  function resolveConnectWaiters(ok) {
    connectWaiters.forEach((resolve) => resolve(ok));
    connectWaiters = [];
  }

  function waitForOpen(timeoutMs) {
    return new Promise((resolve) => {
      if (ready && socket && socket.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }
      connectWaiters.push(resolve);
      setTimeout(() => {
        const idx = connectWaiters.indexOf(resolve);
        if (idx >= 0) {
          connectWaiters.splice(idx, 1);
          resolve(false);
        }
      }, timeoutMs);
    });
  }
}
