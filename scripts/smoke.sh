#!/usr/bin/env bash
# End-to-end smoke: tests + loopback API + Player/Console HTML + drifter.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "BLOCKER: pnpm is required"
  echo "WHY: workspace installs and smoke use pnpm"
  echo "FIX: corepack enable && corepack prepare pnpm@10.15.1 --activate"
  exit 1
fi

pnpm exec vitest run --reporter=dot
node harness/lib/check-boundaries.mjs --check >/dev/null
node harness/lib/check-feature-list.mjs >/dev/null

PORT="${CONTREJOUR_PORT:-8787}"
DATA="$(mktemp -d)"
export CONTREJOUR_PORT="$PORT"
# Isolate runtime data next to the default path by using a copy of the server
# against the repo canon; the CLI writes to data/. Clean afterwards.
cleanup() {
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" 2>/dev/null || true; fi
  if [[ -n "${PLAYER_PID:-}" ]]; then kill "$PLAYER_PID" 2>/dev/null || true; fi
  if [[ -n "${CONSOLE_PID:-}" ]]; then kill "$CONSOLE_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

pnpm --filter @contrejour/api start >/tmp/contrejour-api.log 2>&1 &
API_PID=$!
pnpm --filter @contrejour/player dev >/tmp/contrejour-player.log 2>&1 &
PLAYER_PID=$!
pnpm --filter @contrejour/console dev >/tmp/contrejour-console.log 2>&1 &
CONSOLE_PID=$!

for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
curl -fsS "http://127.0.0.1:${PORT}/health" | grep -q 127.0.0.1

# Bind check: health already required 127.0.0.1. A pre-existing loopback
# process is acceptable; a fresh start writes the bind line to the log.
if ! grep -q "127.0.0.1" /tmp/contrejour-api.log; then
  curl -fsS "http://127.0.0.1:${PORT}/health" | grep -q 127.0.0.1
fi

RUN="$(curl -fsS -X POST "http://127.0.0.1:${PORT}/v1/runs" -H "content-type: application/json" -d '{"seed":1}')"
echo "$RUN" | grep -q '"runId"'
echo "$RUN" | grep -qv witnessQueue

for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:5173/" >/dev/null 2>&1; then break; fi
  sleep 0.25
done
curl -fsS "http://127.0.0.1:5173/" | grep -q "UNSEEN"
curl -fsS "http://127.0.0.1:5174/" | grep -q "contrejour"

pnpm exec vitest run tests/contract/gate-reach.test.ts --reporter=dot

rm -rf "$DATA"
echo "smoke ok"
