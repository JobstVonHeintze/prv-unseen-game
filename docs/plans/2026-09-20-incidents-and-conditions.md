# Plan: Incidents and felt conditions (first-night rain)

- **Date:** 2026-09-20
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/reference/story-bible.md` Part I first night + gallery; `docs/reference/prototype-design.md` §§2–3
- **Product track:** feature
- **feature:** F-03
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-20-2026-09-20-incidents-and-conditions-insession/council-summary.md`
- **inputs:**
  - `specs/constitution.md`
  - `docs/decisions/2026-09-20-conditions-not-resources.md`
  - `docs/reviews/2026-09-20-F-01.md`
  - `docs/learnings/2026-09-20-review-gate-no-nested-yaml-quotes.md`

## Context

F-01 is closed. The first-night scene is still one button ("Go on into the
rain"). The bible says Jonas flirts through her, she leaves embarrassed,
and *then* the rain starts; Marga opens the gallery on a soaked girl in
green. The owner asked for that causal chain, plus a trackable system so
time under rain changes wetness and wetness changes what she can do next
(walk home vs ask Viktor or Paloma; upstairs changing room; watched /
recorded / she can provoke it). F-02 (proposals) stays `not_started`.

## Product framing

- **User / stakeholder:** playtester and author. Elena is the only Player
  point of view.
- **Problem:** gates fire by date/progress, but some nights are *caused*
  by what she just did, then lock her until she finds the one cover that
  works. Wet clothes are not a hidden meter.
- **Outcome:** after the Jonas beat she cannot skip to the gallery. Failed
  cover raises `condition.wetness`. Soaked blocks "go home" and unlocks
  help → `loc.galerie-restrepo` l2. Console lists conditions in one table.
- **Non-goals:** F-02 proposals; a resource HUD; wall-clock time; general
  inventory; Tilde's full VIP evening as playable Part I content; LLM
  render; hosted playtest; a Player menu of use-types (recipient still
  classifies the use).
- **Decision log:** `docs/decisions/2026-09-20-conditions-not-resources.md`,
  `docs/decisions/2026-09-20-spice-scaled-follow-ups.md`
- **Prior learnings consulted:** harness YAML-quote trap (not in scope).
  No prior engine learning on conditions.

## Pre-existing working tree

The repository still has no first commit. The whole tree is untracked
F-01 work plus this plan. Do not stash, reset, or adopt unrelated paths.
This feature touches only the paths listed under blast radius.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Register F-03 on the feature board (WIP=1) | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Canon: `condition.wetness`, `incident.rain-street`, rain-cover + changing-room scenes, gallery l2 | code | `canon/conditions/` `canon/incidents/` `canon/scenes/` | `pnpm exec vitest run packages/canon/src/validate.test.ts --reporter=dot` | P0 |
| 2 | Engine fold/propose: conditions, incident lock, pressure, forged-choice reject | code | `packages/engine/src/` | `pnpm exec vitest run packages/engine/src/fold.test.ts --reporter=dot` | P0 |
| 3 | Player `felt` + Console conditions table | code | `packages/engine/src/views/` `apps/player/src/main.ts` `apps/console/src/main.ts` | `pnpm exec vitest run tests/contract/hidden-state.test.ts tests/contract/console-desk.test.ts --reporter=dot` | P0 |
| 4 | Contract: Jonas → rain; only gallery valid; time soaks; soaked blocks home; record flag; g2 once | test | `tests/contract/incident-condition.test.ts` | `pnpm exec vitest run tests/contract/incident-condition.test.ts --reporter=dot` | P0 |
| 5 | Drifter still reaches g1–g7; smoke green | test | `tests/contract/gate-reach.test.ts` `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |
| 6 | Spice-scaled follow-ups + taken-secret leverage (same flags at l1/l3) | code | `packages/canon/src/spice.ts` `canon/scenes/scene.gallery-watch-*.yaml` `canon/secrets/secret.s-tilde-vip.yaml` | `pnpm exec vitest run tests/contract/spice-follow-up.test.ts --reporter=dot` | P0 |
| 7 | Writer-deployable follow-through: any choice or secret use may `start_incident` / `enter`; Console lists conditions and incidents | code | `packages/engine/src/propose.ts` `packages/api/src/server.ts` | `pnpm exec vitest run tests/contract/spice-follow-up.test.ts --reporter=dot` | P0 |

## Acceptance criteria

- [x] Rain does not start until she leaves after being flirted through.
- [x] Cover options include at least three invalid shelters and one valid
      (gallery). Invalid choices stay in the incident and add pressure.
- [x] Pressure steps `condition.wetness` dry → damp → wet → soaked.
- [x] After the gallery: damp/wet may walk home; soaked must ask Viktor
      or Paloma. Help opens the upstairs changing room.
- [x] Changing-room choices include a discreet change and at least one
      watched / recorded / provoke path that sets a durable flag.
- [x] Spice selects depiction only: door-ajar at spice 1 vs 2 shows
      different prose; `flag.recorded.changing` and leverage classification
      are identical. L3 placeholder never appears in the Player (falls back
      to l2). `currency-down` / `coercion` lock to l1.
- [x] Player `felt` is prose only; JSON has no `condition.`, `incident.`,
      or `meters`.
- [x] Console shows conditions (level + last change + gated actions) and
      the open incident id.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
Test Files  17 passed (17)
      Tests  31 passed (31)
smoke ok
```

## Technical approach

State additions (fold replay is event-sourced; no in-place mutation
outside fold):

```
conditions: Record<string, string>   // condition.wetness -> "damp"
incident: null | { id: string; pressure: number }
```

Event grammar:

| Moment | Events (in order) | fold |
|--------|-------------------|------|
| Leave after Jonas | `choice.made` `{resolvesScene:true}` then `incident.started` `{incidentId, sceneId, pressure:0}` then `scene.entered` rain-cover | set incident; wetness stays `dry` until the first tick (rain has started; silk is not yet dark) |
| Invalid cover / wait | `choice.made` `{resolvesScene:false}` then `incident.ticked` `{pressure, stepped?: conditionId}` | keep `currentScene`; pressure++; step wetness at thresholds 1→damp, 2→wet, 3→soaked |
| Valid gallery door | `choice.made` `{resolvesScene:true}` then `incident.resolved` then `gate.fired` g2 (once) then `scene.entered` gallery | `incident=null`; `flag.reached-gallery`; g2 in `firedGates`; enter gallery |
| Soaked + walk home | `propose` no-op (and Player omits the choice) | unchanged |
| Ask Viktor / Paloma | `choice.made` then `scene.entered` gallery-change | `flag.gallery-upstairs` |
| Provoke / linger | `choice.made` `{set: flag.recorded.changing}` | flag set; scene may clear |

g2 `trigger.progress.all: [flag.reached-gallery]`. Date day 2 remains the
backup. `dueGates` skips fired ids, so gallery happens once.

`fold` `choice.made` clears `currentScene` only when
`payload.resolvesScene !== false`.

`propose` rejects: `advance_evening` / free `enter_scene` while incident
open; `choose` whose `requires.conditions` fail.

No new provider/seam. Player allowlist adds `felt` only. Console adds
`conditions` (id, level, lastChange, gates) and `incident`.

Drifter: `choices[0]` on first-night is leave-street; on rain-cover is
the gallery door. Contract test walks invalid covers on purpose.

Update `scripts/write-canon.mjs` so a regen does not wipe the new YAML.

## Implementation slices (same feature)

1. Register F-03, bind harness.
2. Schemas + YAML + load/validate.
3. Engine events + fold unit tests.
4. propose locks + views + UI.
5. Contract + smoke.

## Blast radius

- **modules:** `canon`, `engine`, `player` (view + phone frame), Console
  inspector, `rehearsal` only if the Player view type grows (`felt` is
  unused by the drifter).
- **schemas:** `ConditionSchema`, `IncidentSchema`, choice `requires`,
  `EffectSchema`, `Canon` load/index/validate (`condition.` / `incident.`
  refs).
- **capability chains:** evening loop, gate fire, hidden-state allowlist.
- **tests:** new `incident-condition` contract; existing hidden-state,
  player-surface, console-desk, gate-reach, rewind.
- **vocabulary:** add *condition* and *incident* to `CLAUDE.md` /
  `BOOTSTRAP.md` catalog. Not a new AGENTS.md non-negotiable.

## Dependencies

- Requires: F-01 walking skeleton (done).
- Blocked by: none.
- Blocks: later leverage that reads `flag.recorded.changing`; F-02 can
  author these entities once proposals exist.

## Open questions

- [x] Q1: Resource vs condition → condition + incident (decision above).
- [x] Q2: Wall clock vs beats → integer pressure; engine stays clock-free.
- [x] Q3: Start F-02 first → no. This is the playable hole. F-02 stays queued.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incident softlocks the drifter | high | Valid exit is `choices[0]`; smoke still greps g7 |
| Felt line leaks ids | high | hidden-state forbids `condition.` / `incident.` |
| Fold clears scene on every choice | high | `resolvesScene: false` keeps `currentScene` |
| g2 / gallery twice | high | Valid exit fires g2 once via `flag.reached-gallery`; contract asserts exact-once |
| Forged ineligible choose | med | `propose` no-op; contract posts the hidden id |
| write-canon wipe | med | Update the generator in the same change |
| Scope creeps into blackmail plot | med | Flag only; no later scene |

## Estimated effort

- Implementation: 1 session
- Tests: included
- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run `bash scripts/smoke.sh` and every deliverable DoD.
2. Fixtures are states `propose` can produce (play Jonas → leave → fail
   cover → gallery → soaked help → change).
3. Review context: same-session builder unless a fresh host review runs.
4. No commits unless the owner asks.

## Legacy removal

- N/A. No files deleted. First-night and gallery YAML are extended, not replaced.
