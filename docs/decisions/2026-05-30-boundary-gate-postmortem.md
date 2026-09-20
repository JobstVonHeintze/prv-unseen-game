# Decision: Replace the no-op module-boundaries stub with a deterministic, ratcheting, claim-verifying boundary gate

- **Date:** 2026-05-30
- **Status:** accepted
- **Author:** darkfactory maintainers
- **Plan(s):** N/A — sourced from a post-mortem (see Evidence)
- **Supersedes:** the manual-only `verify-boundaries` convention and the no-op CI stub

## Context

A forensic post-mortem of a production multi-module project scaffolded with
this paradigm examined its full, un-shallowed git history (**206 commits**,
root `75fa06c` 2026-04-25 → HEAD `b4f563b` 2026-05-29) and produced the
measured findings below. They are preserved because every gate file in this
scaffold carries a provenance link back to them.

| # | Finding | Evidence |
| --- | --- | --- |
| F1 | **`verify-boundaries` was never a gate.** It existed only as a manual Claude slash-command (`.claude/commands/verify-boundaries.md`), born in the bootstrap commit, never changed. `git log -S` over every `*.yml/*.toml/Makefile/Dockerfile` → **zero** references. No pre-commit hook, no pytest test, no import-linter ever ran it. | manual-only; never wired |
| F2 | **Drift was a step function with exactly ONE step.** Violations were constant at 9/23 (4 forbidden edges) from bootstrap until 2026-04-27, jumped to 14/28 (7 edges), then **flat** to HEAD — across **+13 % LOC** growth (54,270 → 61,489). | AST series, 37 sample points |
| F3 | **The one drift event was a QUALITY refactor**, not sloppiness: commit `daab0bf` (2026-04-27, *"fix(security): cycle 56 — centralise JSON-fence stripping"*) created a shared leaf module `text_utils` and had `analysis`, `extraction`, `mapping` import it (+3 edges). A naive gate would have **blocked a legitimate DRY improvement**. | edge diff at `daab0bf` |
| F4 | **4 violations were baked in at commit #1** and never cleaned up nor worsened: `extraction→admin`, `importer→mapping`, `intake→normalization`, `mapping→admin`. | bootstrap snapshot |
| F5 | **The manual self-report was wrong.** Sprint reviews 10–21 assert verbatim *"Module boundary violations: 0"* while ≥4 edges existed in the earliest measurable state. A false negative of agent/human self-grading. | `docs/reviews/2026-03-28-sprint-{10..21}-review.md` |
| F6 | **The rule definition diverged from the constitution.** The slash-command's grep flags `import logging` (stdlib) as a violation; the constitution explicitly allows stdlib. Two regimes (`constitution`=14, `grep-treu`=28 at HEAD) disagree → ambiguity breeds false positives. | dual-metric analyzer |
| F7 | **CI got weaker, and a gate that "exists" can still never run.** The only automated quality gate (`quality.yml`: ruff+pytest+Sonar) recorded **0 runs ever** and was deleted on 2026-05-04 (`7978158`); all 8 `security.yml`/Aikido runs failed. Final state: only `workflow_dispatch` deploy pipelines. | `gh run list`: 68 runs, all Deploy/Diag/Aikido |
| F8 | **A ratchet precedent already exists** in scaffolded projects: `tests/unit/test_api/test_backend_file_size_budgets.py` ("a budget may go DOWN, never UP without scrutiny"). Reuse that mental model for boundaries. | file-size budget test |

**The latent bug this scaffold shipped (now fixed):**
`templates/github/workflows/spec-gates.yml` carried a `module-boundaries` job
whose body was a **no-op `echo`** ("customize in…") — the exact pattern that
let F5 stand: a green check that proves nothing. The `review` phase gate in the
harness phase template (`workflow.yaml`) was `ls docs/reviews/*.md` — it
asserted a review **file exists**, never that its claims were **true**. And
`templates/claude/commands/verify-boundaries.md` was the same manual-only
command from F1.

## Options considered

| # | Option | Pros | Cons |
| --- | --- | --- | --- |
| A | Keep the convention + manual slash-command | zero tooling | exactly F1/F5: never runs, self-graded |
| B | Hard grep gate that fails on any cross-module import | simple | F3 false positive (blocks DRY), F4 retro-blocks pre-existing debt, F6 stdlib noise |
| C | Deterministic, config-driven, **ratcheting** checker + receipts + telemetry | no false positives (F3 allowlist), no retro-block (F8 ratchet), single source of truth (F6) | ~300 LOC of zero-dep Node to maintain |

## Decision

We chose **Option C**: replace the no-op `module-boundaries` stub with a
deterministic ratcheting checker (`harness/lib/check-boundaries.mjs` +
`harness/boundaries.config.json`) wired into **CI**, the **harness verify
gate**, and **pre-commit**; require sprint reviews to **cite its evidence
artifact** rather than self-report; and have every phase of the loop emit
schema-versioned process-health telemetry that a central **observatory**
aggregates into a fleet trend.

The trade-off we accepted: a small amount of zero-dependency Node tooling to
maintain, and the static-analysis limitation noted below.

## Constraints introduced

- The authoritative boundary rule is the **checker + its config**, not prose.
  The constitution section is descriptive; the checker is normative (kills F6).
- **Stdlib imports are always allowed.** The strict metric never counts them.
- **Ratchet, do not retro-block.** Pre-existing debt (F4) does not fail CI;
  only an **increase over baseline** does (F8). A legitimate shared-kernel /
  DRY refactor is allowed via `allowedSharedTargets` (F3).
- **Edge severity is per class** (`policy_gap` | `misplaced_contract` |
  `infra_leak` | `peer_coupling`). `infra_leak` and `peer_coupling` carry a
  target of 0: while baseline > 0 the gate warns and paydown is scheduled;
  once a class reaches 0 it is hard-zero.
- **No claim without evidence.** A sprint review asserting "0 violations"
  without linking `harness/boundaries.report.json` is invalid (kills F5).
- **A gate that does not run must fail louder than a violation.** The
  `gate-liveness` CI job fails if the boundary gate produced no receipt (F7).
- **Telemetry is a byproduct of the loop**, never a tool a human must remember
  to run (the failure mode that let `quality.yml` run 0 times — F7).
- **Trend memory.** `check-boundaries.mjs --append-trend
  docs/decisions/boundary-trend.jsonl` appends one append-only line per run
  (`{sha, ts, violations_total, classes}`), so the factory accrues the drift
  series F2 showed is invisible without a baseline.

## Reversibility

Two-way door. The checker is one zero-dependency file; the config is one JSON.
Removing the gate is a config deletion (the checker fail-opens when its config
is absent). The behavioural lessons (F1–F8) are the durable part.

## Known limitation (do not hide it)

Static import analysis cannot see dynamic imports, dependency injection, or
string-keyed coupling. The boundary gate therefore **complements** — does not
replace — the preserved-capability contract tests (the capability chains).
This mirrors the post-mortem's own stated caveat ("too young / front-loaded").

## Why this file exists

Plans (`docs/plans/`) say *what* will be built. Specs (`specs/`) say *what* the
rules are. Decisions (`docs/decisions/`) say *why* a trade-off was chosen —
here, why the boundary check became a real, ratcheting, claim-verifying gate
instead of a convention. Every gate file in this scaffold references this
record by its `F<n>` findings.
