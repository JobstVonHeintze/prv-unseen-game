# Quality Score — contrejour

> Active artefact. Updated by `@quality-auditor` periodically and by the
> `@sprint-reviewer` after each sprint. Adopted from
> [walkinglabs harness-engineering Lecture 12](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/)
> and the openai-advanced repo template.

## Why this exists

Codebases drift. Without an active record of which areas are healthy and
which are accumulating debt, the next agent's session has no signal about
*where to invest cleanup effort*. A quality-score file makes drift visible
and prioritisable.

This is **not** a one-time assessment. It's a tracker that should change
as the project evolves: modules strengthen as their boundaries firm up;
modules degrade as they accumulate flaky tests or grow past comprehensibility.

## How to read it

For each area / module of the project, score across five dimensions:

| Letter | Meaning |
|--------|---------|
| **A** | Verification fully passing; agent-understandable in <5 min; tests stable; architecture boundaries clean; conventions followed. |
| **B** | Mostly A, with one named gap. |
| **C** | Two or more named gaps; should not be a "build new feature here" target without addressing them first. |
| **D** | Cannot be safely modified without senior review. Schedule a remediation sprint. |

**The next session should read this file and prioritise its work
toward the lowest-scoring modules.**

## The score table

> Replace the example rows below with your project's actual modules /
> areas. Re-score after each sprint. Aim for *all-A* over the long run;
> any new D is a red flag worth a sprint of its own.

| Area | Score | Verification | Agent-understandable | Test stability | Architecture compliance | Code conventions | Last reviewed |
|------|-------|--------------|----------------------|----------------|-------------------------|------------------|---------------|
| <example> auth | A | Yes | Yes | Stable | Compliant | Followed | YYYY-MM-DD |
| <example> billing | C | Partial (callback path untested) | Difficult (logic spread across 3 files) | 2 flaky tests | Violations present | Partial | YYYY-MM-DD |

## Update protocol

1. After every sprint, the `@sprint-reviewer` updates rows for areas the
   sprint touched.
2. Once a month, `@quality-auditor` does a **full pass** and updates every
   row.
3. Any module dropping a letter triggers a follow-up plan in `docs/plans/`.
4. When this file is updated, the change goes into the same commit as the
   work that caused it (so `git blame` ties the score change to the cause).

## What "agent-understandable in <5 min" means

A new agent session, given only the repo and ~5 min of context budget, can
answer:

- What does this module do (one sentence)?
- Where are its inputs and outputs?
- How do I run its tests?
- What are its current known issues?

If the answer to any of these takes >5 min of context burn, the module is
not A.

## Trade-off discipline

A module dropping from A to B is *information*, not a failure. The discipline
is: don't paper over the drop. Either schedule the remediation work, or
accept the new state and document why (e.g., "B-rated billing acceptable
because the module is being replaced in Q3").

## See also

- `docs/decisions/` — *why* trade-offs were chosen (Lecture 05).
- `CLEAN_STATE_CHECKLIST.md` — the per-session exit checklist (Lecture 12).
- `EVALUATION_RUBRIC.md` (in `harness/`) — feature-level rubric used by the sprint-reviewer.
- The `@quality-auditor` agent owns this file's update cadence.
