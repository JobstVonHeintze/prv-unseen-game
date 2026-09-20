---
description: Prepare the current branch for a pull request -- verify gates, triage reviewer comments, write the PR body.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Capture `git status --short`; distinguish scoped, pre-existing, and
   uncommitted changes. Do not commit or discard them without approval.
2. Confirm all required tests pass:
   - Unit tests.
   - Contract tests.
   - Project-owned `npm run design:lint`.

4. Run `/verify-boundaries`; include report status and
   skip reason. Quote counts only when status is `checked`.
5. If a PR already exists, invoke `@copilot-reviewer` to clear open comments.
6. Draft the PR body from:
   - The latest plan in `docs/plans/` for this work.
   - The list of commits on the branch.
   - Acceptance criteria from the plan.
7. Propose the PR title and body to the user. Do not create or push without
   explicit approval.
