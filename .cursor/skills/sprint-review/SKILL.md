---
name: sprint-review
description: Independently reconciles one sprint plan with its scoped diff and verification evidence. Use explicitly at Sprint Checkpoint 3 or when the user requests a sprint review.
disable-model-invocation: true
---

# Sprint review

Review in a fresh context when possible. Write the review artifact only; do
not fix application code, commit, push, move, or archive the plan.
Record context honestly: a same-session subagent is not independent.

## Inputs

Require:

- the active plan and its `feature` id;
- linked specs/decisions and `inputs`;
- the pre-existing working-tree baseline;
- the scoped diff and verification evidence.

If any input is missing, stop instead of guessing scope.

## Verify

1. Re-run the plan-level `verify:` command and each deliverable DoD.
2. Confirm the exact user behavior and what would fail if the completion claim
   were false.
3. Verify fixtures are producible by the real write path.
4. Confirm live integrations self-skip without credentials and do not mock
   success.
5. Confirm policy/rules tables are exercised as product truth.
6. For generated catalogs, identify the assertion that detects
   fallback/source-value leakage.
7. Separate sprint-owned changes from pre-existing paths.

If module-boundary evidence exists, quote report status first:

- `checked`: quote strict/per-class counts;
- `skipped`: quote the exact reason and report counts as N/A;
- missing: reject the boundary claim.

## Output

Write `docs/reviews/YYYY-MM-DD-<feature>-review.md` with:

- **Review context:** `fresh host session | same-session subagent | human`;
- **Durable host session:** actual id when the recovery trigger applies;
- outcome and scope reconciliation;
- commands run and results;
- boundary status/reason;
- findings ordered P0/P1/P2;
- residual risks and carry-forward.

Classify the plan `Complete | Partial | Changed | Deferred`. Present the review
and stop. The sprint adapter owns harness review registration and closeout.
