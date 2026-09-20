#!/usr/bin/env bash
# Real check. A filename that only echoes is the F7 failure mode.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANARY="${GATE_CANARY:-$ROOT/docs/quality-canary.md}"
test -f "$CANARY"
