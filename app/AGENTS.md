# App Agent Notes

Focus: realtime world runtime. Keep state durable and avoid forced reloads.

## Modules
- `main.js` owns renderer, controls, terrain chunks, and Codex bridge.
- `worker.js` simulates Codex for now; replace with actual messaging.
- WebSocket bridge defaults to `ws://localhost:8787` and falls back to worker if unavailable.

## Update protocol
`applyUpdate(update)` should accept:
- `actions` (array): validated runtime actions from Codex.
- Supported action types: `set_seed`, `set_terrain`, `set_water`, `set_fog`, `set_terrain_color`, `set_trees`, `spawn_landmark`, `clear_landmarks`.
- `chatNote` (string): add a Codex output entry.

Add new keys cautiously and always persist to `localStorage`.
