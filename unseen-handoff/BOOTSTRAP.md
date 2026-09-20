# BOOTSTRAP.md — contrejour

One-time prompt for the project AI (Claude Code). Paste the whole file into the
first session of a repository freshly scaffolded with `create-spec-kit`. It turns
the generic scaffold into this project. Delete this file once Step 5 is approved.

Reference pack, to be copied into the repository before you start:

| File | What it is |
| --- | --- |
| `docs/reference/story-bible.md` | The complete UNSEEN story bible: plot map, reveal ladder, all characters, relationships, locations, access map, dating layer, moral system, secrets system, phone, secrets catalogue, endings. Narrative reference. |
| `docs/reference/prototype-design.md` | Technical design: canon data model with YAML examples, space graph, engine, timeline and rewind, authoring, renderer, rehearsal, API surface, slice scope, test strategy. |
| `docs/assets/unseen_location_map.svg` | City map with access phases per location level. |

---

## Naming and brand voice

Read first. Applies to every file, identifier and message.

- **The game** is **UNSEEN** (working title). Always upper case in prose. Never
  "Unseen", never "unseen" except inside identifiers.
- **This project** is **contrejour**: the narrative simulator and authoring desk
  for UNSEEN. Always lower case, one word, no accent, also at the start of a
  sentence and in headings. Package scope: `@contrejour/*`.
- Why the name: *contre-jour* is a shot taken against the light. It shows the
  silhouette of a subject before any detail. That is this tool's job: show the
  shape of the story before a single frame exists. Inside the fiction it is also
  the bar where the unseen people of the city meet, and the handle of the one
  account that watches Elena from the first day.
- **Surfaces** are called **Player** and **Console**. Never "frontend" or "admin".
- **Modules** are lower case single words: `canon`, `engine`, `player`,
  `authoring`, `renderer`, `rehearsal`.
- **Canon IDs** are stable, lower case, dot-separated and never derived from
  display names: `char.celeste`, `loc.ascend.l4`, `gate.p1.g7`, `secret.s22`,
  `spine.d05`, `belief.b2`, `meter.celeste`. Two characters are due to be renamed.
  IDs must survive that.
- **Domain vocabulary** is fixed by the bible. Use its words exactly: *phase*,
  *level*, *way* (work, company, status, price), *gate*, *evening*, *secret*,
  *taken* / *given*, *witness*, *belief*, *spine decision*, *seen or used*,
  *the Céleste meter*, *visibility*. Do not invent synonyms such as "karma",
  "quest", "mission", "reputation".
- **Voice in user-facing text:** plain, exact, a little dry. Never hype. Never
  explain the theme to the player.
- Code, comments, specs and commit messages are in English.

---

## Architecture posture

**Two surfaces, one API, one pure engine.**

- **Player** is what a playtester sees: a text-only browser build framed as
  Elena's phone. It receives only what Elena could perceive.
- **Console** is what an author sees: canon editor with diff preview, validation,
  run inspector with full hidden state, rehearsal reports.
- Both surfaces, and every bot and LLM persona, are clients of the same versioned
  HTTP API (`/v1/`). Nothing reaches the engine by any other route.
- The **engine is a pure library**: no I/O, no clock, no randomness except a
  seeded generator passed in. The API server is a thin shell around it.
- **Local-first.** The server binds to loopback only. No accounts, no cloud
  dependency for authoring or rehearsal. A hosted playtest build comes later and
  adds pseudonymous run tokens, nothing else.

---

## Strategic posture

These commitments shape the modules. Each must be visible in the constitution's
principles, in a module boundary and in a capability chain.

1. **Simulation before presentation.** We are testing whether the structure works
   for a player: choice, consequence, pacing of the reveal. There is no art, audio,
   video or 3D in this project. Any proposal to add presentation is out of scope.
2. **Canon is data and the single source of truth.** The bible is prose reference.
   After import, `canon/` wins wherever the two disagree, and the disagreement is
   recorded as an issue, not silently resolved.
3. **Deterministic and event-sourced.** State is the fold of an append-only event
   log with a seeded RNG. The same log always yields the same state. Rewind,
   branching, replay and rehearsal are consequences of this, not features added
   on top.
4. **Hidden state stays hidden, by contract.** Meters, seen/used flags, witness
   queues and ending forecasts never reach the Player API. The split is enforced
   by separate response schemas and a contract test.
5. **Manual authoring is a peer of AI authoring.** Any scene can be hand-written
   or rendered from its beat. Hand-written text always wins. Every AI contribution
   to canon is a proposal with a diff and needs human approval. Rejections carry a
   reason and are reused as context.
6. **The loop closes.** Rehearsal findings become proposals or issues against
   specific canon entities. A rehearsal that only produces charts is a failed
   feature.
7. **Space is a contract.** Locations carry a graph of nodes, edges, sightlines,
   earshot, hiding spots and canonical facts. Eavesdropping and recording are
   computed from it. 2D plans are generated from it. 3D is deferred to production
   and must satisfy it.
8. **Consequence survives undo.** Rewind is generous, and the design keeps its
   weight because consequences land late. The validator warns when an important
   consequence lands in the same evening as its cause.
9. **Computationally enforced promises.**
   - Any romanceable character is an adult: the build fails otherwise.
   - A spice level in `canon/meta.yaml` (1 to 3, default 2) selects which text of an
     intimate scene plays. The renderer may write levels 1 and 2 only. Level 3 is
     hand-written or absent. Exploitative and coercive scenes never rise above
     level 1. All of this is checked in tests.
   - Renderer token budgets per run and per day are enforced in code, with a
     tested fallback to the raw beat text.
10. **Privacy as architecture.** Authoring and rehearsal never leave the machine
    unless a remote model provider is configured. Playtest telemetry is opt-in,
    pseudonymous, minimal and EU-hosted. No free-text answer is stored with any
    identifier other than the run token.

---

## Catalog primitives

The reference vocabulary. Every spec, schema and UI label uses these and only these.

| Primitive | Meaning | Defined in the bible under |
| --- | --- | --- |
| Part | One of four story parts (I Unseen, II The Subject, III Unveiled, IV The Stairs). | Plot map |
| Phase 0 to 5 | Story-gated stage of Elena's visibility. Everyone reaches every phase. | The dating layer |
| Visibility | Stat inside a phase. Opens optional content. Hidden. | The dating layer |
| Gate | Mandatory scene. Fires on progress or on date, whichever comes first. | Plot map |
| Evening | Free block between gates: pick a place, a scene, choices. | Plot map |
| Scene | Storylet with preconditions, beat, choices, effects, witnesses, hooks back. | prototype-design §2.3 |
| Belief b1 to b9 | What the player is led to believe. Five are false. Analytic overlay. | The reveal ladder |
| Theory question | Asked three times. Records the player's belief. | Plot map |
| Level l1 to l4 | Threshold, floor, back room, inner circle of a location. | Access map |
| Way | Work, company, status or price. How Elena enters decides how she is seen. | Access map |
| Space node | Room or spot inside a location, with sightlines, earshot, hiding, facts. | prototype-design §3 |
| Secret | Item with about, origin (taken or given), proof, spread. | The secrets system |
| Capture | Audio drop or hidden video, resolved into a clip with a quality. | The phone |
| Use | Keep, tell, trade, expose, leverage. Classified from the recipient. | The secrets system |
| Witness | Who observes what, and whom they tell, with delay. | The moral system |
| Seen or used | Per-character flag pair. The moral axis. Never about sex. | The moral system |
| The Céleste meter | Rises when Elena uses being wanted, or a person, as currency. Hidden. | The dating layer |
| Stance | Elena leads, equals, or follows (performed). Per relationship. | The moral system |
| Spice level 1 to 3 | Fade to black, sensual, explicit. Only the third beat of an intimate scene varies. | Intimacy design |
| Spine decision d01 to d12 | The twelve points of no return. | The decision spine |
| Ending gate | Requirements for each of the four endings. | Ending gates |

---

## Context

**Project.** contrejour, the narrative simulator and authoring desk for UNSEEN.

**Description.** UNSEEN is an interactive film: part noir thriller, part mystery,
part dark romance, played through Elena Marin, a young woman nobody seems to see.
Its design is systemic, not a branching tree: gates with two triggers, free
evenings, phased access to locations, a dating layer, a witness network, a
secrets-and-recording economy run from Elena's phone, two hidden meters, twelve
spine decisions and four endings. Before any money goes into production, we need
to know whether this machine gives a player the right balance of freedom, reveal
and consequence. contrejour answers that with a text-only playable, an authoring
desk and synthetic plus human playtesting.

**Audience.**
- *Author* (one person at first): edits canon, reviews proposals, reads rehearsal
  reports. Technically fluent. Works locally.
- *Playtester* (50 to 200 people, later): plays the slice in a browser, on a phone
  or laptop. Not technical. Target profile: adult readers of dark romance and
  thrillers, and players of narrative mystery games.
- *Synthetic players*: scripted bots and LLM personas driving the public API.

**Stack (decided, see D1 to D4).** TypeScript monorepo with pnpm workspaces.
Engine as a dependency-free library. HTTP API on Node. Canon as YAML in git,
validated by schemas, indexed into SQLite at build time for queries. Player and
Console as lightweight browser apps. Vitest for tests. No framework is mandated for
the two surfaces beyond "small and boring".

**Deployment.** Loopback only. `pnpm dev` starts API, Player and Console. Later:
a static Player build plus a small EU-hosted API for human playtests.

**Modules.**

| Module | Responsibility | In | Out |
| --- | --- | --- | --- |
| `canon` | Schemas, loader, validator, SQLite index, importer from the bible. | YAML files, `story-bible.md` | Validated canon, validation reports, `spatial-facts.md`, schematic SVG per location |
| `engine` | Pure rules: fold, calendar, gates, eligibility, effects, witnesses, captures, use classification, ending gates. | Canon, event log, seed | State, views (player and console), new events |
| `player` | Text-only phone-frame UI. Timeline, rewind, sandbox, Honest and Explorer modes. | Player API | Actions |
| `authoring` | Console: entity editor, proposals with diff, approvals, run inspector. | Console API | Canon changes through proposals |
| `renderer` | Scene prose from beats. Provider abstraction, pinning, budgets, spice levels 1 and 2 only. | Beat, canon context, visible state | Pinned render or fallback |
| `rehearsal` | Scripted bots, LLM personas, batch runner, reports, findings to proposals. | Player API, canon | Reports, proposals, issues |

**Scope-out.** Art, audio, video, 3D. Game-engine integration. Accounts and
payments. Mobile apps. Localisation. Multiplayer. Any analytics beyond the listed
playtest events. Writing the full game's scenes: only the slice is authored.

**Risks.**
- The bible is large and written as prose. Import will surface contradictions.
  Treat them as findings, keep a log, do not guess.
- Two characters will be renamed, and the cast needs tiering. IDs and a `tier`
  field absorb this.
- Rendered prose can flatter a weak structure or sink a strong one. Gate scenes in
  the human slice are hand-written.
- LLM personas are not people. Their belief curves are hypotheses to test with
  humans, never a substitute.
- Adult themes. The spice-level, consent and age rules are safety rails, not decoration.

---

## Decisions resolved

Settled. Do not reopen without the author asking.

- **D1. Bespoke over existing tools.** Ren'Py, Twine and similar are
  branch-and-variable tools with strong presentation. We need a storylet
  simulation that can be run headlessly a thousand times. Hand-written scene text
  may use ink later (see D12).
- **D2. TypeScript, pnpm workspaces, Node LTS.** One language across engine, API,
  surfaces and bots.
- **D3. Canon as YAML in git, indexed to SQLite at build.** Human-diffable,
  reviewable, versioned. The database is a derived artefact and is never edited.
- **D4. API-first, explicit `/v1/`.** Player, Console, bots and personas share it.
- **D5. Event sourcing with a seeded RNG.** `state = fold(events)`. No mutable
  saves.
- **D6. Two response schemas.** Player view and Console view are distinct types
  with a contract test that fails if a hidden field leaks.
- **D7. Storylets, not trees.** Scenes are drawn by eligibility. Gates have a
  progress trigger and a date trigger.
- **D8. Space graph from day one. 2D generated. 3D deferred.** See
  prototype-design §3. No geometry in this project.
- **D9. Rewind model.** Evening checkpoints. Free rewind within the current
  evening. Sandbox what-if branches that never touch the canonical run unless
  committed. Honest mode as first-run default, Explorer mode as opt-in. Flowchart
  after each Part. No fail states.
- **D10. Late consequences as a design rule.** Validator warning for
  same-evening consequences.
- **D11. Recipient-based use classification.** The Player has no "blackmail"
  button. The engine classifies the use from the recipient.
- **D12. Scene text: Markdown first.** One file per scene under `canon/text/`.
  ink is allowed per scene when a scene needs internal flow. The renderer is used
  only where no file exists.
- **D13. Proposals for every canon change.** Human and AI alike. Diff, validation
  report, explicit approval. Rejection reasons are stored and reused.
- **D14. Renderer provider abstraction.** Remote API or a local
  OpenAI-compatible endpoint, chosen in config. Model identifiers in config only.
  Pinned, cached renders. Enforced budgets with fallback.
- **D15. Rehearsal has two tiers.** Six scripted bots in CI on every canon change.
  LLM personas on demand, budgeted.
- **D16. Findings write to the authoring queue.** Thresholds in config.
- **D17. Safety rails are build failures.** Age rule. `consent: negotiated` on
  every intimate scene. See D22 for spice levels.
- **D18. Slice scope.** Part I complete plus Part II gates 1 and 2, ending on
  Isolde's offer. Cast, locations, mechanics and secrets as listed in
  prototype-design §10. The whole bible is imported as data. Only the slice gets
  scenes.
- **D19. Playtest telemetry.** Opt-in, pseudonymous run token, the event list in
  prototype-design §10, EU hosting, no third-party analytics.
- **D20. Standalone repository, plain files.** contrejour does not depend on any
  other writing tool. Canon is plain YAML and Markdown so that other tools can
  read it.
- **D22. Intimacy is layered, and the top layer is hand-written.** Three spice
  levels in `canon/meta.yaml` (1 fade to black, 2 sensual and default, 3 explicit).
  All imagery, now and later, has the sensual level as its ceiling. Level 3 exists
  in text and voice only, is `source: hand-only`, and the renderer is limited to
  levels 1 and 2 by code and by test. Coercion is never tagged intimate. See
  prototype-design §2.8 and the bible's *Intimacy design*.
- **D21. Blast-radius check is mandatory.** Every plan names the modules, schemas,
  chains and tests a change touches before implementation starts.

Open, to be carried as `[NEEDS CLARIFICATION]`:

- The identity of the character called "the Client".
- New display names for `char.cedric` and `char.julian`.
- Elena's narrating voice: a style guide is needed before slice scenes are written.
- Visual tokens for DESIGN.md (see Step 3).

---

## Steps

> ### Before you start
>
> Read, in this order, and confirm in one paragraph what each one governs:
> `CLAUDE.md`, `MANUAL.md`, `specs/constitution.md`, `DESIGN.md`, then
> `docs/reference/prototype-design.md` in full, then the following sections of
> `docs/reference/story-bible.md`: *Premise and solution in brief*, *Plot map*
> (all of it), *The dating layer*, *The moral system*, *Access map*,
> *The secrets system*, *The phone*, *Intimacy design*. Skim the rest so you know where things are.
>
> Do not write any code or change any file yet. Report contradictions you notice
> between the bible and the prototype design as a list. Do not resolve them.
>
> **Wait for approval before continuing.**
>
> ### Step 1 — Personalise `CLAUDE.md`
>
> 1. Replace the generic project section with: what contrejour is, what UNSEEN is,
>    the two surfaces, the six modules, and the sentence "Simulation before
>    presentation: no art, audio, video or 3D in this repository."
> 2. Add the **Naming and brand voice** rules verbatim, including the fixed domain
>    vocabulary and the list of words not to use.
> 3. Coding conventions:
>    - TypeScript strict. No `any` in `engine` or `canon`.
>    - `engine` has zero runtime dependencies and performs no I/O, reads no clock
>      and uses no randomness except the injected seeded generator.
>    - All state changes are events. No function mutates state in place.
>    - Player view types and Console view types live in separate files and may not
>      import from each other.
>    - Every canon entity type has a schema, a loader test and at least one fixture.
>    - Model identifiers, budgets and thresholds live in config, never in code.
> 4. Workflow rules:
>    - Every change starts from a spec. No implementation without an approved plan.
>    - Every plan contains a **blast-radius section**: modules, schemas, capability
>      chains and tests touched.
>    - Canon files are changed only through the proposal mechanism once it exists.
>      Until then, canon changes go in their own commits with a rationale.
> 5. "When stuck" pointers: prototype-design section numbers per topic, the bible
>    section names per primitive (use the Catalog primitives table), and the rule
>    "if the bible and canon disagree, canon wins and you open an issue".
>
> Show the full diff. **Wait for approval before committing.**
>
> ### Step 2 — Personalise `specs/constitution.md`
>
> Run `/speckit.constitution` and fill it as follows.
>
> **Purpose.** Prove or disprove, cheaply, that UNSEEN's systemic design gives a
> player the right balance of freedom, reveal and consequence, and give its author
> a desk on which to fix what the proof finds.
>
> **Module boundaries.** Use the module table from Context. Add these hard edges:
> - `engine` imports only `canon` types. Nothing imports `engine` internals. The
>   API server is the only caller.
> - `player` may call only Player endpoints. `authoring` and `rehearsal` reports
>   may call Console endpoints. Bots and personas may call only Player endpoints,
>   so that they can know nothing a human could not.
> - `renderer` never writes to canon and never alters choices or effects.
> - `rehearsal` never edits canon. It files proposals and issues.
>
> **Preserved capability chains.** Each has exactly one end-to-end test that uses
> the public API only.
> 1. *Gate reach.* A run that makes no progress reaches every gate of the slice by
>    date. A run that makes progress reaches them earlier.
> 2. *Determinism.* Replaying an event log yields a byte-identical state. Two runs
>    with the same seed and actions are identical.
> 3. *Hidden state.* No Player response contains a hidden field, for every
>    endpoint, checked against the schema.
> 4. *Witness to consequence.* An observed action propagates along `tells` edges
>    with the declared delays and closes the declared door, and an unobserved one
>    does not.
> 5. *Capture to use.* Audio drop at a node, quality from the space graph, clip
>    marked, sent to a recipient, use classified, effects applied. Includes the
>    phone-drawer block and the Sunday-call risk.
> 6. *Access.* A level opens at its phase, earlier through the work way, and the
>    way of entry is recorded on the visit.
> 7. *Rewind.* Rewind to evening N equals the fold of events up to N. A sandbox
>    branch never changes the canonical run. Commit promotes it and keeps the old
>    line.
> 8. *Proposal.* A canon change, human or AI, produces a diff and a validation
>    report, writes nothing until approved, and stores the reason when rejected.
> 9. *Render.* A scene without text is rendered, pinned by hash and reproduced
>    from cache. Hand-written text overrides it. Over budget falls back to the beat.
>    Choices and effects are unchanged in every case.
> 10. *Rehearsal to queue.* A batch of scripted bots produces a report, and at
>     least one seeded structural fault (an unreachable scene in a fixture)
>     arrives in the authoring queue as a finding against the right entity.
> 11. *Safety rails.* A romanceable character under 18 fails the build. An
>     intimate scene without `consent: negotiated` fails the build. The renderer
>     refuses a level-3 request. A `currency-down` scene plays at level 1 under
>     every setting. A missing level-3 file falls back to level 2 and appears in
>     the Console as an open placeholder.
>
> **Architectural principles.** Restate the ten Strategic posture commitments as
> principles, in the constitution's own format. Each principle must name the
> module that owns it and the chain that tests it.
>
> Show the full diff. **Wait for approval before committing.**
>
> ### Step 3 — Adapt `DESIGN.md`
>
> UI is in scope for both surfaces. There are no brand tokens yet. Do not invent
> hex values. Capture posture and components, and mark tokens as open.
>
> **Posture.**
> - `[Player]` Intimate, quiet, nocturnal, text-first. It should feel like holding
>   someone else's phone. Deferential: the interface never comments on the story
>   and never shows a number that Elena could not see.
> - `[Console]` Calm, dense, exact. A desk, not a dashboard. Diffs and validation
>   are first-class. Nothing moves unless the author moved it.
>
> **Provisional colour language.** The phase colours and the dark ground used in
> `docs/assets/unseen_location_map.svg` are the only existing visual reference.
> You may lift them as provisional tokens, clearly marked provisional, and use
> numbers alongside colour everywhere so that nothing depends on colour alone.
>
> **Components by surface.**
> - `[Player]` Phone frame. App grid (Recorder, Camera, Vault, Messages, Account,
>   Maps, Notes, Calendar). Evening header with date. Location picker. Scene
>   reader. Choice list. Capture sheet (mode, placement, start and stop). Clip
>   marker over a text transcript. Recipient picker with warning-or-demand tone
>   for incriminated recipients. Timeline with rewind, sandbox banner and commit.
>   Open-question line in Notes. Part flowchart.
> - `[Console]` Entity list with search and tier filter. Entity editor.
>   Proposal view with diff, validation report, approve and reject-with-reason.
>   Run inspector: event log beside full state, meters, witness queues, ending
>   forecast. Rehearsal report viewer. Findings queue.
> - `[Console+Player]` Location schematic rendered from the space graph.
>
> Accessibility: keyboard-complete, readable at phone width, no information by
> colour alone, reduced motion by default.
>
> Show the full diff. **Wait for approval before committing.**
>
> ### Step 4 — First spec
>
> Run `/speckit.specify` for the feature **"Part I walking skeleton"**.
>
> *Goal.* One human can play from the first night to gate 7 of Part I in the
> Player, against real canon, and one scripted bot can do the same headlessly.
>
> *In scope.*
> - `canon`: schemas and loader for characters, locations with levels and space
>   graph, gates, scenes, secrets, witnesses, beliefs, meta. Import of the Part I
>   entities listed in prototype-design §10. Validator with referential integrity,
>   the age rule, the dual-trigger rule and the hooks-back rule.
> - `engine`: fold, seeded RNG, calendar with fixed events, gate triggers,
>   eligibility, effects, phase-dependent flirt failure, one audio drop end to end
>   (secret s01) with quality from the space graph, recipient-based use
>   classification, witness propagation for Blanche and Noor, the theory question.
> - API: the Player endpoints and the three Console read endpoints for runs.
> - `player`: phone frame, evening loop, scene reader, choices, capture sheet,
>   Vault, Messages, Calendar timeline with rewind inside the current and previous
>   evening.
> - `renderer`: stub only. Show the beat text. At least two gate scenes are
>   hand-written Markdown so that both paths exist.
> - `rehearsal`: the drifter bot, run in CI.
> - Tests for chains 1, 2, 3, 5 and 7. Chain 4 for one witness.
>
> *Out of scope for this spec.* Console editing, proposals, real rendering, LLM
> personas, reports, the dinner at Villa Varnay, sandbox branches and commit.
>
> *This spec must exercise, not defer:* determinism, the hidden-state split, the
> space graph driving a capture, dual-trigger gates, and hand-written text as a
> peer of generated text.
>
> Then run `/clarify`. Carry only the four open items from **Decisions resolved**
> as `[NEEDS CLARIFICATION]`. Everything else is settled.
>
> Propose the order of the following specs, with a one-line goal each. Expected:
> (2) authoring with proposals, (3) secrets and witnesses complete for the slice,
> (4) timeline, sandbox and Part flowchart, (5) renderer with pinning and budgets,
> (6) rehearsal with all bots, reports and findings, (7) the dinner and the slice
> finale, (8) LLM personas, (9) hosted playtest build with telemetry.
>
> **Wait for approval before running `/plan`.**
>
> ### Step 5 — Confirm, clean up, open threads
>
> 1. Run `/analyze` and `/verify-boundaries`. Fix or list every finding.
> 2. Summarise in ten lines what was personalised and what remains open.
> 3. Open one issue per thread below, using `/taskstoissues` where it fits:
>    - Bible import: contradiction log and resolution with the author.
>    - Renames for `char.cedric` and `char.julian`, and cast tiering.
>    - Style guide for Elena's narrating voice, needed before slice scenes.
>    - Identity of "the Client".
>    - Visual tokens for DESIGN.md.
>    - Playtest: recruitment channels, consent text, exit survey with a
>      price-sensitivity block, EU hosting.
>    - Legal review: depiction of covert recording, adult themes and age rating
>      by platform.
>    - Later production: 2D floor plans for the six slice locations, then a 3D
>      greybox as a consistency reference for stills and video.
> 4. Delete `BOOTSTRAP.md`.
>
> **Wait for approval before committing.**
