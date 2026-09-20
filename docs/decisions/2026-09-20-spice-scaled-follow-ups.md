# Decision: spice scales depiction of follow-ups, not consequences

- **Date:** 2026-09-20
- **Status:** accepted
- **Author:** agent
- **Plan(s):** `docs/plans/2026-09-20-incidents-and-conditions.md`
- **Supersedes:** N/A

## Context

Incident follow-ups (Viktor at the changing-room door) and later leverage
(a taken recording of someone else's conduct) need to respect the Player's
spice level. The owner asked for this to be general: any character's
behaviour can become a taken secret and be used. The bible already forbids
the renderer from writing level 3, forces `currency-down` to level 1, and
says state is identical at every spice setting.

## Options considered

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | Separate scene trees per spice | Easy to write | Flags and leverage diverge; untestable |
| B | Spice as a third hidden meter | Trackable | Invents a stat; Player HUD |
| C | `spice` text maps on scenes and secrets; same flags and uses | Matches §2.8; one leverage path per character | Authors write three lines |

## Decision

We chose **Option C**. `meta.spice_level` (overridable on the run) selects
which line of a `spice: {l1,l2,l3}` map the Player sees. Flags, meters,
vault membership, `classifyUse`, and recipient lists do not change.
Level 3 is hand-written or a `[LEVEL 3 PLACEHOLDER]` slot; the Player
falls back to l2 when the slot is still a placeholder. `currency-down`
and any `coercion` tag lock depiction to l1.

Conduct becomes consequence through the existing secret grammar: `about`
the character, `origin: taken` if Elena filmed them, `proof: recording`,
`uses.leverage` / `tell` / `expose`. We do not add a "compromat" type.
Two different demands on the same person (tell the other lover vs film
someone else) are a later follow-up scene, not two uses on one send —
the player still picks a recipient, not a use.

## Constraints introduced

- Spice never writes `flag.`, `meter.`, or `spine.` by itself.
- Intimate scenes still require `consent: negotiated`. A watcher who was
  not invited is a recording / witness, not an intimate scene.
- L3 Player text is hand-only. Placeholder strings are Console-visible.
- Tilde's VIP evening is a fixture + later playable scene, not a second
  Part I gate.

## Reversibility

Two-way. Adding a fourth spice level would be a spec change. Splitting
state by spice would not.
