# Plan: Remaining scripted rehearsal bots

- **Date:** 2026-09-21
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/reference/prototype-design.md` §8
- **Product track:** feature
- **feature:** F-08
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-21-2026-09-21-scripted-bots/council-summary.md`
- **inputs:**
  - `docs/reviews/2026-09-21-F-07.md`
  - `docs/learnings/2026-09-21-rehearsal-queue-proposals-opt-in.md`

## Context

F-06 shipped two policies: first choice (drifter) and last choice
(dark-optimiser). Prototype-design §8 also names completionist, romantic,
detective, and saint. Those names must pick differently, using canon tags
and effects, while still acting only through the Player path.

## Product framing

- **User / stakeholder:** the author on the Console desk.
- **Problem:** a rehearsal can only walk first or last. Side strands, secrets,
  and refused leverage are untested by bots.
- **Outcome:** the six named bots are selectable; each policy is distinct;
  Player still never sees rehearsals.
- **Non-goals:** LLM personas; Caio condition (not in canon yet); auto-queue
  default; structured forms; 2D/3D.
- **Decision log:** N/A.
- **Prior learnings consulted:** note the scene after every act, including
  advance; queue_proposals stays opt-in; rehearsal may read canon but must
  not import engine.

## Pre-existing working tree

`main` at `3a8c1eb` after the F-07 push. Clean except ignored runtime data.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-08 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Four named policies | code | `packages/rehearsal` | `pnpm exec vitest run packages/rehearsal --reporter=dot` | P0 |
| 2 | POST accepts all six bots | test | `tests/contract/rehearsal.test.ts` | `pnpm exec vitest run tests/contract/rehearsal.test.ts --reporter=dot` | P0 |
| 3 | Console bot select | code | `apps/console/src/main.ts` | same command | P0 |
| 4 | Smoke | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] `completionist` prefers an unvisited scene, then an unchosen choice.
- [x] `romantic` prefers a scene tagged `romance` or `flirt`.
- [x] `detective` prefers a scene that banks a secret; may `send_secret` to a tell recipient.
- [x] `saint` never picks a lie/leverage choice and never sends leverage.
- [x] Unknown bot is still 400. Player `/rehearsals` is still 404.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-21T04:43:41Z`. 25 files / 45 tests.

## Technical approach

- Policies live in `packages/rehearsal`. They score Player-visible ids
  against loaded canon (tags, `bank` effects, secret `uses`).
- Do not import `@contrejour/engine`. Do not add tags to Player view.
- `playScript` tracks visited scenes, taken choices, and sent secrets.
- Console: one select + Run. Default remains drifter.

## Blast radius

- **modules:** `rehearsal`, `api`, Console. No engine change.
- **schemas:** none.
- **tests:** rehearsal unit + contract.

## Dependencies

- Requires: F-06 rehearsal (done).
- Blocked by: none.

## Open questions

- [x] Q1: Invent `condition.caio` for saint? → no; carry-forward.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Alias bots that still pick first/last | high | Unit tests on a fake client with mixed options |
| Engine import | med | Canon lookup only |

## Estimated effort

- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run smoke and the rehearsal contract.
2. Fixtures from `playScript` + `serveSlice`.
3. Review context: same-session builder.
4. Commit/push authorized this session.

## Legacy removal

- N/A.
