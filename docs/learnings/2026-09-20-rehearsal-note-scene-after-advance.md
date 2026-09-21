# Learning: note the scene after the action that fires a gate

- **Date:** 2026-09-20
- **Author:** learnings-writer
- **Scope:** `area:rehearsal`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-20
- **Supersedes:** N/A

## Trigger

A rehearsal timeline lists `gate.p1.g7` but the report still marks
`scene.dalia-pulse` as never entered.

## Lesson

Date gates often fire on `advance_evening`. If the play loop breaks as soon
as g7 appears on the timeline, it must record `currentScene` after that
advance. Recording only on `choose` / `enter_scene` misses the last gate
scene. Reachability is scenes entered, not gate ids.

## Evidence (required)

- **Test:** `pnpm exec vitest run tests/contract/rehearsal.test.ts --reporter=dot`
  — failed on `missed_gate_scenes` still containing `scene.dalia-pulse`
  while gates included g7; passed after noting the scene at the end of
  each loop turn.
- **Review/audit:** `docs/reviews/2026-09-20-F-06.md`.

## Promotion candidate

- [ ] checklist item — any new bot loop records `currentScene` after every
  successful `act`, including advance.
