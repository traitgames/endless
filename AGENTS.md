# Endless Agents Guide

Project goal: a self-building 3D world that can be explored and updated live without losing state. The chat input sends requests to a Codex background process that can modify the world and apply updates while preserving runtime state.

## Current status
- Minimal 3D world with generated terrain and basic FPS controls lives in `app/`.
- Chat UI stores messages and displays simulated Codex thinking/output.
- Game state (seed, player position, chat log) is persisted in `localStorage`.
- WebSocket bridge server lives in `server/` and can be wired to a real Codex process.

## Key files
- `app/index.html`: entry point and HUD layout.
- `app/styles.css`: visual system for HUD + chat.
- `app/main.js`: world generation, controls, persistence, and Codex bridge.
- `app/actions/runtimeActions.js`: action handler registry for runtime world mutations.
- `app/trace/traceLog.js`: bounded action trace rendering helpers.
- `app/worker.js`: simulated Codex worker for now.
- `shared/protocol.js`: shared protocol versioning, envelope normalization, and action validation.
- `server/index.js`: WebSocket bridge for Codex messaging.
- `server/codexAdapter.js`: OpenAI Codex adapter for streamed responses.

## Codex bridge contract
Implement one of these without breaking the UI:
- `window.CodexBridge.send({ message, state })` -> `{ thinking, output, update }`
- Post a message to the worker and respond with `{ type: "thinking" | "output" | "update" }`.

`update` should be a JSON object that can adjust terrain, world content, or UI without restarting. Preserve `player.position`, `state.chat`, and other state unless explicitly asked to reset.

## Persistence rules
- Do not clear `localStorage` on update.
- If a refresh is required, restore `player`, `seed`, and `chat` from `localStorage`.

## Development hints
- Use `python3 -m http.server` from project root and open `/app/` in the browser.
- In another terminal, run `npm install` in `server/` then `npm start` to boot the WebSocket bridge.
- After making code changes, run `npm test` in `server/` and confirm all tests pass before finishing.
- Put `OPENAI_API_KEY` in repo `.env` (or `server/.env`) to enable real Codex responses.
- Bridge backend mode defaults to `repo` so chat can apply real file edits via local `codex exec`.
- Use `CODEX_BACKEND_MODE=world` to force runtime action updates; `hybrid` allows `/world ...` commands.

## Next improvements
- Replace worker with real Codex bridge (server or extension).
- Expand action protocol coverage and add richer entities/behaviors beyond current runtime actions.
- Add a build script when you introduce dependencies.
