# Decision: <one-line title>

- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded | abandoned
- **Author:** <name or agent>
- **Plan(s):** <link to docs/plans entries that triggered this decision, or N/A>
- **Supersedes:** <link to a previous decision this replaces, or N/A>

Use `abandoned` for a rejected-but-still-tempting option and preserve its
"why not". Use `superseded` only when this file links to the replacement.

## Context

What problem are we solving? What was the trigger? What constraints apply
(team size, deadline, infrastructure, regulatory)? Keep this short — if it
takes more than a paragraph, you may need a discovery doc first.

## Options considered

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | <option name> | ... | ... |
| B | <option name> | ... | ... |
| C | <option name> | ... | ... |

## Decision

We chose **Option <X>** because: <2–4 sentences naming the dominant
factor>. The trade-off we accepted: <what we gave up>.

## Constraints introduced

What must remain true going forward, as a consequence of this decision?
List anything that future code, tests, or agents must respect.

- ...
- ...

## Reversibility

How hard would it be to undo this decision in 6 months? (One-way door /
two-way door / two-way with effort.) If it's effectively irreversible,
the bar for accepting was higher and that should show in the *Decision*
section.

## Why this file exists

Plans (`docs/plans/`) say *what* will be built. Specs (`specs/`) say *what*
the rules are. Decisions (`docs/decisions/`) say *why* a particular trade-off
was chosen — the option-A-vs-option-B reasoning that future sessions need
to **avoid undoing accidentally**.

Adopted from
[walkinglabs harness-engineering Lecture 05](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/):
*"Record what decision, why, when. The next session sees the code but
doesn't know why it's written that way, and might 'optimize' away a
deliberate design decision."*
