#!/usr/bin/env bash
# init.sh — session-start ritual.
#
# This script runs *before any code is written* in a session and answers:
#   1. Is the runtime present?
#   2. Are dependencies installed?
#   3. Does feature_list.json validate against its schema?
#   4. What was the last session working on?
#
# Optional deeper check:
#   INIT_VERIFY=1 bash init.sh
#     ALSO runs scripts/smoke.sh as part of init. Slower (~60s budget) but
#     catches "the project doesn't even build" before the agent writes any
#     code (walkinglabs Lecture 06). Recommended at the start of a
#     multi-session sprint, or after any environment change.
#
# Exit code 0  -> environment healthy, agent may proceed
# Exit code 1  -> BLOCKER: <reason> printed to stderr; agent must stop
# Exit code 2  -> hard error (missing harness/run); recreate the harness layer
#
# Why this file exists:
#   The single most common failure mode of AI coding agents is writing code
#   against a broken environment, then "fixing" the wrong thing when tests
#   fail for unrelated reasons. init.sh is the workshop's MOT test:
#   refuse to start work until the workshop is in a fit state.
#
#   Adopted from walkinglabs harness-engineering Lecture 06.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$HERE/harness/run"

if [ ! -x "$RUNNER" ]; then
  echo "BLOCKER: $RUNNER is missing or not executable" >&2
  echo "  WHY: the harness layer requires harness/run to be executable" >&2
  echo "  FIX: re-add the harness layer: npx create-spec-kit shell . --command '/add harness'" >&2
  exit 2
fi

# INIT_VERIFY is forwarded transparently via the environment.
exec "$RUNNER" init "$@"

