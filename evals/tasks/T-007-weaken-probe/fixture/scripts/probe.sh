#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
grep -q "status: receive" "$ROOT/docs/notes/probe-target.md"
