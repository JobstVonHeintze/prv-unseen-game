---
description: Create a new plan file for the current session's work.
---

## User Input

```text
$ARGUMENTS
```

## Outline

Create a new plan file at `docs/plans/YYYY-MM-DD-<slug>.md` using
`docs/templates/plan-template.md` as the base.

1. Derive a 2-4 word slug from the user's description.
2. Use today's date (ISO 8601).
3. Copy the template verbatim, then:
   - Fill **Title** with a concise sentence.
   - Fill **Context** with the user's description expanded to 2-3 sentences.
   - Leave **Deliverables** and **Acceptance Criteria** as placeholders for
     the user to complete together with you.
4. Set **Status** to `draft`.
5. Report the new path.
6. Run `node council/run-council.mjs <new-plan-path>`.
   - Treat `skipped` as normal; council is advisory.
   - If `council-summary.md` is produced, read it and reconcile concrete,
     evidence-backed suggestions into the draft plan.
   - Do not adopt vague feedback or silently expand scope.

Do not mark the plan `approved` yourself. The user's explicit "approved" is
the only trigger for that transition.
