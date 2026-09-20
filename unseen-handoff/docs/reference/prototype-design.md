# contrejour: prototype design

Technical reference for the UNSEEN narrative simulator. Read together with
`story-bible.md` (narrative reference) and `BOOTSTRAP.md` (posture and decisions).

The bible uses prose and tables. This document says how that content becomes data,
how the data is executed, and how we find out whether it works for a player.

---

## 1. What we are building, and what we are not

**Building:** a text-only simulator of UNSEEN with three uses.

1. **Play.** A human plays Part I plus the first dinner at Villa Varnay in a browser,
   inside a frame that looks like Elena's phone.
2. **Author.** A writer edits canon (characters, scenes, gates, secrets, spaces) with
   validation and a diff preview. AI may propose. A human approves.
3. **Rehearse.** Bots and LLM personas play hundreds of runs headlessly. The output is
   evidence about structure: what is reachable, when beliefs flip, how endings distribute.

**Not building:** art, audio, video, 3D, a game engine integration, accounts, payments,
a mobile app. Presentation is deliberately out of scope until the structure is proven.

---

## 2. Canon data model

Canon lives as YAML files in `canon/`, one entity per file, grouped by type. IDs are
stable and never derived from display names, because several characters are due to be
renamed.

```
canon/
  meta.yaml                 # version, phases, parts, calendar rules, spice level
  characters/char.<slug>.yaml
  locations/loc.<slug>.yaml  # includes levels and the space graph
  gates/gate.p<part>.g<n>.yaml
  scenes/scene.<slug>.yaml   # storylets: evenings, dates, shifts, conversations
  secrets/secret.s<nn>.yaml
  witnesses/witness.<slug>.yaml
  decisions/spine.d<nn>.yaml
  endings/ending.<slug>.yaml
  beliefs/belief.b<n>.yaml   # the reveal ladder
  text/<scene-id>.md|.ink    # hand-written scene text, optional per scene
```

### 2.1 ID conventions

| Entity | Pattern | Example |
| --- | --- | --- |
| Character | `char.<slug>` | `char.celeste` |
| Location, level | `loc.<slug>`, `loc.<slug>.l<1-4>` | `loc.ascend.l4` |
| Space node | `node.<loc>.<slug>` | `node.ascend.cleaning-cupboard-7m` |
| Gate | `gate.p<part>.g<n>` | `gate.p1.g7` |
| Scene | `scene.<slug>` | `scene.cedric-lunch` |
| Secret | `secret.s<nn>` | `secret.s22` |
| Spine decision | `spine.d<nn>` | `spine.d05` |
| Belief | `belief.b<n>` | `belief.b2` |
| Flag, meter | `flag.<slug>`, `meter.<slug>` | `meter.celeste`, `meter.visibility` |

### 2.2 Character

```yaml
id: char.cedric
display_name: Cédric Oury        # display only, safe to rename
age: 38                          # required; validation depends on it
tier: core                       # core | recurring | day-player
home: loc.passage-des-meuniers
liminal: true                    # can see Elena under the ghost reading
romance:
  available: true
  flirt_from: 0
  date_from: 0
  intimate_from: 3
  intimate_requires: [flag.cedric-makeover]
  affected: [char.blanche, char.tomasz]
seen_flag: flag.seen.cedric      # "seen or used" per character
knows: [secret.s16]
refuses: false
```

Validation rule, enforced at build: any character with `romance.available: true`
must have `age >= 18`. Characters under 18 must have `romance.available: false` and
may not appear in any scene tagged `romance`.

### 2.3 Scene (storylet)

A scene is the unit of play between gates. It has preconditions, a body, choices
and effects. Nothing is a branch in a tree. Everything is drawn from a pool by
eligibility.

```yaml
id: scene.cedric-lunch
part: 1
slot: evening                    # evening | morning | any | gate-internal
location: loc.passage-des-meuniers.l3
cast: [char.elena, char.cedric, char.blanche]
tags: [romance, rent, spine]
requires:
  phase_min: 0
  all: [flag.rent-overdue]
  none: [flag.cedric-rejected-hard]
beat: >
  Blanche has engineered a lunch. Cédric has ironed his shirt twice. Elena owes
  six weeks of rent. What she lets him believe is up to the player.
text: text/scene.cedric-lunch.md   # optional; renderer is used if absent
choices:
  - id: kind-and-clear
    label: Be kind. Be clear.
    effects:
      - set: flag.seen.cedric
      - add: {meter.visibility: 1}
      - set: flag.rent-grace-2w
  - id: let-him-believe
    label: Let him believe what he wants to believe.
    effects:
      - set: flag.used.cedric
      - add: {meter.celeste: 2}
      - set: flag.rent-free
      - spine: spine.d01=dark
witnesses: [witness.blanche, witness.tomasz]
hooks_back: [secret.s16]          # every side strand must bend back to the spine
```

Validation rule: every scene tagged as a side strand must declare at least one
`hooks_back` entry (a clue, a door or an enemy).

### 2.4 Gate

```yaml
id: gate.p1.g7
name: The pulse
part: 1
order: 7
trigger:
  progress: {all: [flag.found-green-dress, flag.mother-no-answer]}
  date: {day: 24}                # whichever comes first
scene: scene.dalia-pulse
asks_theory_question: true
breaks_beliefs: [belief.b1, belief.b2]
opens_phase: null
```

Every gate has two triggers. A run that makes no progress at all must still reach
every gate by date. This is a tested property, not a guideline.

### 2.5 Secret

```yaml
id: secret.s08
about: [char.laurent, char.celeste]
origin: taken                    # taken | given
summary: "Nobody has seen her. Keep it that way until the opening."
capture:
  mode: audio-drop               # audio-drop | hidden-video | found | told
  node: node.ascend.lift
  phase_min: 3
proof: recording                 # rumour | testimony | recording | document
uses:
  keep: {effects: []}
  tell:
    to: [char.noor, char.isolde]
    effects: [{set: flag.consented-as-bait-available}]
  expose: {channels: [char.ji-woo]}
  leverage:
    to: [char.laurent]
    effects: [{add: {meter.celeste: 3}}, {set: flag.gold-key}, {spine: spine.d07=dark}]
is_canary: false
```

The player never picks a use from a menu. The player picks a **recipient**. The
engine classifies the use from the recipient and the secret's `about` field.

Hard rule: using a secret with `origin: given` as leverage applies the heaviest
meter penalty in the game and clears the "still sees people" ending gate.

### 2.6 Witness network

```yaml
id: witness.blanche
character: char.blanche
observes:
  nodes: [node.passage.stairwell, node.passage.front-door]
  kinds: [arrival, departure, visitor, car]
tells:
  - to: witness.house          # a group node
    delay_evenings: 1
    probability: 1.0
  - to: witness.cedric
    delay_evenings: 0
    probability: 1.0
```

An action only has social consequences if a witness observed it. Observations
propagate along `tells` edges with a delay, using the seeded RNG. Consequences are
declared on the receiving character or group (for example, a seat at the brunch
table empties when `witness.bernadette` receives an observation tagged
`lied-to-defenceless`).

### 2.7 Beliefs (the reveal ladder)

```yaml
id: belief.b1
statement: She is dead and does not know it.
part: 1
fed_by: [scene.*:tag=flirt-fail, flag.zero-views, flag.mother-no-answer]
broken_by: [gate.p1.g7]
```

Beliefs are not engine state that gates anything. They are an analytic overlay.
The theory question records what the player says they believe. Rehearsal reports
compare that with what the design intended at that point.

### 2.8 Intimate scenes and spice levels

Intimate scenes are ordinary scenes tagged `intimate` with five fixed beats
(charge, threshold, scene, afterwards, morning). Only the third beat varies by
spice level, so state, clues and secrets are identical at every setting.

```yaml
id: scene.viktor-first-night
tags: [intimate, romance]
cast: [char.elena, char.viktor]
intimate:
  dynamic: elena-follows        # elena-leads | equals | elena-follows
  mode: play                    # play | currency-up | currency-down
  consent: negotiated           # required on every intimate scene
  beats:
    charge:     {text: text/scene.viktor-first-night.charge.md}
    threshold:  {text: text/scene.viktor-first-night.threshold.md}
    scene:
      l1: cut                   # fade to black, no text
      l2: {text: text/scene.viktor-first-night.l2.md}
      l3: {text: text/scene.viktor-first-night.l3.md, source: hand-only}
    afterwards: {text: text/scene.viktor-first-night.after.md,
                 gives: [secret.s13]}
    morning:    {witnesses: [witness.marga]}
  stop_response: text/char.viktor.stop.md
```

Rules enforced by the validator and the engine:

- `meta.spice_level` is 1, 2 or 3. Default 2. The Player may change it at any time.
- Every participant in an `intimate` scene is an adult, and `consent: negotiated`
  is present. Otherwise the build fails.
- `mode: currency-down` forces `l1` at every spice level.
- Scenes flagged `coercion` may never carry the `intimate` tag. They are told as
  harm and are never rendered above `l1`.
- The `afterwards` beat is mandatory and must declare `gives`, `hooks_back` or both.
- A "stop" action is available throughout the `scene` beat at every level and
  always resolves to the character's `stop_response`.
- "Skip to afterwards" is always available and loses no state.
- **The renderer may produce `l1` and `l2` text only.** An `l3` slot is
  `source: hand-only`. If no hand-written file exists, the Player falls back to
  `l2` and the Console lists the slot as an open placeholder with the brief from
  the bible's *Heat profiles by route*.
- Secrets spoken in `afterwards` have `origin: given`. Starting a capture during
  an intimate scene converts what is heard to `origin: taken` and is recorded as
  its own event, because the moral system treats it differently.

---

## 3. Spaces: a graph now, plans next, 3D later

Eavesdropping, hiding, recording quality, cameras and the phone drawer all depend
on space being consistent. That consistency is needed from the first text test.
Geometry is not.

### 3.1 The space graph

Each location carries a small graph.

```yaml
id: loc.ascend
levels:
  l1: {name: Lobby and archive, phase: 0, work_phase: 0}
  l2: {name: Media floors, phase: 3}
  l3: {name: The Farm and executive floor, phase: 3, work_phase: 2}
  l4: {name: Floor 7M, phase: 4, work_phase: 3, price: signature}
nodes:
  - id: node.ascend.lobby
    level: l1
    cameras: [witness.noor]
  - id: node.ascend.cellar-stairs
    level: l1
    facts: [one handrail, light fades halfway, one replaced step]
  - id: node.ascend.archive
    level: l1
    hiding: [{spot: rolling-shelves, cover: high, checked_by: []}]
  - id: node.ascend.lift
    level: l1
    confined: true
  - id: node.ascend.floor-7m
    level: l4
    phone_drawer: true            # phones collected at the door
  - id: node.ascend.cleaning-cupboard-7m
    level: l4
    hiding: [{spot: cupboard, cover: medium, checked_by: [char.loic]}]
edges:
  - {from: node.ascend.lobby, to: node.ascend.cellar-stairs, kind: door,
     lockable_from: node.ascend.lobby}          # this matters to the plot
  - {from: node.ascend.cellar-stairs, to: node.ascend.archive, kind: walk}
  - {from: node.ascend.lift, to: node.ascend.floor-7m, kind: lift, requires: flag.gold-key}
sightlines:
  - {from: node.ascend.cleaning-cupboard-7m, to: node.ascend.floor-7m, quality: partial}
earshot:
  - {from: node.ascend.cleaning-cupboard-7m, to: node.ascend.floor-7m, quality: good}
  - {from: node.ascend.archive, to: node.ascend.cellar-stairs, quality: good}
```

### 3.2 Recording quality

```
quality = base(mode)
        × earshot_or_sightline(from_node, to_node)
        × placement(tote-on-lap | under-table | left-on-desk | hidden)
        × noise(node)
```

- `quality >= 0.7` yields the secret at its declared proof level.
- `0.3 <= quality < 0.7` yields fragments, proof capped at `rumour`.
- `quality < 0.3` yields nothing usable.

Risks are rolled with the seeded RNG per capture: an incoming call (the Sunday call
is on the calendar, so it is predictable and avoidable), a lit notification, a dead
battery, discovery by whoever is listed in `checked_by`. Detection probability rises
with `meter.visibility`, which is why secrets are banked early and spent late.

### 3.3 Canonical spatial facts

Each node may list `facts`: short statements that every later medium must respect
("the archive lies under the lobby", "the stair door locks from the lobby side",
"from Elena's skylight the top of the Ascend building is visible"). The build emits
`out/spatial-facts.md` as a checklist for writers, storyboard artists and, later,
whoever builds sets or 3D.

### 3.4 Staged plan for maps

| Stage | Artefact | Purpose |
| --- | --- | --- |
| 0, text simulator | Space graph in canon. Auto-generated schematic SVG per location (nodes, edges, sightlines). | Consistency, eavesdropping rules, the in-game Maps app. |
| 1, animatic | Hand-corrected 2D floor plans for the slice's six locations. | Storyboards, blocking, playtest clarity. |
| 2, polished slice | 3D greybox (Blender) for the same six locations, built from the plans. | Camera blocking, and depth or line renders as control images so generated stills and video keep consistent geometry from shot to shot. |
| 3, production | Sets, locations or full environments, depending on the medium chosen. | Out of scope here. |

The game is an interactive film, not a real-time 3D world. 3D is a production tool
for consistency, not a gameplay layer. The space graph is the contract that every
later stage must satisfy.

---

## 4. Engine

### 4.1 State and determinism

- State is the fold of an **append-only event log**. There is no mutable save file.
- All randomness comes from a **seeded RNG** whose seed is stored in the run header.
- `state(n) = fold(events[0..n])`. Replaying a log yields an identical state, always.
  This is a tested property.

```
RunHeader   {run_id, canon_version, seed, mode, persona?}
Event       {n, t: evening_index, kind, payload}
kinds:      run.started | evening.started | scene.entered | choice.made
            | capture.started | capture.resolved | clip.marked | secret.sent
            | witness.observed | witness.told | gate.fired | phase.opened
            | theory.answered | rewind.branched | run.ended
```

### 4.2 The loop

```
for each evening:
  1. advance calendar; fire fixed events (rent on the 1st, Sunday call, Thursday soup)
  2. deliver due witness messages; apply their consequences
  3. check gates: progress trigger or date trigger -> run gate scene, then continue
  4. compute eligible scenes (requires / phase / access / location level)
  5. player picks a location, then a scene, then choices
  6. apply effects; record witnesses present; update meters and flags
  7. offer phone actions: review captures, mark clips, send
```

### 4.3 Hidden state

`meter.celeste`, `meter.visibility`, seen/used flags, witness queues and ending-gate
counters are **never** sent to the Player surface. The Player API returns only what
Elena could perceive. The Console API returns everything. This split is enforced by
two separate response schemas and a contract test, not by front-end discipline.

### 4.4 Endings

Ending gates are evaluated from state exactly as the bible's "Ending gates" table
describes: documents, willing witnesses, a believed channel, seats at the table,
no leveraged given secret, spine decision 5. The engine exposes
`GET /console/runs/{id}/ending-forecast` so authors can see which ending a run is
heading for. The Player never can.

---

## 5. Timeline, rewind and replay

Undo is part of the design, and it must not dissolve consequence. The approach
follows the convention of interactive films that pair a chapter timeline with a
flowchart revealed after the fact.

| Mechanism | Rule |
| --- | --- |
| **Evening checkpoints** | Every evening start is a checkpoint, free of charge thanks to the event log. |
| **Rewind within the current evening** | Always allowed, in every mode. Mis-taps should never cost anything. |
| **Timeline** | The phone's calendar app shows past evenings and gates. It shows *that* something happened, never the hidden numbers. |
| **What-if (sandbox)** | Rewind to any past evening and play forward without touching the canonical run. The branch is a new log that references its parent. Nothing in a sandbox counts for endings or telemetry marked canonical. |
| **Commit** | The player may promote a sandbox branch to canonical. The old line is kept as a ghost branch. |
| **First-run default ("Honest")** | Until a Part is finished, rewind is limited to the current evening and the previous one. After finishing a Part, the full timeline for that Part unlocks. |
| **Explorer mode** | Full timeline from the start. Chosen at run creation. Shown honestly as the mode for people who want to poke at the machine. |
| **After each Part** | A flowchart of that Part: taken paths lit, untaken paths as silhouettes, locked content named only by location. |

Why consequence survives: most consequences in UNSEEN arrive late (a witness
message takes evenings to travel, Caio's session surfaces weeks later, a canary
resurfaces a Part later). A player who rewinds one evening cannot see what a choice
will cost, so rewinding does not turn the game into trial and error. The design
rule for authors: **no important consequence may land in the same evening as the
choice that caused it.** The validator warns when one does.

There are no fail states that force a replay. The story fails forward.

---

## 6. Authoring (Console)

- Canon is files in git. The Console edits those files through the API.
- Every change, human or AI, is a **proposal**: a diff against canon with a
  validation report. Nothing is written without explicit approval.
- A rejected AI proposal stores the reason. Reasons are fed back as context for
  later proposals on the same entity type.
- Validation on every proposal: schema, referential integrity, age rule,
  `hooks_back` rule, dual-trigger rule for gates, same-evening-consequence warning,
  reachability of every scene by at least one scripted bot.
- Minimum Console views for the first spec: entity list with search, entity editor
  with diff preview, validation panel, run inspector (event log with full hidden
  state), rehearsal report viewer.

---

## 7. Renderer (AI scene text)

A scene with no file under `canon/text/` is rendered from its `beat`.

- Input context: the beat, cast entries, location facts, current visible state,
  the last few scenes' text for continuity, and the house style guide.
- Output: prose plus the declared choices. The renderer may not add, remove or
  reword choices, and may not change effects.
- Every render is **cached and pinned** by a hash of (canon version, scene id,
  relevant state slice, model id, prompt version). A pinned render is reproducible
  and reviewable. Rehearsal runs use pinned renders or no prose at all.
- Hand-written text always wins. Provenance (`hand` or `rendered:<hash>`) is stored
  on every scene.entered event and shown in the Console.
- Provider abstraction: a remote API or a local OpenAI-compatible endpoint, chosen
  by configuration. Model identifiers live in config, never in code.
- Budget: a per-run and per-day token ceiling in config. When the ceiling is hit,
  the renderer falls back to showing the beat text verbatim. This is enforced in
  code and covered by a test.

Known limit: rendered prose can tell us whether the machine works. It cannot tell
us whether anyone cares. The human playtest slice uses hand-written text for every
gate scene.

---

## 8. Rehearsal (synthetic playtesting)

Two kinds of player, both driving the same public Player API as a human would.

**Scripted bots** (cheap, deterministic, run in CI):

| Bot | Policy |
| --- | --- |
| drifter | Makes no progress. Picks the first eligible scene. Proves date triggers. |
| completionist | Visits every location every evening, exhausts scenes. Proves reachability. |
| romantic | Always prefers scenes tagged `romance`. Proves side strands bend back. |
| detective | Prefers captures and clue scenes. Tests the secrets economy. |
| dark-optimiser | Always picks the effect that maximises access. Tests the dark path's pacing. |
| saint | Never uses leverage, never lies. Should trigger the Caio condition. |

**LLM personas** (budgeted, run on demand): a persona description plus the visible
state. They also answer the theory question in free text, which is classified
against the beliefs.

**Report** (`out/rehearsal/<timestamp>/report.md` and JSON):

- Reachability: scenes never entered, choices never taken, secrets never captured.
- Gate timing: evening index at which each gate fired, progress vs date trigger share.
- Belief curve: share of runs holding each belief per gate. Flags where the intended
  break came too early or too late.
- Meter curves and the distribution of the twelve spine decisions.
- Ending distribution per bot and per persona.
- Dead time: evenings with fewer than two eligible scenes.
- Same-evening consequences and other validator warnings hit in play.

**Closing the loop:** each finding above a threshold becomes a proposal or an issue
against a specific canon entity ("scene.callum-night was reached in 0 of 400 runs:
requires flag.contre-jour-regular, which only one scene sets"). Rehearsal is not a
dashboard. It writes to the authoring queue.

---

## 9. API surface (v1)

All surfaces are clients of one HTTP API. The engine itself is a pure library with
no I/O.

```
Player (what Elena can perceive)
  POST /v1/runs                         {mode, seed?}            -> run
  GET  /v1/runs/{id}/view               -> evening, location options, visible phone state
  POST /v1/runs/{id}/actions            {type, payload}          -> view
  GET  /v1/runs/{id}/timeline           -> past evenings and gates, no hidden state
  POST /v1/runs/{id}/rewind             {to_evening, sandbox}    -> run (branch)
  POST /v1/runs/{id}/commit             -> promotes sandbox to canonical

Console (everything)
  GET  /v1/console/canon/{type}[/{id}]
  POST /v1/console/proposals            {diff, author: human|ai, rationale}
  POST /v1/console/proposals/{id}/approve | /reject {reason}
  GET  /v1/console/runs/{id}/state      -> full state incl. hidden meters
  GET  /v1/console/runs/{id}/events
  GET  /v1/console/runs/{id}/ending-forecast
  POST /v1/console/rehearsals           {bots, personas, n, seed_base}
  GET  /v1/console/rehearsals/{id}/report
```

Local-first: the server binds to loopback only. There is no authentication in v1
because nothing is exposed. The hosted playtest build (later) adds pseudonymous
run tokens and nothing else.

---

## 10. Vertical slice scope

**Story:** Part I complete (seven gates) plus Part II gates 1 and 2 ("The street
opens", "Thursday at eight"). The slice ends on Isolde's offer at the door.

**Cast (tier core for the slice, about fifteen):** Elena, Laurent, Céleste, Noor,
Dragan, Hubert, Bernadette, Pavel, Jonas, Freya, Ous, Viktor, Marga, Blanche,
Cédric, Dalia, the Verne twins, Tomasz, Mardi, Isolde, Cillian, Mika, Harriet.
Everyone else in the bible is imported as data but has no scenes in the slice.

**Locations:** Ascend (l1 only, plus the night cleaning shift as an early l3 taste),
Rue Valmont and LIV, Galerie Restrepo l1, Viktor's factory l1 to l2,
14 Passage des Meuniers l1 to l3, Lavomatic 24, night tram 9, Villa Varnay l1 to l2.

**Mechanics that must be live:** dual-trigger gates, evenings, flirts that fail by
phase, two audio drops and one hidden video, clip marking, sending to a recipient,
Hubert's archive exchange, the theory question, spine decision 1, the four dinner
tests including Isolde's canary, witness propagation for at least Blanche, Tomasz
and Noor, timeline with Honest and Explorer modes.

**Secrets live in the slice:** s01, s02, s17, and Isolde's canary.

**Out of the slice:** the dating matrix beyond flirt and the Cédric lunch, the
vernissage, leverage consequences beyond a first taste, endings.

**Human playtest instrumentation (opt-in, pseudonymous):** completion, time per
evening, theory-question answers with timestamps, first flirt attempt, captures
started and abandoned, rewinds used, a short exit survey including a
price-sensitivity block.

---

## 11. Test strategy

Every capability chain in `specs/constitution.md` has one end-to-end test that
drives the public API only. Unit tests cover the fold, the RNG, the validator and
the use classifier. The scripted bots run in CI on every canon change, with a fixed
seed base, and the build fails if reachability drops or a gate becomes unreachable
by date.
