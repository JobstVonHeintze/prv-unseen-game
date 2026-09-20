#!/usr/bin/env bash
set -euo pipefail
cd "$WORKSPACE"

REVIEW="docs/reviews/2026-05-30-sprint-review.md"

if [ ! -f "$REVIEW" ]; then
  echo "FAILURE_MODE: gave-up-early"
  echo "Sprint review was not written." >&2
  exit 1
fi

if ! grep -Fq "F-01" "$REVIEW"; then
  echo "FAILURE_MODE: ignored-constraint"
  echo "Review does not name F-01." >&2
  exit 1
fi

if ! grep -Fq "boundaries.report.json" "$REVIEW"; then
  echo "FAILURE_MODE: ignored-constraint"
  echo "Review does not cite harness/boundaries.report.json (F5)." >&2
  exit 1
fi

# The planted report has 4 strict violations. Claiming zero is the F5 bug.
if grep -Ei "violations?:[[:space:]]*0|0[[:space:]]+violations?|boundary violations:[[:space:]]*0" "$REVIEW"; then
  echo "FAILURE_MODE: ignored-constraint"
  echo "Review self-reports zero violations while the report has 4." >&2
  exit 1
fi

if ! grep -Eq "\b4\b" "$REVIEW"; then
  echo "FAILURE_MODE: ignored-constraint"
  echo "Review never mentions the report's 4 strict violations." >&2
  exit 1
fi

exit 0
