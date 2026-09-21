# Learning: personas skip; never mock a successful model call

- **Date:** 2026-09-21
- **Author:** learnings-writer
- **Scope:** `area:rehearsal`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-21
- **Supersedes:** N/A

## Trigger

F-10 needed a named persona before any provider was granted.

## Lesson

`POST /v1/console/rehearsals` with `personas: ["curious"]` returns 201
and `persona_skip_reason: no-credentials` (or `driver-unshipped` if
URL and key are present). Do not invent a chat completion. Do not file
missed-gate findings from an empty persona-only skip. Model id and
budget names live in `packages/rehearsal/rehearsal.config.json`.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/personas.test.ts --reporter=dot`
- **Review/audit:** `docs/reviews/2026-09-21-F-10.md`.

## Promotion candidate

- [ ] checklist item — persona-only POST files zero findings.
