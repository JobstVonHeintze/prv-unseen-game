#!/usr/bin/env bash
# Hidden grader template. The agent never sees this file: the runner strips
# evals/ from the workspace clone. $WORKSPACE is the agent's finished tree,
# $TRANSCRIPT the captured agent output, $TASK_DIR this task's directory.
#
# Pattern: fail-to-pass. This script should FAIL on the pre-task tree and
# PASS only when the requested behavior exists. Confirm both before
# activating the task. On failure, print a taxonomy tag so the failure-mode
# distribution stays meaningful:
#   echo "FAILURE_MODE: wrong-file|hallucinated-api|gave-up-early|broke-unrelated-tests|ignored-constraint"
set -euo pipefail
cd "$WORKSPACE"

# TODO: run the hidden check, e.g.:
#   cp -R "$TASK_DIR/verify/tests/" tests/_eval/ && npm test -- tests/_eval
#   or: python -m pytest "$TASK_DIR/verify/test_regression.py"

echo "FAILURE_MODE: verify-failed"
echo "Template task: fill in the hidden check before activating." >&2
exit 1
