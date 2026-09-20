---
description: Inspect scaffold state and recommend the next product or engineering workflow step.
---

# Speckit Help

You are the workflow guide for contrejour. Your job is to answer:
"What should we do next?"

## User Input

```text
$ARGUMENTS
```

## Inspect

Read only. Do not edit files.

1. Read `CLAUDE.md`, `MANUAL.md`, and the latest entry in `claude-progress.md`.
2. If present, read `.speckit-state.json` to identify enabled layers.
3. List active plans in `docs/plans/` and read the most recent one.
4. Read the latest review in `docs/reviews/` if one exists.
5. Read `harness/feature_list.json` and, if available, run `bash harness/run status`.
6. Check whether `specs/constitution.md` looks personalised or still generic.
7. Check whether `DESIGN.md` looks personalised or still generic.

## Classify The Situation

Pick exactly one track:

- **Discovery:** Idea is vague, product shape unclear, or stakeholders
  disagree. Next step: run the bootstrap skill or create a product brief /
  decision note before coding.
- **Quick fix:** Scope is clear, low risk, one deliverable. Next step:
  use `/plan "<fix>"`, then `@implementer`.
- **Feature:** User value is clear but needs requirements and tests. Next step:
  use `/speckit.specify`, then `/speckit.clarify`, `/speckit.plan`,
  `/speckit.tasks`.
- **Sprint:** 4-8 related deliverables or cross-file work. Next step:
  use `@sprint-runner` with checkpoint approval.
- **Correct course:** Active work no longer matches the plan/spec, new
  constraints appeared, or scope changed. Next step: use `/correct-course`
  before editing more code.
- **Review / ship:** Implementation exists and needs confidence before PR/merge.
  Next step: use `/speckit.analyze`, then `/prepare-pr`.
- **Retrospective:** A sprint/epic just finished or the same review issue
  repeated. Next step: write/update a decision, local context, hook,
  checklist, or follow-up plan.

## Output

Return a concise status card:

- **Current state:** one sentence.
- **Recommended track:** one of the tracks above.
- **Next command:** one concrete command or agent invocation.
- **Why:** 2-4 bullets grounded in files you read.
- **Risks / blockers:** only material blockers.
- **If you disagree:** one alternative path, not a menu of everything.

## Guardrails

- Do not start implementation.
- Do not mark plans approved.
- Do not recommend the full workflow when a smaller track is enough.
- If `BOOTSTRAP.md` was skipped or deleted, do not treat that as a blocker.
  Recommend generating one only when product calibration is actually needed.
