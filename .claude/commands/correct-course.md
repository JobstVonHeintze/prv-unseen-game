---
description: Reconcile changed scope against current plans/specs before more implementation.
---

# Correct Course

Use this when the work has drifted from the approved plan or when new product
information changes scope, priority, or acceptance criteria.

## User Input

```text
$ARGUMENTS
```

## Protocol

Read only until the user approves a correction.

- Read `CLAUDE.md`, the latest `claude-progress.md` entry, and the active
  plan in `docs/plans/`.
- If a spec is linked, read it. If no spec is linked, note that.
- Read `harness/feature_list.json` and identify the affected feature id(s).
- Compare the original intent against the new input:
  - what changed,
  - what remains valid,
  - what is now unsafe, stale, or out of scope,
  - what verification must change.
- Produce a correction proposal. Do not edit files yet.

## Correction Proposal Format

Return:

- **Decision needed:** one sentence.
- **Change type:** scope increase | scope decrease | priority change |
  requirement correction | technical constraint | blocker.
- **Artifacts to update:** exact paths.
- **Recommended edits:** bullet list of changes to plan/spec/feature list.
- **Verification impact:** commands that must be added, removed, or re-run.
- **Stop / continue:** say whether implementation can continue safely before
  the correction is approved.

## After Approval

If the user approves, update the minimum necessary artifacts:

- active plan in `docs/plans/`,
- linked spec or task file,
- affected `harness/feature_list.json` entries,
- `docs/decisions/` if this is a durable product or architecture decision.

Then report the diff and the next command to run.

## Guardrails

- Do not silently expand the current feature.
- Do not bury product decisions in chat only.
- Do not weaken verification just because scope changed.
- If the correction is large enough to become a new feature, recommend a new
  plan/spec instead of stretching the current one.
