# Learning: writer follow-through belongs on every effect list

- **Date:** 2026-09-20
- **Author:** learnings-writer
- **Scope:** `area:engine`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-20
- **Supersedes:** N/A

## Trigger

A new beat needs an incident or a follow-up scene. The rain already started
from a choice effect, but sending a secret only wrote `secret.sent` and left
the player on the prior scene.

## Lesson

`start_incident`, `enter`, and `bank` are writer drop-ins. They must run from
one shared `followThrough` on both `choose` and `send_secret`. Optional
`after_choice` on an incident is a backup when the choice has no
`start_incident`. Do not add a new TypeScript branch per beat. Only one
incident may be open; if `start_incident` is present it wins over `enter`.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/spice-follow-up.test.ts --reporter=dot`
  — after `send_secret` to `char.tilde`, view is `scene.conduct-demand` with
  `reveal-other` / `film-another`; `flag.demand.reveal-other` then sets.
- **Review/audit:** `docs/reviews/2026-09-20-F-03.md` — deliverable 7 Complete.
- **Smoke/log/screenshot:** live run `96116f9b-e27d-4476-9174-01a2ff4171d5`
  showed rain after leave-street, then demand after Tilde send.

## Promotion candidate

- [ ] lint rule
- [ ] `scripts/smoke.sh` grep invariant
- [ ] constitution / boundary rule
- [x] checklist item — already in `docs/reference/prototype-design.md` §2.9
  writer drop-in. A later contract can assert every `enter` / `start_incident`
  in YAML is reachable from `followThrough` (validator already checks refs).
