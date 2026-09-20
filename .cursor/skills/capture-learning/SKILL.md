---
name: capture-learning
description: Captures one non-obvious reusable engineering lesson backed by concrete evidence. Use only when the user explicitly requests learning capture after a sprint, review, or difficult debugging session.
disable-model-invocation: true
---

# Capture learning

Create durable memory sparingly. Do not run automatically after every sprint.

## Admission test

Write a learning only when all are true:

1. It is non-obvious from the current code/spec.
2. It is likely to affect future work.
3. It names a concrete failure mode and prevention.
4. It cites a reachable commit, failing-then-passing command, review finding,
   or stable log/screenshot reference.

Without evidence, report that the candidate is a hunch and do not create a
file.

## Avoid duplication

Search `docs/learnings/`, `docs/reviews/`, and relevant decisions/specs first.
Update or promote an existing rule instead of duplicating it.

## Output

Use
`docs/templates/learning-template.md` and write one file:

`docs/learnings/YYYY-MM-DD-<slug>.md`

Keep it short: trigger, lesson, evidence, and promotion candidate. If the
learning is already enforced by a deterministic gate, prefer linking that gate
over adding prose.

