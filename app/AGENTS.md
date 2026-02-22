# App Agent Notes

Focus: realtime world runtime. Keep state durable and avoid forced reloads.

## Modules
- `main.js` composes runtime modules and Three.js scene wiring.
- `chat/chatStore.js` owns chat rendering/state list helpers.
- `state/persistence.js` owns `localStorage` load/save + migrations.
- `player/movement.js` owns frame-by-frame player movement integration.
- `world/terrainNoise.js` owns deterministic terrain height sampling.
- `actions/runtimeActions.js` owns world action handler registry/application.
- `trace/traceLog.js` owns action trace rendering and bounded log retention.
- `bridgeClient.js` owns WebSocket transport + protocol envelope send/receive.
- `updateEngine.js` applies transactional action batches with dedupe and rollback.
- `worker.js` simulates Codex for now; replace with actual messaging.
- WebSocket bridge defaults to `ws://localhost:8787` and falls back to worker if unavailable.

## Update protocol
`applyUpdate(update)` should accept:
- `actions` (array): validated runtime actions from Codex.
- Supported action types: `set_seed`, `set_terrain`, `set_water`, `set_fog`, `set_terrain_color`, `set_trees`, `spawn_landmark`, `clear_landmarks`.
- `chatNote` (string): add a Codex output entry.

Add new keys cautiously and always persist to `localStorage`.
