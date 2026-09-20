---
description: Run the optional model council over a draft plan.
---

# /model-council

Use this to ask independently configured reviewer models to critique a draft
plan, then produce a concise summary for the original planner to reconcile.

## User Input

```text
$ARGUMENTS
```

Expected argument: `docs/plans/<plan>.md`

## Protocol

1. Read `council/README.md` for the operating contract.
2. Run:

   ```bash
   node council/run-council.mjs "$ARGUMENTS"
   ```

3. If the runner reports `skipped`, explain the reason and continue normal
   planning. Do not treat skip as a blocker.
4. If `council-summary.md` was produced, read it.
5. Reconcile feedback:
   - accept concrete, evidence-backed plan improvements,
   - reject vague or contradictory advice,
   - keep the plan simple and scoped.
6. Do not mark the plan `approved`; only the user can approve it.

## Guardrails

- Do not read files under `docs/reviews/council/**/raw/**`.
- Do not copy raw model transcripts into the plan.
- Do not weaken verification to satisfy a reviewer.
- Do not let council feedback silently expand the scope; use `/correct-course`
  or a separate plan if the feedback changes the feature.
