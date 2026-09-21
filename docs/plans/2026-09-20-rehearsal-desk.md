# Plan: Rehearsal desk with findings

- **Date:** 2026-09-20
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/reference/prototype-design.md` §8–9; `specs/constitution.md` chain rehearsal-to-queue
- **Product track:** feature
- **feature:** F-06
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-20-2026-09-20-rehearsal-desk/council-summary.md`
- **inputs:**
  - `docs/reviews/2026-09-20-F-05.md`
  - `docs/learnings/2026-09-20-preview-before-proposal-id.md`

## Context

The desk can edit canon through proposals. Interactive testing is still a
404. The drifter already proves Part I by date in smoke. F-06 makes a
rehearsal a Console action: run scripted bots on the Player action path,
read a report, and file findings when a gate scene is never entered. A
report that only lists numbers is a failed feature.

## Product framing

- **User / stakeholder:** the author on the Console desk.
- **Problem:** you cannot batch-play the slice from the desk, and missed
  gates do not become findings.
- **Outcome:** POST a rehearsal; GET the report; missed gate scenes appear
  in findings as `author: rehearsal`. Player never sees rehearsals.
- **Non-goals:** LLM personas; all six bots; auto-proposals; closing the
  loop into YAML edits; 2D/3D; commit.
- **Decision log:** N/A — constitution already requires findings, not charts.
- **Prior learnings consulted:** preview-before-id — register `/rehearsals`
  before any `/:id` matcher. Proposals-copy-canon — tests use `serveSlice`.

## Pre-existing working tree

Uncommitted F-04 + F-05. This plan adds rehearsal routes and does not
adopt those paths except as already present.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-06 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Play loop + report + missed-gate drafts | code | `packages/rehearsal` | `pnpm exec vitest run packages/rehearsal --reporter=dot` | P0 |
| 2 | POST/GET `/v1/console/rehearsals`; file findings | code | `packages/api` | `pnpm exec vitest run tests/contract/rehearsal.test.ts --reporter=dot` | P0 |
| 3 | Console run + report | code | `apps/console/src/main.ts` | same command | P0 |
| 4 | Player cannot start a rehearsal; 404 stub gone | test | `tests/contract/console-desk.test.ts` `rehearsal.test.ts` | same + desk test | P0 |
| 5 | Smoke / drifter still g1–g7 | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] `POST /v1/console/rehearsals` with `bots:["drifter"]` returns 201 and a report.
- [x] A short `max_evenings` run files a finding on an unreached gate scene.
- [x] A full drifter run files no missed-gate findings.
- [x] `GET /v1/console/rehearsals/{id}/report` returns the stored report.
- [x] Player `/v1/runs/{id}/rehearsals` is 404.
- [x] Rehearsal does not write canon YAML.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-20T22:00:13Z`. 23 files / 39 tests.

## Technical approach

- Generalise the drifter loop; `pick: first | last`.
- Bots call only Player actions (`createRun`, `act`, `timeline`).
- API builds an in-process Player client on `propose`/`playerView` (same
  path as HTTP). Rehearsal package does not import `engine`.
- Findings: `category: timing`, `author: rehearsal`, `entity_id` = gate scene.

## Blast radius

- **modules:** `rehearsal`, `api`, Console. `console-desk` 404 stub deleted.
- **schemas:** none new.
- **tests:** new rehearsal contract; desk; existing gate-reach.

## Dependencies

- Requires: F-01 drifter (done).
- Blocked by: none.
- Blocks: LLM personas, auto-proposals from reports.

## Open questions

- [x] Q1: All six bots now? → drifter + last-choice only. Rest later.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Charts without findings | high | Short-run contract asserts a finding |
| Drifter loop drift | high | `runDrifter` stays the smoke entry |
| API imports engine internals | med | Client uses public `propose`/`playerView` only |

## Estimated effort

- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run smoke and the rehearsal contract.
2. Findings from `addFinding` after a real play loop.
3. Review context: same-session builder.
4. No commit unless asked.

## Legacy removal

- [x] `POST /v1/console/rehearsals` 404 stub in `packages/api/src/server.ts`
- [ ] 404 assertion in `tests/contract/console-desk.test.ts`
