# Plan: Playable Tilde VIP demand

- **Date:** 2026-09-20
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/decisions/2026-09-20-spice-scaled-follow-ups.md`
- **Product track:** feature
- **feature:** F-04
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-20-2026-09-20-tilde-vip-demand/council-summary.md`
- **inputs:**
  - `docs/plans/2026-09-20-incidents-and-conditions.md`
  - `docs/reviews/2026-09-20-F-03.md`
  - `docs/learnings/2026-09-20-writer-follow-through-on-effects.md`

## Context

F-03 shipped `secret.s-tilde-vip` and `scene.conduct-demand`, but the tape
was not obtainable in play. Testers had to inject `send_secret`. F-04 makes
the VIP evening a storylet on the dark route (after she provoked the
changing-room watch), banks the taken secret, and only then allows the send.

## Product framing

- **User / stakeholder:** playtester on the Player.
- **Problem:** the demand menu cannot be reached from play.
- **Outcome:** after gallery provoke, Home lists the VIP room. Filming banks
  the tape. Send to Tilde opens reveal-other / film-another. Spice changes
  only the depicted proof.
- **Non-goals:** a new Part I gate; character-specific demand copy; entity
  editor; two uses on one send.
- **Decision log:** `docs/decisions/2026-09-20-spice-scaled-follow-ups.md`
- **Prior learnings consulted:** follow-through already enters the demand
  from leverage effects.

## Pre-existing working tree

Clean `main` at `a2113db`. This feature adds VIP node/scene and a vault
check on send. Does not start an entity editor.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-04 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | VIP node + evening scene; secret capture node | code | `canon/` | `pnpm exec vitest run packages/canon --reporter=dot` | P0 |
| 2 | `send_secret` requires vault membership | code | `packages/engine/src/propose.ts` | `pnpm exec vitest run tests/contract/spice-follow-up.test.ts --reporter=dot` | P0 |
| 3 | Contract: provoke → VIP → film → send → demand | test | `tests/contract/spice-follow-up.test.ts` | same command | P0 |
| 4 | Drifter still reaches g7; smoke | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] VIP is not a gate. It is an evening storylet after `flag.watch.provoked`.
- [x] First choice leaves without banking. Drifter does not softlock.
- [x] Film choice banks `secret.s-tilde-vip`. Send without the tape is a no-op.
- [x] Send to Tilde enters `scene.conduct-demand`.
- [x] Spice 1 vs 2 changes VIP depiction; flags after demand stay the same.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-20T21:02:32Z`. 19 files / 34 tests.

## Technical approach

YAML only for the beat. `bank` + leverage `enter` already exist.
`send_secret` gains a vault check so injected sends no longer skip play.

## Blast radius

- **modules:** `canon`, `engine` (propose only), Player via existing Messages.
- **schemas:** none new.
- **tests:** spice-follow-up, gate-reach, hidden-state.

## Dependencies

- Requires: F-03 follow-through (done).
- Blocked by: none.
- Blocks: none.

## Open questions

- [x] Q1: New gate vs storylet → storylet after provoked watch.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drifter enters VIP and sticks | high | `choices[0]` is leave; no incident |
| Injected send still works | med | vault check |

## Estimated effort

- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run smoke and the spice contract.
2. Fixtures from propose choose + send.
3. Review context: same-session builder.
4. No commit unless asked.

## Legacy removal

- N/A.
