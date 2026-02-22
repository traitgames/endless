import test from "node:test";
import assert from "node:assert/strict";
import { createBridgeClient } from "../../app/bridgeClient.js";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.instances.push(this);

    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.dispatch("open", {});
      this.dispatch("message", {
        data: JSON.stringify({
          type: "backend_info",
          mode: "repo",
          protocolVersion: 1,
          capabilities: { routeInfo: true },
        }),
      });
    });
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }

  send(text) {
    this.sent.push(text);
    const payload = JSON.parse(text);

    queueMicrotask(() => {
      this.dispatch("message", {
        data: JSON.stringify({ type: "route_info", requestId: payload.requestId, route: "repo" }),
      });
      this.dispatch("message", {
        data: JSON.stringify({ type: "trace", requestId: payload.requestId, status: "info", phrase: "Routing" }),
      });
      this.dispatch("message", {
        data: JSON.stringify({ type: "final", requestId: payload.requestId, reply: { taskComplete: true } }),
      });
    });
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", {});
  }

  dispatch(event, data) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((fn) => fn(data));
  }
}

test("bridge client lifecycle emits payloads and resolves final reply", async () => {
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;

  const statuses = [];
  const payloads = [];

  try {
    const bridge = createBridgeClient({
      url: "ws://localhost:8787",
      onPayload(payload) {
        payloads.push(payload);
      },
      onStatus(status) {
        statuses.push(status);
      },
      connectTimeoutMs: 100,
      requestTimeoutMs: 100,
    });

    const reply = await bridge.send({ message: "test", state: { foo: 1 } });

    assert.equal(bridge.isReady(), true);
    assert.ok(statuses.includes("connecting"));
    assert.ok(statuses.includes("connected"));

    const backendInfo = payloads.find((p) => p.type === "backend_info");
    const routeInfo = payloads.find((p) => p.type === "route_info");
    const trace = payloads.find((p) => p.type === "trace");

    assert.ok(backendInfo, "expected backend_info payload");
    assert.equal(routeInfo?.route, "repo");
    assert.equal(trace?.phrase, "Routing");
    assert.deepEqual(reply, { taskComplete: true });

    const sentRaw = FakeWebSocket.instances[0].sent[0];
    const sent = JSON.parse(sentRaw);
    assert.equal(sent.type, "message");
    assert.equal(sent.protocolVersion, 1);
    assert.deepEqual(sent.capabilities.protocolVersions, [1]);
    assert.equal(typeof sent.requestId, "string");
    assert.ok(sent.requestId.length > 10);
  } finally {
    globalThis.WebSocket = originalWebSocket;
    FakeWebSocket.instances.length = 0;
  }
});
