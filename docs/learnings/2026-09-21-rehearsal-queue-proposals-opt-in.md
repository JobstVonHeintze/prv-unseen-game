# Learning: rehearsal proposal drafts are opt-in

- **Date:** 2026-09-21
- **Author:** learnings-writer
- **Scope:** `area:authoring`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-21
- **Supersedes:** N/A

## Trigger

A full drifter rehearsal files no missed-gate findings, but an earlier
design queued a proposal for every finding on every run.

## Lesson

`POST /v1/console/rehearsals` only writes proposal drafts when
`queue_proposals: true`. Default is findings only. The desk button
`POST /v1/console/findings/{id}/propose` is the human path. A short
rehearsal used to prove auto-queue must set the flag, or the proposals
array stays empty.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/finding-propose.test.ts --reporter=dot`
  — short run with the flag queues one draft per finding; file bytes
  unchanged.
- **Review/audit:** `docs/reviews/2026-09-21-F-07.md`.

## Promotion candidate

- [ ] checklist item — default rehearsal POST in Console stays
  `queue_proposals` off.
