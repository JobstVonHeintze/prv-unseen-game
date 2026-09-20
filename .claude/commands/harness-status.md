---
description: Print the harness workflow's current phase + last completed + history tail. Suggests the next runnable action.
---

You are reporting the harness workflow status for contrejour.

## What to do

1. Run `bash harness/run status`.
2. Render the output as a short, human-readable summary.
3. Based on the **current phase**, suggest the next concrete step:

| Current phase | Next step |
| --- | --- |
| `init` | Register a real feature if needed, then run `bash harness/run start F-NN`. |
| `select` | Begin implementation with `@implementer` or `@sprint-runner`. |
| `build` | Finish verification commands, mark the active feature done with evidence, then run `bash harness/run advance`. |
| `verify` | Invoke `@sprint-reviewer`, then run `bash harness/run review docs/reviews/<feature>.md`. |
| `review` | Run `bash harness/run advance` to reach closeout; record the working-tree handoff. |
| `closeout` | Mark the plan done in place, then clear local state with `bash harness/run reset --confirm`. Commit only when separately authorized. |

## Guardrails

- Never reset before closeout; doing so would discard active lifecycle bindings.
- If `bash harness/run status` shows a non-zero `exit` in the latest history entry, surface it prominently — that means the last gate failed.
- If `harness/state.json` is missing entirely, that's normal for a fresh scaffold; suggest `bash init.sh` to populate it.
