---
description: Score the harness across five subsystems and write a shareable audit report.
---

# Harness Audit

You are auditing the agent harness for contrejour. This is a structural
audit, not a code review. Use it to find the weakest harness subsystem and the
smallest next improvement.

## User Input

```text
$ARGUMENTS
```

## What To Inspect

Read only unless the user explicitly asks for edits.

1. `CLAUDE.md` and `AGENTS.md`
2. `MANUAL.md`
3. `.claude/agents/` and `.claude/commands/`
4. `.claude/settings.json`
5. `claude-progress.md`
6. `docs/plans/`, `docs/reviews/`, and `docs/decisions/`
7. `harness/feature_list.json`, `harness/workflow.yaml`, and `harness/run`
8. `init.sh`, `scripts/smoke.sh`, and `SMOKE.md`
9. `CLEAN_STATE_CHECKLIST.md`

## Score The Five Subsystems

Score each subsystem 1-5:

- **1:** missing or mostly unusable
- **2:** present but too vague or manual
- **3:** usable, with obvious gaps
- **4:** strong, minor gaps only
- **5:** robust, runnable, and easy for a fresh agent to follow

Subsystems:

- **Instructions:** startup path, working rules, local context, no giant file.
- **State:** progress, feature status, evidence, decisions, git history.
- **Verification:** init, build/test/lint/smoke commands, exact DoD evidence.
- **Scope:** WIP=1, feature boundaries, dependencies, correct-course path.
- **Lifecycle:** start routine, clean-state exit, handoff, periodic cleanup.

## Grounding Questions

Answer these before assigning the final score:

- Can a fresh agent identify the current task from repository files alone?
- Can it find the exact command that proves the task is done?
- Can it tell which feature is active and which work is deferred?
- Can it recover if the last session stopped halfway through?
- Can a reviewer verify completion without trusting chat history?

## Ablation Prompt

Pick one harness component to test removing or weakening this month. Use failure
logs and recent task outcomes to justify the candidate. Do not remove it during
the audit; only recommend an experiment.

Examples:

- Temporarily skip a slash command and run a representative task.
- Replace a broad rule with a narrower local `CLAUDE.md`.
- Compare a task with and without a smoke gate.

## Output

Write a report to `docs/reviews/YYYY-MM-DD-harness-audit.md` using
`docs/templates/harness-audit-template.md`.

Then summarize:

- lowest-scoring subsystem,
- first 2-3 improvements,
- recommended ablation experiment,
- whether any blocker should become an immediate plan.

## Guardrails

- Do not edit harness files during the audit.
- Do not treat the score as a model benchmark; it is a structural benchmark.
- Do not recommend more process when a simpler command, clearer DoD, or local
  context file would solve the issue.
