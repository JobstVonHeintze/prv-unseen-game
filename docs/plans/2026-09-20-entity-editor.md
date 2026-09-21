# Plan: Console entity editor with proposal preview

- **Date:** 2026-09-20
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/reference/prototype-design.md` §6; `specs/constitution.md` chain 8
- **Product track:** feature
- **feature:** F-05
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-20-2026-09-20-entity-editor/council-summary.md`
- **inputs:**
  - `docs/plans/2026-09-20-canon-proposals.md`
  - `docs/reviews/2026-09-20-F-02.md`
  - `docs/learnings/2026-09-20-proposals-copy-canon-in-tests.md`

## Context

F-02 shipped the proposal queue. Authors still paste a path and YAML by
hand. Prototype-design §6 asks for an entity list with search, an editor,
and a diff preview before anything is queued. F-05 is that desk, still
writing only through proposals.

## Product framing

- **User / stakeholder:** the author on the Console desk.
- **Problem:** the queue has no catalogue. You cannot find an entity or see
  the current file before you propose a change.
- **Outcome:** search canon, open the YAML, preview a unified diff and
  validation, then queue. Approve still writes. Player never sees the
  catalogue or the preview.
- **Non-goals:** AI-authored proposals; structured forms per schema; create
  new ids; rehearsal queue; 2D/3D; commit of the F-04 tree.
- **Decision log:** N/A — D13 already decided proposals.
- **Prior learnings consulted:** `docs/learnings/2026-09-20-proposals-copy-canon-in-tests.md`
  — tests copy canon; do not approve against the live tree in a check.

## Pre-existing working tree

Uncommitted F-04 closeout (VIP scene, vault check, `.gitignore` `/secrets/`,
reviews). This plan does not adopt those paths except as already present.
It adds editor search/source/preview and Console UI.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-05 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Entity path + search over live canon | code | `packages/canon/src/` | `pnpm exec vitest run packages/canon --reporter=dot` | P0 |
| 2 | GET search/source; POST preview (no write) | code | `packages/api/src/server.ts` | `pnpm exec vitest run tests/contract/entity-editor.test.ts --reporter=dot` | P0 |
| 3 | Console: search, edit, preview, queue | code | `apps/console/src/main.ts` | same command | P0 |
| 4 | Player cannot search or preview | test | `tests/contract/entity-editor.test.ts` | same command | P0 |
| 5 | Smoke | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] Search `tilde` returns `char.tilde` and `scene.tilde-vip`.
- [x] Source returns the current YAML for that path; file unchanged.
- [x] Preview returns diff + validation and does not write or store a proposal.
- [x] Queue still uses POST `/v1/console/proposals`. Approve is unchanged.
- [x] Player `/v1/runs` cannot reach search or preview.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-20T21:49:23Z`. 21 files / 37 tests.

## Technical approach

- Derive `characters/char.x.yaml` from the stable id prefix.
- Search is a filter on id, display name, beat, summary.
- `POST /v1/console/proposals/preview` is handled before the id matcher so
  `preview` is not treated as a proposal id.
- Console loads source into a textarea; Preview calls the preview route;
  Queue posts the same `after` to the existing create route.

## Blast radius

- **modules:** `canon` (path/search), `api` (three Console routes), Console.
- **schemas:** none new.
- **tests:** new `tests/contract/entity-editor.test.ts`; canon unit tests.

## Dependencies

- Requires: F-02 proposals (done).
- Blocked by: none.
- Blocks: none.

## Open questions

- [x] Q1: Structured form vs YAML → YAML. Schema forms are a later desk.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Preview writes by mistake | high | Contract asserts file bytes unchanged and proposal list empty |
| `preview` captured as proposal id | high | Route order: preview before `/:id` |
| Approve in browser against live canon | med | Checks use `serveSlice`; live desk only queues |

## Estimated effort

- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run smoke and the entity-editor contract.
2. Fixtures from `readCanonFile` + preview; no hand-folded YAML.
3. Review context: same-session builder.
4. No commit unless asked.

## Legacy removal

- Console raw path/YAML submit stays as a fallback, not a second write path.
