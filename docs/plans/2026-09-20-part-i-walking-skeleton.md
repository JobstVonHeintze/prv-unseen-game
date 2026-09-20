# Plan: Part I walking skeleton and tester desk

- **Date:** 2026-09-20
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `specs/001-part-i-walking-skeleton/spec.md`
- **Product track:** feature
- **feature:** F-01
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-20-2026-09-20-part-i-walking-skeleton-insession/council-summary.md`
- **inputs:**
  - `specs/constitution.md`
  - `docs/reference/prototype-design.md`
  - `docs/capability-map.md`
  - `BOOTSTRAP.md`

## Context

contrejour has a scaffold and a bible, no runnable simulator. The first
cut must be playable and useful as a desk: testers flag weak story, authors
inspect hidden state and attach storyboard prompts. Player presentation
stays text-only.

## Product framing

- **User / stakeholder:** author (one) and early playtesters.
- **Problem:** we cannot yet feel whether Part I's gates, evenings and
  capture loop work, or mark where the planned story fails.
- **Outcome:** `pnpm dev` serves API + Player + Console on loopback. A
  human finishes gate 7. A flag and a storyboard exist against real ids.
- **Non-goals:** proposals, real LLM render, sandbox commit, hosted build.
- **Decision log:** `docs/decisions/2026-09-20-autonomy-internal-tool.md`
- **Prior learnings consulted:** none relevant (greenfield).

## Blast radius

| Kind | Touched |
|------|---------|
| Modules | `canon`, `engine`, `player`, `authoring`, `renderer` (stub), `rehearsal` |
| Schemas | character, location, gate, scene, secret, witness, belief, meta, player-view, console-view, finding, storyboard |
| Chains | 1, 2, 3, 4 (Blanche), 5, 7; safety age rule |
| Tests | `tests/contract/*`, `packages/*/src/**/*.test.ts`, smoke |
| Deferred chains | 6 (access ways beyond phase), 8 (proposals), 9 (real render), 10 (full rehearsal batch), 11 (intimate/spice — validator only) |

## Pre-existing working tree

Scaffold + reference pack + personalised constitution/DESIGN/CLAUDE.md.
No application code yet. Root `story-bible.md` / `prototype-design.md`
are copies of `docs/reference/` (kept until cleanup).

## F-01 route table

Player (Elena-perceivable only):

- `POST /v1/runs`
- `GET /v1/runs/{id}/view`
- `POST /v1/runs/{id}/actions`
- `GET /v1/runs/{id}/timeline`
- `POST /v1/runs/{id}/rewind` (`sandbox` rejected)
- `POST /v1/runs/{id}/findings`

Console:

- `GET /v1/console/canon/{type}` and `/{id}`
- `GET /v1/console/runs/{id}/state`
- `GET /v1/console/runs/{id}/events`
- `GET /v1/console/runs/{id}/ending-forecast` (stub: remaining gates)
- `GET|POST /v1/console/findings`
- `GET|POST|PATCH /v1/console/storyboards`

404: `POST /v1/runs/{id}/commit`, `POST /v1/console/proposals`, `POST /v1/console/rehearsals`.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 1 | pnpm workspace + packages | config | `package.json` | `test -f pnpm-workspace.yaml` | P0 |
| 2 | Canon schemas, loader, validator, Part I YAML | code | `packages/canon`, `canon/` | `pnpm exec vitest run packages/canon --reporter=dot` | P0 |
| 3 | Pure engine fold + views | code | `packages/engine` | `pnpm exec vitest run packages/engine --reporter=dot` | P0 |
| 4 | `/v1/` API on loopback | code | `packages/api` | `pnpm exec vitest run tests/contract --reporter=dot` | P0 |
| 5 | Player phone UI | code | `apps/player` | `pnpm exec vitest run tests/contract/player-surface.test.ts --reporter=dot` | P0 |
| 6 | Console desk | code | `apps/console` | `pnpm exec vitest run tests/contract/console-desk.test.ts --reporter=dot` | P0 |
| 7 | Renderer stub | code | `packages/renderer` | `pnpm exec vitest run packages/renderer --reporter=dot` | P0 |
| 8 | Drifter bot | code | `packages/rehearsal` | `pnpm exec vitest run packages/rehearsal --reporter=dot` | P0 |
| 9 | Chain + contract tests | test | `tests/` | `pnpm test` | P0 |
| 10 | Smoke script | config | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] Drifter reaches every Part I gate by date (chain 1).
- [x] Same seed + actions ⇒ byte-identical folded state (chain 2).
- [x] No Player JSON contains `meter.`, `seen`, `used`, `witnessQueue`, `ending` (chain 3).
- [x] Blanche observes an arrival and tells Cédric the same evening (chain 4).
- [x] Audio drop at `node.ascend.lobby` yields s01 quality from the graph (chain 5).
- [x] Rewind to previous evening equals fold of events up to that checkpoint (chain 7).
- [x] Romanceable age < 18 fails validation.
- [x] Tester finding stored against a canon id with a detailing axis.
- [x] Storyboard prompt edit appends history; previous prompt kept.
- [x] Two gate scenes served from `canon/text/*.md`.
- [x] Server listens on 127.0.0.1 only.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
Test Files  14 passed (14)
      Tests  22 passed (22)
Test Files  1 passed (1)   # tests/contract/gate-reach.test.ts
      Tests  2 passed (2)
smoke ok
# 2026-09-20T08:16:16Z — loopback API + Player :5173 + Console :5174
```

## Technical approach

- TypeScript ESM monorepo, pnpm workspaces, Vitest, Zod 4, YAML canon.
- Layout: `packages/{canon,engine,api,renderer,rehearsal}`, `apps/{player,console}`.
- `engine` has no runtime deps. Seeded xorshift32. `state = fold(events)`.
- Player view and Console view live in separate files under `packages/engine/src/views/`.
- API: Node `node:http` (no framework). JSON only. Data dir `data/` for runs,
  findings, storyboards. Images stored under `data/uploads/`.
- Player and Console: Vite, vanilla TypeScript, token CSS from DESIGN.md.
  Dev proxy `/v1` → API :8787. Player port 5173, Console 5174.
- Canon IDs never derived from display names.
- SQLite index: `packages/canon` writes `out/canon-index.sqlite` at load for
  queries; YAML remains the source of truth. If native sqlite is painful on
  Node 20, use a JSON index with the same query surface and a failing test
  that documents the D3 gap — prefer `node:sqlite` polyfill-free better-sqlite3
  only if install is clean; otherwise JSON index is acceptable for F-01 with
  the query API stable.
- Findings categories: `rewrite`, `location-missing`, `location-broken`,
  `needs-detailing`, `romance-gap`, `backstory-mismatch`, `timing`,
  `player-knowledge`.
- Romance-gap findings require `detail_axis` in `{l1,l2,l3}`.

## Dependencies

- Requires: personalised constitution, DESIGN.md, reference pack (done).
- Blocked by: none.
- Blocks: F-02 authoring with proposals.

## Open questions

- [x] Q1: SQLite vs JSON index in F-01 -> JSON index with stable query API if native module blocks smoke; YAML remains source of truth (D3 spirit).
- [x] Q2: Storyboards vs "no art" -> Console-only authoring refs; Player never shows them.
- [x] Q3: Framework -> Vite + vanilla TS, no React.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bible contradictions on import | med | Record as findings, do not guess |
| Scope too large for one feature | high | Slice evenings: enough scenes to reach g7; not the whole dating matrix |
| Hidden-state leak | high | Separate schemas + contract test on every Player fixture |
| Native sqlite install | med | JSON index fallback with same API |

## Estimated effort

- Implementation: 1 session
- Tests: included
- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run `bash scripts/smoke.sh` and every deliverable DoD.
2. Confirm fixtures are states the real write path can produce.
3. Record review context: same-session.
4. No commits unless the owner asks.

## Legacy removal

- [ ] Keep `unseen-handoff/` as archive; do not treat it as source.
- [ ] Root `story-bible.md` and `prototype-design.md` are duplicates of
      `docs/reference/` — leave until cleanup, do not edit.
