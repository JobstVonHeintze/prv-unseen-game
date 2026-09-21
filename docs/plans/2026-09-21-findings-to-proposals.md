# Plan: Findings become proposal drafts

- **Date:** 2026-09-21
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `specs/constitution.md` rehearsal-to-queue; `docs/reference/prototype-design.md` §8
- **Product track:** feature
- **feature:** F-07
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-21-2026-09-21-findings-to-proposals/council-summary.md`
- **inputs:**
  - `docs/reviews/2026-09-20-F-06.md`
  - `docs/learnings/2026-09-20-proposals-copy-canon-in-tests.md`

## Context

F-06 files rehearsal findings. The constitution says a rehearsal that only
produces charts is a failed feature, and that findings above a threshold
become a proposal or an issue on a canon entity. Findings exist; they do
not yet enter the proposal queue. F-07 is that step.

## Product framing

- **User / stakeholder:** the author on the Console desk.
- **Problem:** a missed-gate finding sits in the list; the write path is
  still a separate paste.
- **Outcome:** Propose on a finding queues a pending proposal for that
  entity's YAML, with the finding as rationale. Rehearsal can opt in
  (`queue_proposals: true`). Nothing writes until approve. Player never
  sees it.
- **Non-goals:** auto-approve; LLM rewrite of the YAML; structured forms;
  remaining bots; commit policy change.
- **Decision log:** N/A.
- **Prior learnings consulted:** tests copy canon; do not approve against
  the live tree in a check.

## Pre-existing working tree

`main` at `09b33a3` after the F-04–F-06 push. Clean except ignored runtime
data.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-07 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | POST finding → pending proposal | code | `packages/api/src/` | `pnpm exec vitest run tests/contract/finding-propose.test.ts --reporter=dot` | P0 |
| 2 | Rehearsal `queue_proposals` | code | `packages/api/src/server.ts` | same command | P0 |
| 3 | Console Propose on a finding | code | `apps/console/src/main.ts` | same command | P0 |
| 4 | Player cannot propose | test | `tests/contract/finding-propose.test.ts` | same command | P0 |
| 5 | Smoke | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] `POST /v1/console/findings/{id}/propose` stores pending proposal; file unchanged.
- [x] Rehearsal with `queue_proposals: true` queues one draft per missed-gate finding.
- [x] Approve still the only write.
- [x] Player `/v1/runs/{id}/findings/{fid}/propose` is 404.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-21T04:39:41Z`. 24 files / 40 tests.

## Technical approach

- Resolve `entityRelPath(finding.entity_id)`, snapshot current YAML as
  `after` unless the author sends a body.
- Author `ai` when the rehearsal queues; `human` when the desk button is
  used.
- Reuse `previewProposal` + `addProposal`.

## Blast radius

- **modules:** `api`, Console. No engine change.
- **schemas:** none.
- **tests:** new finding-propose contract.

## Dependencies

- Requires: F-02 proposals, F-06 findings (done).
- Blocked by: none.

## Open questions

- [x] Q1: Auto-queue every rehearsal? → opt-in flag only.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Approve writes an identical file | low | Tests never approve on the live tree |
| No path for an entity | med | 400 `unknown-entity` |

## Estimated effort

- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run smoke and the finding-propose contract.
2. Fixtures from rehearsal findings + `readCanonFile`.
3. Review context: same-session builder.
4. Commit/push authorized this session.

## Legacy removal

- N/A.
