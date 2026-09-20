# Learnings — contrejour

> The durable memory of the compound loop. Each file here is one
> evidence-cited lesson that a future agent reads **before** planning similar
> work, so each unit of work makes the next one easier.

## Why this directory exists

Traditional codebases get harder to change over time: every feature adds edge
cases and local knowledge someone later has to rediscover. The compound layer
inverts that. When a loop ends, `@learnings-writer` (via `/compound`) records
what was learned. When the next loop starts, `@learnings-researcher` replays
the relevant entries into planning. The codebase still grows in complexity —
but the *captured* knowledge grows with it.

This is the read/write pair that closes the loop:

```
plan  ->  work  ->  review  ->  COMPOUND        (write: /compound)
  ^                                  |
  |                                  v
  +---- learnings-researcher <--- docs/learnings/   (read: at plan time)
```

## The one hard rule: evidence, not vibes

A learning is only valid if it cites a concrete artifact — a commit SHA, a
failing-then-passing test, a finding in `docs/reviews/`, or a smoke/log/
screenshot reference. This scaffold deliberately distrusts agent self-grading
(see the boundary-gate ADR: a sibling project once self-reported "0 boundary
violations" while four existed). A lesson without evidence is a hunch; do not
record it.

## Format

One file per learning: `YYYY-MM-DD-<slug>.md`, using
`docs/templates/learning-template.md`. Append only — never overwrite. When a
learning is superseded, mark the old one `superseded` and link the replacement;
deletions and consolidation go through `/learnings-refresh`.

## Lifecycle

| Action | Who | When |
|--------|-----|------|
| Capture | `@learnings-writer` / `/compound` | At sprint close or after a tricky fix |
| Replay | `@learnings-researcher` | At plan / scope time |
| Curate (keep/update/promote/decay/replace/archive) | `/learnings-refresh` | Monthly, or when results get noisy |
| Promote to an automated gate | quarterly agent-config review | When a learning recurs |

### Confidence lifecycle (advisory)

Borrowed from gstack's `/learn`, adapted to stay evidence-first. Each learning
carries `Status`, `Confidence`, `Uses`, and `Last confirmed`:

```
quarantined ──(re-confirmed ~3x, each citing a new artifact)──> active ──(durable, global)──> established
     │                                                             │
     └────────────── long unconfirmed: /learnings-refresh decays salience, then archives ──────┘
```

- A learning starts `quarantined` / `confidence: unconfirmed`. When a later loop
  re-confirms it (the trigger recurred and the lesson held), bump `Uses` and
  refresh `Last confirmed` — **only with a fresh cited artifact**, never on a
  hunch.
- `@learnings-researcher` surfaces higher-confidence, recently-confirmed
  learnings more prominently; decayed ones fade.
- This is **advisory salience only** — it never becomes a deterministic gate and
  never deletes cited evidence. Promotion *to a gate* (the row above) remains the
  separate, highest form of compounding: a lint rule, a `scripts/smoke.sh` grep
  invariant, or a checklist item, so the next agent cannot reintroduce the issue.
