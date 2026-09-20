# Spec: Part I walking skeleton and tester desk

**Feature:** F-01
**Status:** specified
**Date:** 2026-09-20

## Goal

One human can play from the first night to gate 7 of Part I in the Player,
against real canon, and one scripted bot can do the same headlessly. Testers
can flag any scene, location or character. Authors can inspect a run and
attach an inspirational still or storyboard with a saved, editable prompt.

## Actors

- **Playtester** — plays in the Player phone frame. Not technical.
- **Author** — uses the Console. Technically fluent. Works locally.
- **Drifter bot** — scripted Player-API client. Makes no progress.

## In scope

### Canon

Schemas and loader for characters, locations with levels and space graph,
gates, scenes, secrets, witnesses, beliefs, meta. Import of the Part I
entities listed in prototype-design §10. Validator with referential
integrity, the age rule, the dual-trigger rule and the hooks-back rule.

### Engine

Fold, seeded RNG, calendar with fixed events (rent on the 1st, Sunday call),
gate triggers, eligibility, effects, phase-dependent flirt failure, one
audio drop end to end (secret s01) with quality from the space graph,
recipient-based use classification, witness propagation for Blanche and
Noor, the theory question.

### API

Player endpoints and Console read endpoints for runs. Findings create/list.
Storyboards create/list/update (prompt edit appends history). Bind loopback.

### Player

Phone frame. Evening loop. Scene reader. Choices. Capture sheet. Vault.
Messages. Calendar timeline with rewind inside the current and previous
evening. Flag sheet.

### Console

Entity list (search). Run inspector (events + full hidden state). Findings
queue. Storyboard board per entity (image upload or URL, prompt, history).
Location schematic from the space graph. Timing / knowledge strip: evening
index, open question, what Elena can currently know.

### Renderer

Stub. Show the beat text, or the hand-written Markdown file when present.
At least two gate scenes are hand-written.

### Rehearsal

The drifter bot, run in CI / smoke.

### Tests

Chains 1, 2, 3, 5 and 7. Chain 4 for one witness (Blanche). Safety age
rule. Hidden-state contract. Findings write against the right entity.

## Out of scope

Console entity editing and proposals. Real renderer / remote models. LLM
personas. Full rehearsal report suite. The dinner at Villa Varnay. Sandbox
branches and commit. Hosted playtest / telemetry. Art in the Player.

## This spec must exercise, not defer

Determinism. The hidden-state split. The space graph driving a capture.
Dual-trigger gates. Hand-written text as a peer of generated (beat) text.
Tester flags landing on a canon entity. Storyboard prompts surviving edit.

## Open items carried as [NEEDS CLARIFICATION]

- Identity of "the Client".
- Display names for `char.cedric` and `char.julian` (IDs stay).
- Elena's narrating voice style guide.
- Final DESIGN.md visual tokens (provisional tokens from the map SVG).

## User stories

1. As a playtester I open the Player, start a run, and play evenings until
   Dalia takes Elena's pulse. I can rewind the current or previous evening.
2. As a playtester I drop an audio capture in the lobby, mark a clip, and
   send it to a recipient. The vault shows a secret, not a use label.
3. As a playtester I flag a scene as "needs detailing — romance level 2"
   and write why.
4. As an author I open that run in the Console and see meters the Player
   never showed. I attach a still to `gate.p1.g2` with a prompt I can edit.
5. As CI I run the drifter and every Part I gate fires by date.

## Following specs (order)

2. Authoring with proposals — every canon change is a diff with validation.
3. Secrets and witnesses complete for the slice.
4. Timeline, sandbox and Part flowchart.
5. Renderer with pinning and budgets.
6. Rehearsal with all bots, reports and findings.
7. The dinner and the slice finale.
8. LLM personas.
9. Hosted playtest build with telemetry.
