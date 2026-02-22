# Endless

Endless is a browser-based 3D world you can explore while a Codex-backed chat modifies the world and/or the repo in real time.

## What It Does

- First-person movement in a generated terrain (`WASD`, mouse look, `Space` jump).
- In-game chat that routes to a local WebSocket bridge.
- Two backend modes:
- `repo`: Codex edits files in this repository.
- `world`: Codex sends runtime world actions (`set_seed`, `set_fog`, etc.).
- `hybrid`: default route is repo; prefix a message with `/world` for runtime actions.
- Persistent state across refresh (`localStorage`) including player position, world settings, chat history, and UI state.

## Repo Structure

- `app/`: browser client (Three.js world + HUD/chat)
- `app/chat`, `app/state`, `app/player`, `app/world`: focused runtime modules extracted from `main.js`
- `app/actions`, `app/trace`: action execution and trace rendering modules
- `server/`: WebSocket bridge + Codex integration
- `shared/`: protocol/versioned action validation shared by app and server
- `AGENTS.md`: project guidance for agent-driven updates

## Requirements

- Node.js 18+ (tested with newer versions)
- npm
- Python 3 (for simple local static file hosting)
- `codex` CLI installed and available on `PATH` (for repo-edit mode)
- OpenAI API key in `.env`

## Setup

1. Create local env file from example:

```sh
cp .env.example .env
```

2. Edit `.env` and set at least:

```env
OPENAI_API_KEY=your_key_here
PORT=8787
CODEX_BACKEND_MODE=repo
```

3. Install server dependencies:

```sh
cd server
npm install
```

## Quick Start

Run in two terminals.

1. Start bridge server:

```sh
cd /path/to/endless/server
npm start
```

2. Start app server:

```sh
cd /path/to/endless
python3 -m http.server
```

3. Open:

```text
http://localhost:8000/app/
```

## Controls

- `W`, `A`, `S`, `D`: move
- `Space`: jump
- `Shift`: sprint
- Mouse: look
- `R`: reset player position
- `Enter`: open/focus Create panel
- `Escape`: unfocus input

## Bridge Modes

Set in `.env`:

- `CODEX_BACKEND_MODE=repo`
- Chat requests execute `codex exec` and apply real file changes.
- Action Trace shows short repo lifecycle phrases.

- `CODEX_BACKEND_MODE=world`
- Chat requests generate world runtime actions only.
- Action Trace shows applied/rejected runtime actions.

- `CODEX_BACKEND_MODE=hybrid`
- Normal chat routes to repo mode.
- Prefix `/world` to route a request to world mode.

## Important Config

```env
# Core
OPENAI_API_KEY=...
PORT=8787
CODEX_MODEL=gpt-5.3-codex

# Backend route
CODEX_BACKEND_MODE=repo

# Repo-agent execution
CODEX_CLI_SANDBOX=workspace-write
CODEX_CLI_FULL_AUTO=1
CODEX_CLI_TIMEOUT_MS=180000
CODEX_MAX_CHANGED_FILES=20
CODEX_MAX_DIFF_LINES=1200
CODEX_PROTECTED_PATHS=shared/,server/index.js
CODEX_POST_CHECK_CMD=
```

Bridge health endpoint:

```text
http://localhost:8787/health
```

Client local storage flags:

- `endless_ws_url`: override bridge URL (default `ws://localhost:8787`)
- `endless_allow_worker_fallback=1`: enable simulated worker fallback
- `endless_auto_soft_refresh=0`: disable auto soft refresh on task completion

## UI Notes

- Minimized Create panel shows only a `Create` button.
- `Endless` status card moves below the button when minimized.
- `Reset` button clears saved state and reloads.
- Backend badge shows connection/routing state (`repo`, `world`, `hybrid`, etc.).

## Troubleshooting

- Backend badge stuck on `connecting`:
- Verify server is running on the expected port.
- Check `localStorage.endless_ws_url` value.
- Ensure app is loaded over HTTP in local dev.

- Seeing simulated responses unexpectedly:
- Disable worker fallback by ensuring `localStorage.endless_allow_worker_fallback` is not `1`.

- CSS changes not appearing:
- Local dev cache busting is built in for localhost/LAN hosts.
- If needed, do a hard refresh (`Ctrl+Shift+R`).

- No world action effects in trace:
- You are likely in `repo` mode.
- Use `world` mode or `/world ...` in `hybrid` mode.

## Security Notes

- Keep `.env` out of version control.
- Do not expose `OPENAI_API_KEY` in browser-side code.
- Repo mode can modify files automatically; use in trusted local environments.

## License

MIT (see `LICENSE`).
