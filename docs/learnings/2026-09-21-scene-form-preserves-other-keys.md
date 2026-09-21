# Learning: scene form patches fields, not the whole file

- **Date:** 2026-09-21
- **Author:** learnings-writer
- **Scope:** `area:authoring`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-21
- **Supersedes:** N/A

## Trigger

A beat edit must not drop `location`, `requires`, or spice blocks.

## Lesson

`applySceneForm` uses `yaml` `parseDocument` and sets only `beat`, `tags`,
and `choices`. Preview compiles that YAML and still goes through
`previewProposal`. Tests assert `location: loc.ascend.l1` survives. The
stringifier may fold a short beat as `>-`; assert on the prose, not on
`beat: The lobby...` as a single line.

## Evidence (required)

- **Test:** `pnpm exec vitest run packages/canon/src/scene-form.test.ts --reporter=dot`
- **Review/audit:** `docs/reviews/2026-09-21-F-09.md`.

## Promotion candidate

- [ ] checklist item — scene-form unit keeps `location` on apply.
