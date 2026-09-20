# Constitution — contrejour

> This file is the architectural contract for contrejour. It is read
> every time a new agent session starts, and enforced every time a sprint
> closes. If reality drifts from this file, fix one or the other.

## Purpose

Prove or disprove, cheaply, that UNSEEN's systemic design gives a player the
right balance of freedom, reveal and consequence, and give its author a desk
on which to fix what the proof finds.

contrejour is local-first. Authors and testers work on loopback. There is no
art, audio, video or 3D in the Player. Console storyboards are authoring
references (inspirational stills and prompts), not presentation. The full
game's scenes are out of scope: only the slice is authored.

## Architectural Principles

Each principle names the module that owns it and the chain that tests it.

### 1. Simulation before presentation

We test structure: choice, consequence, pacing of the reveal. The Player is
text-only. Owned by `player`. Tested by *Hidden state* (the Player never
receives production media) and by the slice play path.

### 2. Canon is data and the single source of truth

The bible is prose reference. After import, `canon/` wins wherever the two
disagree, and the disagreement is recorded as an issue, not silently resolved.
Owned by `canon`. Tested by *Proposal* and the validator.

### 3. Deterministic and event-sourced

State is the fold of an append-only event log with a seeded RNG. The same log
always yields the same state. Rewind, branching, replay and rehearsal are
consequences of this. Owned by `engine`. Tested by *Determinism* and *Rewind*.

### 4. Hidden state stays hidden, by contract

Meters, seen/used flags, witness queues and ending forecasts never reach the
Player API. The split is enforced by separate response schemas and a contract
test. Owned by `engine` views + the API. Tested by *Hidden state*.

### 5. Manual authoring is a peer of AI authoring

Any scene can be hand-written or rendered from its beat. Hand-written text
always wins. Every AI contribution to canon is a proposal with a diff and
needs human approval. Owned by `authoring` and `renderer`. Tested by
*Proposal* and *Render*.

### 6. The loop closes

Rehearsal findings and tester flags become proposals or issues against
specific canon entities. A rehearsal that only produces charts is a failed
feature. Owned by `rehearsal` and `authoring`. Tested by *Rehearsal to queue*.

### 7. Space is a contract

Locations carry a graph of nodes, edges, sightlines, earshot, hiding spots
and canonical facts. Eavesdropping and recording are computed from it. Owned
by `canon` + `engine`. Tested by *Capture to use* and *Access*.

### 8. Consequence survives undo

Rewind is generous. Important consequences must land late. The validator
warns when an important consequence lands in the same evening as its cause.
Owned by `engine` + `canon` validator. Tested by *Rewind* and *Witness to
consequence*.

### 9. Computationally enforced promises

Romanceable characters are adults. Intimate scenes require `consent:
negotiated`. The renderer may write spice levels 1 and 2 only. Level 3 is
hand-written or absent. `currency-down` plays at level 1. Token budgets are
enforced with a fallback to the beat. Owned by `canon` validator +
`renderer`. Tested by *Safety rails* and *Render*.

### 10. Privacy as architecture

Authoring and rehearsal never leave the machine unless a remote model
provider is configured. The server binds to loopback. No accounts in v1.
Owned by the API shell. Tested by bind-address checks in smoke.

### 1a. Module boundaries (normative checker)

contrejour modules communicate only through declared edges. Direct peer
imports are forbidden.

```
canon (domain types + loader)
  ^
  | types only
engine (pure fold)
  ^
  | public API only
packages/api  (orchestrator; not a peer module)
  ^
  | HTTP /v1/
player | authoring | rehearsal | renderer
```

Hard edges:

- `engine` imports only `canon` types. Nothing imports `engine` internals.
  The API server is the only caller.
- `player` may call only Player endpoints. `authoring` and `rehearsal`
  reports may call Console endpoints. Bots and personas may call only Player
  endpoints.
- `renderer` never writes to canon and never alters choices or effects.
- `rehearsal` never edits canon. It files proposals and issues.

> **This section is descriptive; the checker is normative.** The authoritative
> boundary rule is `harness/lib/check-boundaries.mjs` +
> `harness/boundaries.config.json`. If this prose and the checker ever
> disagree, the checker wins.

**Stdlib imports are always allowed.** Importing a standard-library or
declared third-party package is **not** a boundary violation.

**Target kinds:**

| Kind | What it is | Policy |
|------|------------|--------|
| `domain` | `canon` types and schemas | **allowed** |
| `shared_kernel` | blessed leaf helpers | **allowed** once listed in `allowedSharedTargets` |
| `infrastructure` | persistence / HTTP / clock / files | **must be injected**; a direct import from `engine` is `infra_leak` |
| `peer_module` | another listed module | **forbidden** |

### 2a. Domain purity

`packages/canon` contains schemas, types, the loader, the validator and an
index writer. YAML is the source of truth. F-01 emits a JSON index
(`out/canon-index.json`) with a frozen query API; SQLite is the later
implementation of the same writer. It may read YAML from disk. It has
zero imports from `engine`, `player`, `authoring`, `renderer` or `rehearsal`.

`packages/engine` contains only pure functions. No `fs`, no `fetch`, no
`Date.now`, no `Math.random`. Time and chance are arguments.

### 3a. Anti-corruption layers

Provider-specific types (model-vendor DTOs, HTTP framework request objects)
never leak into `canon` or `engine`. The API translates.

### 4a. Architectural boundaries & capability seams

1. **Seam criteria.** Separate Definition / Provider / Consumer only when two
   implementations are planned or an external vendor is involved. The renderer
   provider is such a seam. The engine is not.
2. **Direct implementation default.** Do not invent speculative interfaces.
3. Contract tests validate the preserved capability chains below.

### 5a. Explicit over implicit

Configuration is validated at boot. Hidden fields are absent from Player
schemas, not stripped after the fact.

### 6a. Delete before add

When new code replaces legacy code, the legacy is deleted immediately after
cutover validation.

## Module Boundaries

| Module | Responsibility | Input | Output |
|--------|----------------|-------|--------|
| `canon` | Schemas, loader, validator, SQLite index, importer from the bible | YAML files, `story-bible.md` | Validated canon, validation reports, `spatial-facts.md`, schematic SVG per location |
| `engine` | Pure rules: fold, calendar, gates, eligibility, effects, witnesses, captures, use classification, ending gates | Canon, event log, seed | State, views (player and console), new events |
| `player` | Text-only phone-frame UI. Timeline, rewind, Honest and Explorer modes. Tester flag sheet. | Player API | Actions, findings |
| `authoring` | Console: entity list, run inspector, findings queue, storyboards with prompt history, proposals with diff and approval | Console API | Findings, storyboard records, proposals |
| `renderer` | Scene prose from beats. Stub in F-01: show beat or hand-written Markdown | Beat, canon context, visible state | Pinned render or fallback |
| `rehearsal` | Scripted bots, later LLM personas. Drifter in F-01 | Player API, canon | Reports, findings |

The HTTP API (`packages/api`) is the orchestrator. It is not a peer module.

## Preserved Capability Chains

Each has exactly one end-to-end test that uses the public API only.

1. *Gate reach.* A run that makes no progress reaches every gate of the slice
   by date. A run that makes progress reaches them earlier.
2. *Determinism.* Replaying an event log yields a byte-identical state. Two
   runs with the same seed and actions are identical.
3. *Hidden state.* No Player response contains a hidden field, for every
   endpoint, checked against the schema.
4. *Witness to consequence.* An observed action propagates along `tells`
   edges with the declared delays and closes the declared door, and an
   unobserved one does not.
5. *Capture to use.* Audio drop at a node, quality from the space graph, clip
   marked, sent to a recipient, use classified, effects applied. Includes the
   phone-drawer block and the Sunday-call risk.
6. *Access.* A level opens at its phase, earlier through the work way, and
   the way of entry is recorded on the visit.
7. *Rewind.* Rewind to evening N equals the fold of events up to N. A sandbox
   branch never changes the canonical run. Commit promotes it and keeps the
   old line. (F-01: rewind inside current and previous evening only.)
8. *Proposal.* A canon change, human or AI, produces a diff and a validation
   report, writes nothing until approved, and stores the reason when rejected.
   (Deferred after F-01.)
9. *Render.* A scene without text is rendered, pinned by hash and reproduced
   from cache. Hand-written text overrides it. Over budget falls back to the
   beat. (F-01: stub — beat or hand-written file.)
10. *Rehearsal to queue.* A batch of scripted bots produces a report, and at
    least one seeded structural fault arrives in the authoring queue as a
    finding against the right entity.
11. *Safety rails.* A romanceable character under 18 fails the build. An
    intimate scene without `consent: negotiated` fails the build. The renderer
    refuses a level-3 request. A `currency-down` scene plays at level 1 under
    every setting. A missing level-3 file falls back to level 2 and appears
    in the Console as an open placeholder.

## Spec Delivery Order

1. F-01 Part I walking skeleton + tester desk (this constitution's first cut).
2. Authoring with proposals.
3. Secrets and witnesses complete for the slice.
4. Timeline, sandbox and Part flowchart.
5. Renderer with pinning and budgets.
6. Rehearsal with all bots, reports and findings.
7. The dinner and the slice finale.
8. LLM personas.
9. Hosted playtest build with telemetry.

## Quality Gates

Before any spec is marked **done**:

- [ ] All contract tests pass.
- [ ] Module unit tests cover happy path, edge cases, error cases.
- [ ] Boundary ratchet green: `node harness/lib/check-boundaries.mjs --check` exits 0.
- [ ] No hidden field in any Player fixture or live response.
- [ ] Plan updated with a Legacy Removal section, checked off.
- [ ] Project-owned design lint (when UI tokens change) passes.

## Amendment procedure

This document changes through the same plan-reviewed process as code:

1. Draft the change as a plan in `docs/plans/YYYY-MM-DD-constitution-<slug>.md`.
2. The plan is reviewed and approved (or logged, at autonomy `autonomous`).
3. The constitution is updated.
4. The plan is marked `done` at its original stable path.
