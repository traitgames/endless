# Server Agent Notes

Purpose: WebSocket bridge between the browser and a Codex backend.

## Files
- `index.js`: WebSocket server and message routing.
- `codexAdapter.js`: OpenAI Codex adapter for streaming responses.
- `repoAgent.js`: runs local `codex exec` to apply real repo file changes.

## Protocol
Incoming from browser:
- `{ type: "message", message, snapshot, requestId }`

Outgoing to browser:
- `{ type: "thinking", content, requestId }`
- `{ type: "output", content, requestId }`
- `{ type: "update", update, requestId }`

`requestId` is optional but recommended.

`update` uses an action list:
- `{ actions: [{ type: "set_seed" | "set_terrain" | "set_water" | "set_fog" | "set_terrain_color" | "set_trees" | "spawn_landmark" | "clear_landmarks", ... }], chatNote?: string }`

## Environment
- `OPENAI_API_KEY` is required.
- `CODEX_MODEL` (optional) defaults to `gpt-5`.
- Env loading order: repo `.env`, then `server/.env` for local overrides.
- `CODEX_BACKEND_MODE`: `repo` (default), `world`, or `hybrid`.
- `CODEX_CLI_SANDBOX`: sandbox mode for `codex exec` (default `workspace-write`).
- `CODEX_CLI_FULL_AUTO`: `1` to include `--full-auto`.
- `CODEX_CLI_TIMEOUT_MS`: max runtime for repo edits.
