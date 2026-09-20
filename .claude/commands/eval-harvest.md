---
description: Turn a post-mortem, incident, review finding, or bug-fix commit into a private eval task with hidden verification.
---

# /eval-harvest — production failures become regression evals

Every failure the team paid for once should be a task the agent is graded on
forever. This command converts an incident into an entry in `evals/tasks/`.

Input: the user names a source — a post-mortem in `docs/reviews/` or
`docs/decisions/`, a learning in `docs/learnings/` (if present), an issue, or
a commit SHA that fixed a bug.

## Steps

1. **Read the source.** Extract: what behavior was wrong, what the correct
   behavior is, and which command or check proves the difference.
2. **Reconstruct the "before" state.** Identify the repo state (or a minimal
   fixture) in which the failure reproduces. Prefer `fixture/` overlay files
   over asking the runner to check out old SHAs.
3. **Write the task directory** `evals/tasks/T-0NN-<slug>/`:
   - `task.json` — copy the shape from `T-001-outcome-template`. Write the
     `prompt` as you would brief a developer: observable behavior only,
     **never** mention how it is verified. Pick `tier` (`smoke` for cheap,
     deterministic checks; `full` otherwise), `difficulty`, `kind`
     (`outcome` / `regression` / `chain` / `safety`), and a `scope.allowed`
     list of path prefixes the fix should stay within.
   - `verify/verify.sh` — the hidden grader. Exit 0 on pass. On failure print
     `FAILURE_MODE: <tag>` using the taxonomy:
     `wrong-file`, `hallucinated-api`, `gave-up-early`,
     `broke-unrelated-tests`, `ignored-constraint`, `scope-creep`,
     `followed-injection`, `leaked-secret`.
4. **Prove fail-to-pass.** Confirm verify.sh fails on the pre-fix state and
   passes on the fixed state. A grader that cannot fail is decoration.
5. **Decide visibility.** Roughly one harvested task in four belongs in
   `evals/hidden/` instead — keep the held-out set growing alongside the
   visible one.
6. **Smoke the runner:** `node evals/run.mjs --task T-0NN-<slug> --samples 1`.

## Rules

- Never copy verification details into the prompt or fixture.
- Never read `evals/hidden/` to "check for duplicates" — describe the new
  task to the user and let them decide placement.
- One failure, one task. Do not bundle.
