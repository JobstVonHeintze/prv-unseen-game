# Plan: Structured scene form and desk manual

- **Date:** 2026-09-21
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/reference/prototype-design.md` §6; `MANUAL.md` manual-writer
- **Product track:** feature
- **feature:** F-09
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-21-2026-09-21-scene-form-and-manual/council-summary.md`
- **inputs:**
  - `docs/reviews/2026-09-21-F-08.md`
  - `docs/learnings/2026-09-20-preview-before-proposal-id.md`

## Context

Authors still edit raw YAML. Testers have a playable desk with no teaching
document. F-09 adds a structured scene form that still writes only through
proposals, and the end-user manual at `docs/manuals/end-user-manual.md`.

## Product framing

- **User / stakeholder:** author and tester on the local desk.
- **Problem:** a scene change means editing YAML; there is no product manual.
- **Outcome:** open a scene, edit beat / tags / choices as fields, preview
  and queue as today. The manual teaches play, inspect, rehearse, propose.
- **Non-goals:** forms for every entity type; create-id; AI author; LLM
  personas; 2D/3D; auto-approve.
- **Decision log:** N/A.
- **Prior learnings consulted:** preview before `/:id`; tests copy canon;
  bots score canon, not Player tags.

## Pre-existing working tree

`main` at `9012973`. Clean except ignored runtime data.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-09 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Scene form read/apply | code | `packages/canon` | `pnpm exec vitest run packages/canon/src/scene-form.test.ts --reporter=dot` | P0 |
| 2 | GET/POST form routes | code | `packages/api` | `pnpm exec vitest run tests/contract/scene-form.test.ts --reporter=dot` | P0 |
| 3 | Console fields | code | `apps/console/src/main.ts` | same command | P0 |
| 4 | End-user manual + README start | docs | `docs/manuals/end-user-manual.md` | `test -f docs/manuals/end-user-manual.md && rg -q "First 10 minutes" docs/manuals/end-user-manual.md` | P0 |
| 5 | Smoke | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] Form apply changes beat/tags/choices and leaves other keys in the YAML.
- [x] Preview does not write. Approve remains the only write.
- [x] Non-scene id returns 400 `unsupported-type`.
- [x] Player `/v1/runs/{id}/canon/form` is 404.
- [x] End-user manual exists and names only shipped surfaces.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-21T04:56:46Z`. 27 files / 49 tests.

## Technical approach

- `sceneFormFromYaml` / `applySceneForm` in `@contrejour/canon` using `yaml`
  Document so spice, requires, and location stay put.
- GET `/v1/console/canon/form?id=` and POST `/v1/console/canon/form/preview`
  registered before any `/:id` matcher.
- Console shows fields for scenes; YAML stays as the source view.
- Manual follows `@manual-writer` structure. README points humans at it
  and at `pnpm dev`.

## Blast radius

- **modules:** `canon`, `api`, Console. No engine change.
- **schemas:** none new; SceneSchema still validates the compiled YAML.
- **tests:** scene-form unit + contract.

## Dependencies

- Requires: F-05 editor, F-02 proposals (done).
- Blocked by: none.

## Open questions

- [x] Q1: Forms for secrets too? → scenes only this feature.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stringify churns the whole file | med | Proposal diff is the review; tests never approve live |
| Manual documents unshipped work | high | Only write what the desk does now |

## Estimated effort

- Total: 1 session

## Checkpoint 3 — verification and recovery reference

1. Run smoke and the scene-form contract.
2. Fixtures from `serveSlice` + `applySceneForm`.
3. Review context: same-session builder.
4. Commit/push authorized; manual lands before push.

## Legacy removal

- N/A.
