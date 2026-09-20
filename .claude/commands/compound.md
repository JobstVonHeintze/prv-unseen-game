---
description: Capture an evidence-cited learning from the work just completed so the next loop is easier.
---

# Compound

Close the loop. Take what was just learned — a bug, a failed test, a
performance trap, a problem-solving insight — and record it as a durable note
future agents consume before similar work. This is the "compound" step: each
unit of work should make the next one *easier*, not harder.

## User Input

```text
$ARGUMENTS
```

(Optional: a hint about what to capture. If empty, infer from the latest
`claude-progress.md` entry, active plan, and most recent review.)

## Protocol

Invoke `@learnings-writer`. It will:

1. Recover what just happened from `claude-progress.md`, `docs/plans/`, and
   `docs/reviews/`.
2. Identify the few high-signal learnings worth keeping.
3. For each, demand a concrete artifact — a commit SHA, a failing-then-passing
   test, a review finding, a smoke/log reference. **No evidence, no learning.**
   (This scaffold distrusts self-graded lessons; see the boundary-gate ADR.)
4. Write one file per learning to `docs/learnings/YYYY-MM-DD-<slug>.md` using
   `docs/templates/learning-template.md`.
5. Flag any learning that could be **promoted** into an automated gate (a lint
   rule, a `scripts/smoke.sh` grep invariant, a constitution rule,
   or a checklist item) — a promoted rule makes the harness automatically
   stronger so the next agent cannot reintroduce the issue.

## When to run

- At the end of any sprint (`@sprint-runner` runs it for you at close).
- After a tricky debug or a non-obvious review finding.
- Any time you think "we'll hit this again."

## Guardrails

- Do not record speculative "be careful" notes. Name the specific failure and
  the specific fix, backed by evidence.
- Do not duplicate an existing learning; the writer searches `docs/learnings/`
  first.
- Deletions and consolidation are owned by `/learnings-refresh`, not this
  command.
