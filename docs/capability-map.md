# Capability map — contrejour

Persisted from bootstrap. Downstream consumers (harness, evals, council)
re-read this path.

```yaml
schema_version: 1
product: contrejour
updated: 2026-09-20
accelerators:
  - probes-content-platform
  - probes-gaming
capabilities:
  - id: simulation-engine
    family: core
    evidence: "The engine is a pure library: no I/O, no clock, no randomness except a seeded generator."
    confidence: stated
  - id: event-sourcing
    family: state
    evidence: "State is the fold of an append-only event log with a seeded RNG."
    confidence: stated
  - id: two-surface
    family: surfaces
    evidence: "Player is what a playtester sees. Console is what an author sees."
    confidence: stated
  - id: hidden-state-split
    family: trust
    evidence: "Meters, seen/used flags, witness queues and ending forecasts never reach the Player API."
    confidence: stated
  - id: authoring-desk
    family: content
    evidence: "Console: entity editor, proposals with diff, approvals, run inspector."
    confidence: stated
  - id: preview-before-write
    family: authoring
    evidence: "Every change, human or AI, is a proposal: a diff against canon with a validation report."
    confidence: stated
  - id: rehearsal-loop
    family: workflow-agents
    evidence: "Findings write to the authoring queue. A rehearsal that only produces charts is a failed feature."
    confidence: stated
  - id: space-graph
    family: domain
    evidence: "Locations carry a graph of nodes, edges, sightlines, earshot, hiding spots and canonical facts."
    confidence: stated
  - id: storyboard-refs
    family: content
    evidence: "(live:) testers add inspirational images or storyboards with prompt saving and editing"
    confidence: stated
  - id: tester-flags
    family: content
    evidence: "(live:) testers flag sections that need rewrite, missing locations, or more detailing"
    confidence: stated
  - id: safety-rails
    family: compliance
    evidence: "Any romanceable character is an adult: the build fails otherwise."
    confidence: stated
  - id: local-first
    family: privacy
    evidence: "The server binds to loopback only. No accounts, no cloud dependency for authoring or rehearsal."
    confidence: stated
open_questions:
  - identity of the Client
  - display names for char.cedric and char.julian
  - Elena narrating voice style guide
  - final DESIGN.md visual tokens
```
