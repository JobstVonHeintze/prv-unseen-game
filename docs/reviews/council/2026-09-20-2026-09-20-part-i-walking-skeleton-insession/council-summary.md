# Council summary — Part I walking skeleton

- **Date:** 2026-09-20
- **Plan:** `docs/plans/2026-09-20-part-i-walking-skeleton.md`
- **Transport:** in-session Cursor subagents
- **Autonomy:** auto-adopt (owner grant)

## Verdicts

| Reviewer | Model | Verdict | Score |
|----------|-------|---------|-------|
| A | Grok (`2b870d4e-2981-4c4e-bc17-ae4d1e7d1013`) | REVISE | 4/12 |
| B | GPT (`ba8049ec-a236-4007-8f56-01eece48c22e`) | REVISE / block-until-edits | 4/12 |

## Consensus (adopted)

1. Replace recursive smoke stub with a real loopback sequence.
2. Player schemas are **allowlists**; contract test rejects unknown keys. Denylist substring search is forbidden.
3. Publish an F-01 route table. Deferred prototype §9 routes (`commit`, proposals, rehearsals) return 404.
4. Literal DoD commands per deliverable.
5. Storyboards URL-only in F-01 (no multipart uploads).
6. JSON index is an F-01 exception; query API frozen; YAML remains SoT.
7. Chain 1 must test both date-trigger and earlier progress-trigger.
8. Chain 5 must cover clip → send → classify, plus phone-drawer block and Sunday-call risk.
9. Honest rewind: current + previous evening only; sandbox/commit 404.
10. Validator AC: age, dual-trigger, hooks-back, referential integrity.
11. Determinism compares canonical state, excluding `runId`.
12. Findings write through Player `POST /v1/runs/{id}/findings`; fixtures from the write path.

## Split findings

| Topic | A | B | Reconciliation |
|-------|---|---|----------------|
| Split F-01 into P0/P1 | Critical | Critical (or restage) | Keep WIP=1, one feature. Do not split. Surfaces stay in F-01 because the owner asked for a working desk. Estimate is "until smoke green", not "one short session". |
| SQLite vs JSON | Delete sqlite paragraph | Amend constitution or pick one | JSON index for F-01; constitution 2a note: index writer may emit JSON until SQLite lands. |
| Browser tests in smoke | — | High | Smoke stays API + HTML 200 + drifter; browser pass is post-smoke verification, not the gate. |
| Noor | — | Unresolved | Include a Noor `tells` edge in fixtures; chain 4 remains Blanche as the named e2e. |

## Escalated

None. Owner grant is autonomous; no product trade-off needs a human.

## Plan status

Updated in place. Status remains `draft` until smoke is green, then `in-progress` → `done`.
