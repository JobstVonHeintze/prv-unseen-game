---
description: Verify module boundary invariants by running the deterministic checker (not by eyeballing imports).
---

## User Input

```text
$ARGUMENTS
```

## Outline

> **Source: production boundary-gate post-mortem (F1/F5).** This command
> used to be a manual `grep` recipe that no hook/test/CI ever ran, and whose
> output was eyeballed and self-reported (a project shipped asserting "0
> violations" while 4 existed). It is now a thin **oracle wrapper** around the
> executable checker. Do **not** eyeball imports; do **not** invent a count.
> See `docs/decisions/2026-05-30-boundary-gate-postmortem.md`.

This is a read-only verification command.

1. Run the checker in report mode and paste its output verbatim:

   ```bash
   node harness/lib/check-boundaries.mjs --report
   ```

2. To produce the machine evidence artifact that reviews must cite, run:

   ```bash
   node harness/lib/check-boundaries.mjs --check --json harness/boundaries.report.json
   ```

   - Exit `0` = the checker completed. Inspect report `status`:
     `checked` means the ratchet is green; `skipped` means coverage is N/A and
     the exact `reason` must be reported.
   - Exit `1` = a regression; the output names the offending edges + the
     prescribed fix per severity class (`policy_gap` / `misplaced_contract` /
     `infra_leak` / `peer_coupling`).
   - Exit `2` = the config is malformed (setup error).

3. If a forbidden edge is a **legitimate shared-kernel / DRY refactor** (F3),
   do **not** weaken the checker — add the target to `allowedSharedTargets` in
   `harness/boundaries.config.json` and explain it in the plan.

4. Report the checker's status, not your own judgment. Any boundary claim MUST
   quote `harness/boundaries.report.json`; quote counts only for `checked`.
   `skipped` and missing coverage are never "0 violations."

## Rules

- This command does not modify files (except writing the evidence artifact).
- The checker is the single source of truth. If you believe it is wrong, fix
  the checker or its config in a reviewed change — never grade boundaries by hand.
- Static import analysis cannot see dynamic imports, DI, or string-keyed
  coupling; this gate **complements** the preserved-capability contract tests,
  it does not replace them.
