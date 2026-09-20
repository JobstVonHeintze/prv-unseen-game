---
description: Run a full design audit of DESIGN.md and the component code that consumes it.
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. Invoke `@design-auditor`.
2. Summarise findings in the conversation:
   - Lint results (errors / warnings / info).
   - Hardcoded values found in components (file:line + suggestion).
   - Contrast failures.
3. Write the full report to `docs/reviews/YYYY-MM-DD-design-audit.md`.
4. If there are any **errors** (broken token references, duplicate sections),
   propose fixes as a new plan in `docs/plans/`.

This command does not modify files directly. It produces a report and, if
needed, a plan.
