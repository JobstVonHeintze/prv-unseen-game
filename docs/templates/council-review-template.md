# Council Review Template

Use this rubric when reviewing a draft plan. The reviewer must not edit files.
Return findings only.

## Input

- Plan path: `<path>`
- Plan text: supplied by the council runner

## Output Format

### Verdict

One of:

- `accept` — plan is strong enough to approve after normal human review.
- `revise` — plan is directionally sound but should be updated first.
- `block` — plan has a material flaw that makes implementation unsafe.

### Findings

For each finding:

- **Severity:** critical | high | medium | low
- **Category:** scope | missing-deliverable | dependency | verification |
  overengineering | security | clarity | sequencing
- **Evidence:** quote or reference the plan section.
- **Recommendation:** concrete edit to the plan.

### Consensus Signals

- What looks strong?
- What is likely missing?
- What is over-specified or overengineered?
- What verification command is weak, missing, or too broad?
- What assumptions should the original planner revisit?

### Suggested Plan Edits

Return concise bullet points. Do not rewrite the full plan unless asked.

## Scoring

Score 0 / 1 / 2:

| Dimension | Question | Score |
|-----------|----------|-------|
| Scope | Is the scope narrow, explicit, and free of hidden extra work? | /2 |
| Deliverables | Are all deliverables necessary, ordered, and complete? | /2 |
| Verification | Does every deliverable have a falsifiable command or check? | /2 |
| Risks | Are meaningful risks and mitigations identified? | /2 |
| Simplicity | Does the plan avoid avoidable process or architecture ceremony? | /2 |
| Handoff | Could a fresh agent implement from repo artifacts only? | /2 |

Total: `__/12`
