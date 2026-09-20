# Private benchmark — contrejour

This directory turns the eval suite into a private benchmark for later Dark
Factory projects. It follows the pattern from
[Agents' Last Exam](https://github.com/rdi-berkeley/agents-last-exam): give an
agent only the task, let it work to completion in an isolated environment, then
stage hidden references and grade the artifacts it leaves behind.

The unit under test is not the generator by itself. It is the complete setup:

```text
model + agent runtime + Dark Factory scaffold + target project + tool permissions + autonomy level
```

## Why private

Public benchmarks are useful for orientation, but they are not the best tuning
target for your scaffold. They may be saturated, contaminated, or too far from
your product work. The benchmark that improves this project is built from your
own history:

- bug-fix commits,
- failed sprint reviews,
- CI regressions,
- boundary/security incidents,
- prompt-injection and secret-handling probes,
- tasks where an agent passed by touching far too much code.

## Default behavior

This benchmark is intentionally inert until configured:

- `benchmark.config.json` starts with `"enabled": false`.
- `run-background.mjs` exits 0 with a clear skip message when disabled.
- Scheduled CI, when present, uploads an artifact but does not block PRs.
- Normal sprint work does not gain another manual step.

Enable the benchmark when you have an agent CLI/API key configured and enough
harvested tasks to learn from the trend.

## Running

```bash
node evals/benchmark/run-background.mjs
node evals/benchmark/run-background.mjs --tier full --samples 5
node evals/benchmark/run-background.mjs --task T-002-scope-honeypot
```

The wrapper delegates to `evals/run.mjs`. v1 uses the existing tiers:
`smoke`, `full`, `hidden`, and `all`. Task packs are metadata/curation for now;
the runner still discovers tasks from `evals/tasks/` and `evals/hidden/`.

## Results

Raw eval runs stay in `evals/results/` and are gitignored. The background
wrapper copies the latest `summary.json` into `evals/benchmark/results/` so CI
can upload a compact benchmark artifact. Keep long-term decisions in
`docs/reviews/` or `docs/decisions/`, not in raw result files.

Use results to decide whether to:

- raise or lower `CLAUDE.md`'s `autonomy:` level,
- change the model or agent runtime,
- simplify prompts,
- add or remove deterministic gates,
- promote recurring failures into `/eval-harvest` tasks or hard checks.

## Model council inputs

`council-summary.md` files are useful benchmark evidence. If the council keeps
flagging the same planning failure, add a task that asks an agent to draft or
repair a plan and grades the hidden criteria: scope, DoD quality, risk coverage,
and absence of overengineering. This brings Perplexity-style multi-model
critique into the same measurement loop as the
[Agents' Last Exam](https://github.com/rdi-berkeley/agents-last-exam)-inspired
private benchmark.

## Capability-map task packs

If the project has a `docs/capability-map.md`, treat capabilities as a task-pack
dimension: a pack is the set of tasks exercising a capability (or a related
group). High-risk capabilities — `money-movement`, `destructive-actions`,
`autonomous-worker`, `multi-tenant`, `regulated-data` — deserve the most
benchmark coverage. Tag tasks with the optional `capabilities: []` field
(see `evals/README.md`) so a pack can be selected by capability. The mapping
from capability to task shape lives in the bootstrap skill's
`references/capabilities/eval-patterns.md`.

## Not in v1

- No dependency on ALE cloud sandboxes.
- No new task discovery path beyond `evals/tasks/` and `evals/hidden/`.
- No executable capability→task mapper; the agent proposes seeds from the map.
- No live eval dashboard. Observatory v2 reads `evals/metrics/eval.jsonl` into
  a static report; `publishToObservatory` on the benchmark remains opt-in.
