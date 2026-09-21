# Plan: LLM personas skip without credentials

- **Date:** 2026-09-21
- **Status:** done
- **Author:** Cursor
- **Spec(s):** `docs/reference/prototype-design.md` §8; `CLAUDE.md` self-skip-live
- **Product track:** feature
- **feature:** F-10
- **verify:** `bash scripts/smoke.sh`
- **review:** sprint-reviewer
- **autonomy:** autonomous
- **council:** `docs/reviews/council/2026-09-21-2026-09-21-llm-personas-skip/council-summary.md`
- **inputs:**
  - `docs/reviews/2026-09-21-F-09.md`
  - `docs/manuals/end-user-manual.md`

## Context

Scripted bots are shipped. Prototype-design also names LLM personas.
There is no provider grant and no keys in this repo. F-10 registers the
persona names and the skip path so a missing secret is not a red build
and a successful call is never mocked.

## Product framing

- **User / stakeholder:** author running rehearsal from the API.
- **Problem:** `personas` is an unknown field; there is no honest skip.
- **Outcome:** POST with a known persona returns 201, lists
  `skipped_personas`, writes no canon. Unknown persona is 400. Live
  drive stays unshipped until a provider is configured.
- **Non-goals:** vendor SDK; Console persona button; mocking a 200 from
  a model; `condition.caio`.
- **Decision log:** N/A.
- **Prior learnings consulted:** queue_proposals opt-in; bots score canon.

## Pre-existing working tree

`main` at `766dc2b` after F-09.

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 0 | Bind F-10 | config | `harness/feature_list.json` | `node harness/lib/check-feature-list.mjs` | P0 |
| 1 | Persona catalogue + skip helper | code | `packages/rehearsal` | `pnpm exec vitest run packages/rehearsal/src/personas.test.ts --reporter=dot` | P0 |
| 2 | POST rehearsal personas skip | test | `tests/contract/personas.test.ts` | `pnpm exec vitest run tests/contract/personas.test.ts --reporter=dot` | P0 |
| 3 | Manual change log | docs | `docs/manuals/end-user-manual.md` | `rg -q "skipped_personas" docs/manuals/end-user-manual.md` | P0 |
| 4 | Smoke | test | `scripts/smoke.sh` | `bash scripts/smoke.sh` | P0 |

## Acceptance criteria

- [x] Known persona without credentials → 201, `skipped_personas` set, no YAML write.
- [x] Unknown persona → 400.
- [x] Default rehearsal without `personas` still runs the drifter.
- [x] Player `/personas` is 404.
- [x] All existing tests continue to pass.
- [x] No new TODO/FIXME comments introduced.

### Smoke evidence

```
$ bash scripts/smoke.sh
smoke ok
```

Recorded `2026-09-21T04:58:26Z`. 29 files / 51 tests.

## Technical approach

- `config/rehearsal.json` holds persona briefs and a model id key name.
- Credentials are `CONTREJOUR_LLM_URL` + `CONTREJOUR_LLM_KEY`. Absent → skip.
- Do not implement a vendor call in this feature.

## Blast radius

- **modules:** `rehearsal`, `api`. Manual only.
- **tests:** new personas unit + contract.

## Dependencies

- Requires: F-06 rehearsal (done).

## Open questions

- [x] Q1: Implement OpenAI-compatible drive now? → no; skip is the product truth until a provider is granted.

## Estimated effort

- Total: 1 session

## Legacy removal

- N/A.
