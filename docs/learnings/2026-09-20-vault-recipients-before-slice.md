# Learning: vault-named recipients must beat the Messages slice

- **Date:** 2026-09-20
- **Author:** learnings-writer
- **Scope:** `area:player`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-20
- **Supersedes:** N/A

## Trigger

A secret is banked and the Player Messages screen lists twelve names. The
person named in `uses.leverage.to` is missing, so the follow-up cannot be
sent from play.

## Lesson

`playerView.recipients` is a phone-frame cap, not an address book. Put
characters named on vaulted secrets' `tell` / `leverage` / `trade` `to`
lists first, then fill the remaining slots. A first-twelve alphabetical
slice hid `char.tilde` after `secret.s-tilde-vip` was banked. Contract
tests that only POST `send_secret` will not catch this.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/spice-follow-up.test.ts --reporter=dot`
  — after `film-tote`, `recipients` includes `char.tilde`.
- **Review/audit:** `docs/reviews/2026-09-20-F-04.md` — browser Messages
  showed Tilde Ekström; send opened `scene.conduct-demand`.
- **Smoke/log/screenshot:** Player run `6bb33d72-4c9d-4fd7-bde2-98adeec5c1b4`.

## Promotion candidate

- [ ] lint rule
- [ ] checklist item — any new send-path contract should assert the
  named recipient is in `playerView.recipients`, not only that the
  API action works.
