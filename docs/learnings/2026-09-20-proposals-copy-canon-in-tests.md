# Learning: proposal approve tests must copy canon

- **Date:** 2026-09-20
- **Author:** learnings-writer
- **Scope:** `area:authoring`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-20
- **Supersedes:** N/A

## Trigger

A contract test approves a proposal that writes YAML. Pointing `canonRoot` at
the repository `canon/` would change product files during `vitest`.

## Lesson

`serveSlice` copies `canon/` to a temp dir and binds `createApi` to that root.
Approve and reject proofs use that copy. Live API on loopback still writes the
real tree — do not approve from the browser during a check unless the change is
intended.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/proposals.test.ts --reporter=dot`
  passed after the copy; approve changed only `s.canonDir`.
- **Review/audit:** `docs/reviews/2026-09-20-F-02.md`.
- **Smoke/log/screenshot:** browser reject left
  `canon/conditions/condition.wetness.yaml` at `dry: ""`.

## Promotion candidate

- [ ] lint rule
- [x] checklist item — `tests/helpers.ts` `cpSync` is the gate for this loop.
