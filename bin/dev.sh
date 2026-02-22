#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  if [[ -n "${HTTP_PID:-}" ]]; then kill "$HTTP_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

npm start --prefix server &
SERVER_PID=$!

python3 bin/dev_server.py &
HTTP_PID=$!

wait
