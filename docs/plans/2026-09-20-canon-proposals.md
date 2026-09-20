# Plan: Canon proposals with diff and approval

- **Date:** 2026-09-20
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `specs/constitution.md` chain 8; `docs/reference/prototype-design.md` §6
- **Product track:** feature
- **feature:** F-02
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-20-2026-09-20-canon-proposals/council-summary.md`
- **inputs:**
  - `specs/constitution.md`
  - `docs/reference/prototype-design.md` §6
  - `docs/reviews/2026-09-20-F-03.md`
  - `docs/learnings/2026-09-20-writer-follow-through-on-effects.md`

## Context

F-01 and F-03 made the slice playable and the writer drop-in real in YAML.
The Console still cannot write canon. Testers flag; authors inspect. Every
canon change is supposed to be a proposal with a diff and a validation
report. Nothing writes until approve. Reject stores a reason. Player never
sees the queue.

## Product framing

- **User / stakeholder:** the author on the Console desk.
- **Problem:** YAML is the only write path; the desk is read-only.
- **Outcome:** submit a proposal, see diff + validation, approve writes the
  file and reloads canon, reject keeps the reason. Player endpoints stay
  unchanged and do not list proposals.
- **Non-goals:** full entity editor; AI-authored proposals; rehearsal queue;
  sandbox commit; F-04 Tilde VIP night; 2D/3D.
- **Decision log:** N/A — D13 already decided proposals.
- **Prior learnings consulted:** follow-through is engine YAML, not this
  desk. Review-gate quote trap: no nested YAML quotes in harness.

## Pre-existing working tree

Untracked F-01–F-03 tree. No first commit. This feature adds proposal
schema, store, `/v1/console/proposals*`, Console queue UI, contract test.
Does not start F-04.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-02 (WIP=1) | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Proposal schema + preview apply (no write) | code | `packages/canon/src/` | `pnpm exec vitest run packages/canon --reporter=dot` | P0 |
| 2 | Store + `/v1/console/proposals` create/list/approve/reject | code | `packages/api/src/` | `pnpm exec vitest run tests/contract/proposals.test.ts --reporter=dot` | P0 |
| 3 | Console queue: submit, diff, approve, reject | code | `apps/console/src/main.ts` | `pnpm exec vitest run tests/contract/console-desk.test.ts --reporter=dot` | P0 |
| 4 | Player never sees proposals | test | `tests/contract/hidden-state.test.ts` `tests/contract/proposals.test.ts` | `pnpm exec vitest run tests/contract/proposals.test.ts --reporter=dot` | P0 |
| 5 | Smoke + existing suite | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] POST proposal stores pending record with unified diff and validation; canon file unchanged.
- [x] Approve writes through the real file path and reloads live canon.
- [x] Approve of an invalid body refuses the write and leaves the file as `before`.
- [x] Reject stores `reject_reason`; file unchanged.
- [x] Player view keys unchanged; `/v1/runs` cannot list or approve proposals.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
Test Files  19 passed (19)
      Tests  34 passed (34)
smoke ok
```

## Technical approach

- `ProposalSchema` in canon. Preview merges parsed YAML into a canon copy
  and runs `validateCanon`. Write happens only on approve, then `loadCanon`.
- Paths must stay under the bound `canonRoot` (tests copy the slice to tmp).
- `createApi` holds live canon so GET `/v1/console/canon/*` sees the write.
- Rehearsals stay 404.

## Blast radius

- **modules:** `canon` (schema/preview), `api`, Console. Not `engine`/`player`.
- **schemas:** `ProposalSchema`.
- **capability chains:** 8 (Proposal). Hidden-state must stay green.
- **tests:** new `tests/contract/proposals.test.ts`; console-desk loses the
  proposals-404 assertion.

## Dependencies

- Requires: F-01 desk + F-03 writer drop-in (done).
- Blocked by: none.
- Blocks: entity editor, rehearsal-to-queue, F-04 still independent.

## Open questions

- [x] Q1: In-memory editor vs file write → file write on approve (canon is files).

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Approve mutates repo canon in tests | high | `serveSlice` copies canon to tmp |
| Path escape | high | resolve + prefix check; allowlist dirs |
| Live API stale after approve | med | replace in-memory canon after reload |

## Estimated effort

- Implementation: 1 session
- Tests: included
- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run `bash scripts/smoke.sh` and every deliverable DoD.
2. Fixtures are proposal records the POST path produces.
3. Review context: same-session builder.
4. Commit and push only because the owner asked in this session.

## Legacy removal

- Remove the F-01 404 stub for `POST /v1/console/proposals`. Rehearsals stay 404.
