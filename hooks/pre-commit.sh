#!/usr/bin/env bash
# Pre-commit hook for contrejour.
# Installed via hooks/install.sh or automatically by create-spec-kit.
# Philosophy: fast, fail-closed on real errors, fail-open on unreachable services.

set -euo pipefail

# Exit cleanly if nothing is staged.
if git diff --cached --quiet; then
  exit 0
fi

STAGED=$(git diff --cached --name-only --diff-filter=ACM)

failed=0

# --- DESIGN.md lint ----------------------------------------------------------
if echo "$STAGED" | grep -q '^DESIGN\.md$'; then
  echo "pre-commit: linting DESIGN.md..."
  if node -e "const p=require('./package.json');process.exit(p.scripts?.['design:lint']?0:1)" 2>/dev/null; then
    if ! npm run --silent design:lint >/dev/null; then
      echo "  DESIGN.md lint failed. Run: npm run design:lint"
      failed=1
    fi
  else
    echo "  DESIGN.md lint is not configured. Add a locked local dependency and a design:lint package script."
    failed=1
  fi
fi

# Warn on hardcoded hex colors in UI files (potential drift from DESIGN.md tokens).
if echo "$STAGED" | grep -qE '\.(tsx|jsx|vue|svelte|css|scss)$'; then
  matches=$(echo "$STAGED" \
    | grep -E '\.(tsx|jsx|vue|svelte|css|scss)$' \
    | xargs -I{} grep -HnE '#[0-9a-fA-F]{3,8}\b' {} 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "pre-commit: hardcoded hex values found. Consider adding to DESIGN.md first:"
    echo "$matches" | head -20
    echo "  (warning only; not blocking)"
  fi
fi

# --- Secrets check -----------------------------------------------------------
# Block obvious committed secrets (token-looking strings, .env content).
if echo "$STAGED" | xargs grep -HnE '\b(AKIA|AIza|ghp_|ghs_|gho_|xox[abprs]-)[A-Za-z0-9]{20,}\b' 2>/dev/null | grep -v '^Binary'; then
  echo "pre-commit: potential secret detected. Use a secret manager, not git."
  failed=1
fi

# --- CLAUDE.md / AGENTS.md sync check ---------------------------------------
# If either file changed in this commit, verify they still agree on the
# canonical shared rules. Fail-open if Node is unavailable (matches the
# fail-open philosophy of the rest of this hook).
if echo "$STAGED" | grep -qE '^(CLAUDE\.md|AGENTS\.md)$'; then
  if [ -f scripts/check-sync.mjs ] && command -v node >/dev/null 2>&1; then
    echo "pre-commit: checking CLAUDE.md <-> AGENTS.md sync..."
    if ! node scripts/check-sync.mjs .; then
      echo "  Sync drift detected. See messages above for the missing rule(s)."
      failed=1
    fi
  else
    echo "pre-commit: [warn] scripts/check-sync.mjs or node missing; skipping sync check"
  fi
fi

# --- Module boundary ratchet -------------------------------------------------
# Rationale: production boundary-gate post-mortem (F1/F7) — the boundary
# check was never wired into any hook, so drift was invisible locally. Fail
# CLOSED on a regression over baseline; fail OPEN when node or the config is
# absent (matches this hook's "fail-open on unreachable/absent tooling" rule).
if [ -f harness/boundaries.config.json ]; then
  if command -v node >/dev/null 2>&1; then
    echo "pre-commit: running module-boundary ratchet..."
    if ! node harness/lib/check-boundaries.mjs --check --json harness/boundaries.report.json; then
      echo "  Boundary regression (see WHY/FIX above). Do not weaken the gate."
      failed=1
    fi
  else
    echo "pre-commit: [warn] node missing; skipping boundary ratchet (fail-open)"
  fi
fi

if [ "$failed" -ne 0 ]; then
  echo
  echo "pre-commit FAILED. Fix the issues above, or skip with: git commit --no-verify"
  echo "(If you bypass with --no-verify, note why in claude-progress.md — a bypassed gate is still a gate.)"
  exit 1
fi

exit 0
