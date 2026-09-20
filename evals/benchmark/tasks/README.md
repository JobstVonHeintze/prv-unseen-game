# Benchmark task packs — contrejour

Task packs are how you curate private benchmark coverage over time. In v1 they
are a convention and documentation surface, not a separate runner mechanism:
`/eval-harvest` still writes runnable tasks to `evals/tasks/`, and
`evals/run.mjs` still discovers tasks from `evals/tasks/` plus `evals/hidden/`.

Use packs to decide which tasks represent the quality bar for a later project.
Good sources:

- bug-fix commits that should have been easy,
- failed sprint-review findings,
- CI failures that agents misdiagnosed,
- boundary, security, or prompt-injection incidents,
- cases where the agent passed by changing too much code,
- hidden-set refreshes before model or autonomy changes.

## Suggested manifest

Create a `pack.json` next to your curated notes and validate it informally
against `evals/benchmark/task-pack.schema.json` if useful:

```json
{
  "schemaVersion": 1,
  "id": "checkout-regressions",
  "name": "Checkout regression pack",
  "source": {
    "project": "customer-portal",
    "repo": "git@github.com:example/customer-portal.git",
    "ref": "main"
  },
  "difficultyMix": {
    "easy": 4,
    "medium": 8,
    "hard": 3
  },
  "hiddenRatio": 0.25,
  "failureModeTags": ["wrong-file", "scope-creep", "ignored-constraint"],
  "tasks": [
    {
      "id": "T-014-checkout-tax-rounding",
      "tier": "full",
      "difficulty": "medium",
      "kind": "regression",
      "sourceCommit": "abc1234"
    }
  ]
}
```

## Promotion rule

Do not add every bug to the benchmark. Add failures that teach the harness
something:

- a missing instruction,
- a missing tool,
- a model/runtime mismatch,
- an autonomy level that was too loose,
- a deterministic gate that should exist.

The goal is a stable private exam, not a second issue tracker.
