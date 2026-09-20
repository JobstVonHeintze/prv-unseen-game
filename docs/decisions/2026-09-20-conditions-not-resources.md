# Decision: felt conditions, not a resource HUD or a third hidden meter

- **Date:** 2026-09-20
- **Status:** accepted
- **Author:** agent
- **Plan(s):** `docs/plans/2026-09-20-incidents-and-conditions.md`
- **Supersedes:** N/A

## Context

The first night needs rain that starts only after Elena is flirted through
and leaves in embarrassment; time under that rain changes how wet she is;
wetness then gates whether she can walk home or must ask for help, which
opens the gallery upstairs and later leverage (watched / recorded while
changing). The owner asked for a trackable "resource management" system
from the beginning. The bible already has two hidden meters (visibility,
the Céleste meter) and forbids inventing RPG synonyms.

## Options considered

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | Call them resources / inventory / stats | Matches the request wording | Player HUD; game-jargon the constitution forbids |
| B | Fold wetness into `meter.celeste` / `meter.visibility` | No new primitive | Those meters are hidden moral/access scores; wet silk is something Elena feels |
| C | `condition.<slug>` with named levels + `incident.<slug>` with discrete pressure | Console can list a short table; Player gets a felt line only; authors write levels not numbers | New entity types to load and validate |

## Decision

We chose **Option C**. Conditions are bodily or material states Elena can
notice (`condition.wetness`: dry → damp → wet → soaked). Incidents are
action-triggered locks (`incident.rain-street`) that spend **pressure**
(failed cover, waiting), not wall-clock time. The two hidden meters stay
exactly two. The Player never shows a bar, a count, or a condition id —
only a line she would perceive. The Console shows a conditions table
(id, level, last change, what it currently gates) so authors can track
it without opening the event log.

The trade-off: authors learn one new pair of words. We refuse a general
inventory.

## Constraints introduced

- Domain words are **condition** and **incident**. Do not write resource,
  inventory, stat, HP, or stamina in Player, canon, or specs.
- Condition ids are `condition.<slug>`. Levels are an ordered list of
  slugs; effects step the index or set a named level.
- Incident ids are `incident.<slug>`. Time inside an incident is integer
  **pressure**. The engine still has no clock and no randomness except
  the seeded generator.
- Player view may add `felt: string[]` (prose). It must not contain
  `condition.`, `incident.`, or `meters`.
- Invalid incident choices stay inside the incident. Only a valid exit
  resolves it.
- `advance_evening` and free roam are locked while an incident is open.

## Reversibility

Two-way with effort. Adding a third hidden meter later is easy; removing
a Player HUD after testers learn it is not. Keep conditions felt.
