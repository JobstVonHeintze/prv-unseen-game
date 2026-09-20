# Decision: autonomy grant for the internal tool bootstrap

- **Date:** 2026-09-20
- **Status:** accepted
- **Owner:** Jobst (explicit session instruction)

## Grant

Raise `CLAUDE.md` §3 from `checkpointed` to `autonomous` for the first
contrejour build. The owner instructed: no human checkpoints, full
autonomy until the internal tool is working, model council on plans,
auto-accept findings.

## Time box

Until F-01 (Part I walking skeleton + tester desk) is verified by
`bash scripts/smoke.sh` and a human playthrough of Player + Console.

## What survives

Machine gates never relax: smoke, boundaries, contract tests, hidden-state
split, age/consent rails.

## Revert

Set `autonomy: checkpointed` again before any hosted playtest or public
surface. This grant does not cover commits or pushes (`commit: ask`).
