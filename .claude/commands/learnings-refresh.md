---
description: Periodically prune the learnings store so it stays high-signal — keep, update, replace, or archive each entry.
---

# Learnings Refresh

A learnings store rots like code does. Without periodic pruning, stale notes
accumulate, contradict each other, and drown the high-signal ones — and the
`@learnings-researcher` starts returning noise the planner ignores. This
command runs the upkeep pass.

Pair it with the quarterly agent-configuration review (see `MANUAL.md`): that
review *promotes* recurring learnings into rules/skills/hooks; this command
*curates* the raw store.

## User Input

```text
$ARGUMENTS
```

(Optional: a scope filter, e.g. an area name or a date range. Empty = review
the whole store.)

## Protocol

Read-only until you propose a verdict per entry.

1. List `docs/learnings/` (oldest first). For each entry, read its trigger,
   lesson, and **evidence** reference.
2. Re-check the evidence: does the cited commit/test/review still exist and
   still support the lesson? Use `git log` / run the test if cheap.
3. Assign one verdict per entry:
   - **keep** — still true, still cited, still useful.
   - **update** — true but the wording/scope drifted; sharpen it.
   - **promote** — re-confirmed enough to graduate: `quarantined → active` after
     ~3 confirmations (`Uses` ≥ 3), and a durable `global`-scope learning to
     `confidence: established`. Bump `Uses` / refresh `Last confirmed` whenever a
     new loop re-confirmed the lesson (cite the new artifact).
   - **decay** — still true but long unconfirmed: lower its salience so
     `@learnings-researcher` surfaces it less. Decay never deletes evidence; it
     only down-weights. A `quarantined` learning that never reached `Uses` ≥ 1
     after a long gap is a decay→archive candidate.
   - **replace** — superseded by a newer learning; mark the old `superseded`
     and link the replacement.
   - **archive** — no longer relevant (the code/area is gone, or it became an
     automated gate). Move to `docs/learnings/archive/` with a one-line reason.
4. Flag **promotion-to-gate candidates**: any learning recurring across several
   entries or reviews that should become a lint rule, a `scripts/smoke.sh`
   grep invariant, a constitution rule, or a checklist item.
   (Distinct from the `promote` *status* verdict above: this is promoting a
   learning out of the store and into a deterministic gate.)
5. Present the verdict table (include `Uses`, `Confidence`, `Last confirmed`
   per entry). **Wait for approval before editing or moving any file.**

## After approval

- Apply the keep/update/replace/archive actions.
- For each promotion candidate the user accepts, open a small plan in
  `docs/plans/` (or note it in the active one) so the rule actually gets built;
  a promotion is not done until the gate exists.
- Append a one-line note to `claude-progress.md` recording the refresh.

## Cadence

Run monthly, or whenever `@learnings-researcher` results start feeling noisy.

## Guardrails

- Never silently delete a learning; archive with a reason so the trail
  survives.
- Do not weaken a learning's evidence requirement to keep it alive — a learning
  whose evidence no longer holds is `archive`, not `keep`.
- Promotion and decay are **advisory** (they change `@learnings-researcher`
  salience), never a deterministic gate. Do not bump `Uses` without a cited
  re-confirmation — an inflated counter is the same self-grading failure the
  evidence rule exists to prevent.
