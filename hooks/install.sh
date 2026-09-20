#!/usr/bin/env bash
# Install the pre-commit hook from hooks/pre-commit.sh into .git/hooks/pre-commit.
# Safe to re-run.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ ! -d "$ROOT/.git" ]; then
  echo "Not inside a git repository. Run 'git init' first."
  exit 1
fi

SRC="$ROOT/hooks/pre-commit.sh"
DEST="$ROOT/.git/hooks/pre-commit"

if [ ! -f "$SRC" ]; then
  echo "Source hook not found at $SRC"
  exit 1
fi

cp "$SRC" "$DEST"
chmod +x "$DEST"

echo "Installed pre-commit hook at $DEST"
