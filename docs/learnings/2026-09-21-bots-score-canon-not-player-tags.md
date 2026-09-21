# Learning: rehearsal bots score canon ids, not Player tags

- **Date:** 2026-09-21
- **Author:** learnings-writer
- **Scope:** `area:rehearsal`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-21
- **Supersedes:** N/A

## Trigger

Romantic / detective / saint need tags, `bank` effects, and secret `uses`.
Those fields must not appear on the Player view.

## Lesson

Keep Player allowlisted. A bot still only *calls* Player `act`. The
rehearsal package looks up the same ids in loaded canon to score a pick.
Do not import `@contrejour/engine` from rehearsal; `classifyUse` stays in
engine. Saint refuses a tell recipient that is also on `uses.leverage.to`.

## Evidence (required)

- **Test:** `pnpm exec vitest run packages/rehearsal --reporter=dot` —
  `policies.test.ts` proves four distinct picks on a fake canon.
- **Review/audit:** `docs/reviews/2026-09-21-F-08.md`.

## Promotion candidate

- [ ] checklist item — Player JSON still has no `tags` key.
