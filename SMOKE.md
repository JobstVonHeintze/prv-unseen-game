# SMOKE.md — the smoke contract for contrejour

> The smoke gate is the assembled-behavior proof required before review in
> this project. Package tests remain necessary but are not sufficient. Adopted
> from [walkinglabs harness-engineering Lecture 10](https://github.com/walkinglabs/learn-harness-engineering)
> ("only a full-pipeline run counts as real verification").

## What the smoke must verify

`scripts/smoke.sh` must, end to end:

1. **Build** the project (compile, bundle, or equivalent) using the already
   initialized local environment.
2. **Run real tests** and fail when the intended test set is empty.
3. **Exercise assembled behavior** at the narrowest truthful boundary: boot
   the service, invoke the CLI, run the core-loop dump, or execute the
   library's consumer-level integration contract.
4. **Leave a clean working tree.** No zombie processes, no open ports, no
   uncommitted artefacts.
5. **Stay quiet on success.** Aim for < 30 lines of output when green; be
   verbose only on failure (`BLOCKER:`/`WHY:`/`FIX:`). Agents run this
   command constantly, and everything it prints stays in the session context
   on every later turn.

Total wall-clock budget: **~60 seconds** on a developer laptop. If yours
grows past that, split the slow parts into `scripts/integration.sh` and
keep `smoke.sh` strictly fast-path.

## How to run it

```bash
bash scripts/smoke.sh
```

Configured project command:

```bash
bash scripts/smoke.sh
```

## How the harness uses it

- `bash init.sh` — does **not** run the smoke; only validates the env.
- `bash harness/run advance` from `build` — enters verify, runs the smoke,
  and refuses to advance if it fails.
- `@sprint-runner` Phase 2 — advances through verify before
  declaring Checkpoint 2 done.
- `@sprint-reviewer` — re-runs the smoke independently as part of the
  evidence cross-check; flags any feature claiming `verified=true` without
  a passing smoke.

## Projects without a server

No HTTP server does not mean no verification. A library's smoke may be its
build plus a consumer-level integration test; a migration repository may run
its deterministic validators; a CLI invokes one representative command.
There is no text-file bypass for proof-of-done.

## What the smoke must NOT do

- Do **not** run slow integration suites here. Move them to
  `scripts/integration.sh` or a CI-only step.
- Do **not** install dependencies, tidy modules, run migrations, or rewrite
  generated files. Initialization is a separate phase.
- Do **not** use `--if-present`, catch-and-ignore fallbacks, or filtered test
  commands that exit zero after running no tests.
- Do **not** depend on production secrets. Use fixtures, sandboxes, or
  self-skipping live integration tests.
- Do **not** leave background processes alive. Always `trap` and `kill`.
- Do **not** mutate files outside `tmp/` or `.cache/`. Smoke must be
  idempotent.

## When the smoke breaks

A failing smoke is a **hard stop** for any agent session. The sprint-runner
will refuse to declare Checkpoint 2 done; the workflow runner will refuse
to advance to `review`. The fix is **always** to make the project work, not
to weaken the smoke. If you find yourself asking "can we skip the smoke
this once?", the answer is no — that path leads to silent regression debt.
