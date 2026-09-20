#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANARY="${GATE_CANARY:-$ROOT/docs/quality-canary.md}"
test -f "$CANARY"
