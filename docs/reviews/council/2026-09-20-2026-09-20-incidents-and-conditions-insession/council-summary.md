# Council summary — incidents and felt conditions

- **Date:** 2026-09-20
- **Plan:** `docs/plans/2026-09-20-incidents-and-conditions.md`
- **Transport:** in-session Cursor subagents
- **Autonomy:** auto-adopt (owner grant)

## Verdicts

| Reviewer | Model | Verdict | Score |
|----------|-------|---------|-------|
| A | GPT (`d05ecd49-d8f4-4dc9-9062-f3890e875c1c`) | revise | 6/12 |
| B | Gemini (`b2678d70-c3ce-4ab9-b7a8-60b20e78d454`) | revise / APPROVE-WITH-EDITS | 9/12 |

## Consensus (adopted)

1. One g1 → rain incident → g2/gallery transition; gallery and g2 fire exactly once after `incident.resolved`.
2. Event table: `incident.started` / `incident.ticked` / `incident.resolved`; invalid choices do not clear `currentScene`.
3. Register F-03 on the feature board before `harness/run start F-03`.
4. `propose` rejects forged ineligible choices and lock bypasses; Player filter is not the only gate.
5. Split engine unit DoD (`fold.test.ts`) from the contract test.
6. Hidden-state allowlist adds `felt`; dump must not contain `condition.` or `incident.`.
7. Document `State.conditions` and `State.incident` in the plan.

## Split findings

| Topic | A | B | Reconciliation |
|-------|---|---|----------------|
| g2 duplicate gallery | Critical | — | Adopt. Valid exit sets `flag.reached-gallery`, fires g2 once, enters `scene.gallery`. |
| CLAUDE.md evals smoke | High | — | Adopt if vocabulary lines change: `node evals/run.mjs --tier smoke`. |
| write-canon temp-tree test | High | — | Update generator; loader test reads repo YAML. No extra generator harness. |
| One-session estimate | Medium | — | Keep one session; add an ordered slice list, not a second feature. |
| Legacy Removal | High | — | N/A section: no files deleted. |

## Escalated

None. Autonomy auto-adopts the concrete edits above.
