# Learning: proposal preview must be routed before /:id

- **Date:** 2026-09-20
- **Author:** learnings-writer
- **Scope:** `area:authoring`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-20
- **Supersedes:** N/A

## Trigger

A Console route is added under `/v1/console/proposals/preview`. The existing
`/:id` matcher treats `preview` as a proposal id and returns 404 or the
wrong record.

## Lesson

Handle `POST /v1/console/proposals/preview` before the
`/proposals/:id/(approve|reject)` matcher. Preview must not write a file
and must not call `addProposal`. Contract: after preview, the file bytes
match `before` and `GET /v1/console/proposals` is still empty.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/entity-editor.test.ts --reporter=dot`
  — preview `stored: false`; file unchanged; list empty until POST create.
- **Review/audit:** `docs/reviews/2026-09-20-F-05.md`.

## Promotion candidate

- [ ] checklist item — any new `/v1/console/proposals/<word>` route is
  registered above the id matcher.
