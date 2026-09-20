# Learning: <one-line title>

- **Date:** YYYY-MM-DD
- **Author:** <name or agent, e.g. "learnings-writer">
- **Scope:** `area:<module>` | `global`
- **Status:** quarantined | active | superseded | archived
- **Confidence:** unconfirmed | confirmed | established
- **Uses:** 0
- **Last confirmed:** YYYY-MM-DD
- **Supersedes:** <link to an earlier learning, or N/A>

> **Lifecycle (borrowed from gstack `/learn`, adapted to be evidence-first).**
> A learning starts `quarantined` (`confidence: unconfirmed`). Each time a later
> loop *re-confirms* it (the trigger recurred and the lesson held — cite the new
> artifact), bump `Uses` and refresh `Last confirmed`. After ~3 confirmations it
> graduates to `active` / `confidence: confirmed`; a `global`-scope learning that
> keeps proving out becomes `established`. `/learnings-refresh` **decays** the
> salience of learnings that go long unconfirmed and `archive`s the truly stale.
> Promotion/decay is **advisory** — it changes how loudly `@learnings-researcher`
> surfaces a learning, never a deterministic gate, and it **never** deletes cited
> evidence. Fields are optional/back-compatible: an entry without them is treated
> as `uses: 0`, `confidence: unconfirmed`.

## Trigger

The situation a future agent will recognise — phrase it as the symptom or the
moment, not the solution. One or two sentences.

> Example: "When adding a new provider adapter, the DTO mapping silently drops
> fields the domain model doesn't yet know about."

## Lesson

What to do or avoid. Be specific — name the concrete failure and the concrete
fix. "Be careful with X" is not a learning; "X fails when Y because Z; do W
instead" is.

## Evidence (required)

A learning without a backing artifact is a hunch. Cite at least one:

- **Commit:** `<sha>` — <what it changed>
- **Test:** `<command>` — failed before, passes after (paste the one-line result)
- **Review/audit:** `docs/reviews/YYYY-MM-DD-<topic>.md` — <finding>
- **Smoke/log/screenshot:** `<ref>`

## Promotion candidate

*(Optional — delete if not applicable.)*

Could this become an automated gate so it can never recur?

- [ ] lint rule
- [ ] `scripts/smoke.sh` grep invariant
- [ ] constitution / boundary rule
- [ ] checklist item

If yes, name the gate and link the plan that will build it.
