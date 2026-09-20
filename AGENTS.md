# AGENTS.md — contrejour

> **This file is a routing alias.** Codex, Cursor, and other coding agents
> look for `AGENTS.md` by convention; Claude Code looks for `CLAUDE.md`.
> The actual operating contract for this repository lives in **`CLAUDE.md`**
> in this same directory. The two files describe the same canonical rules.
> Drift between them is **machine-detected** by `scripts/check-sync.mjs`
> (run automatically in pre-commit, in CI, and via `/doctor`). When you
> change a non-negotiable rule, change it in *both* files — or use the
> `<!-- sync-exempt: <ruleId> -->` marker for the rare per-file case.

## Read first

1. `CLAUDE.md` — the living contract for any AI coding agent in this repo.
2. `MANUAL.md` — the full user manual (agent catalogue, layer reference,
   day-to-day workflows).
3. `claude-progress.md` — the most recent session's handoff log.
4. `docs/harness-guide.md` — full lifecycle / harness deep-dive.

## Operating loop (the one-screen version)

At the start of every session:

1. Run `pwd` and confirm you're at the repository root.
2. Read `claude-progress.md` (latest entry).
3. Run `bash init.sh`. It must exit 0. If it prints `BLOCKER:`, fix the blocker first.
4. Read `harness/feature_list.json`; start one real feature with
   `bash harness/run start F-NN` before editing.
5. Review `git log --oneline -5` to see what just happened.

Then work on **exactly one feature** until you verify it or document why it's blocked.
If the work is scoped to a subdirectory, read any local `CLAUDE.md` there
before editing and use `@codebase-mapper` for unfamiliar areas.

## Rules (non-negotiable)

- One feature in active progress at a time. (Walkinglabs Lecture 07: WIP=1.)
- Do not claim completion without runnable evidence. (Lecture 09.)
- Do not refactor unrelated code mid-feature. (Lecture 09: completion priority.)
- Live third-party tests self-skip without credentials; successful calls are
  not mocked.
- Do not mock a policy/rules table whose contents are the product truth.
- Test fixtures must be producible by the real write path.
- Generated catalogs must detect fallback/source-value leakage, not merely
  check key presence or idempotency.
- Verification uses project scripts or locked local tools; no implicit downloads.
- Do not mutate `harness/feature_list.json` outside the documented protocol.
- Do not bypass the bound `start → build → verify → review → closeout`
  lifecycle ("just this once").
- Use repository artefacts as the system of record. (Lecture 03.)
- Keep root context broad; add local `CLAUDE.md` files only for durable
  subtree-specific rules, commands, ownership, or gotchas.

## Before stopping

1. Update `claude-progress.md` (one entry: done / red / next).
2. Update `harness/feature_list.json` (status + evidence) per protocol.
3. Walk `CLEAN_STATE_CHECKLIST.md`.
4. Record the working-tree handoff. Current policy is
`commit: ask`; when it is `ask`, commit/push only when the user
explicitly approves. Autonomy alone does not grant it.
5. Start the next task in a fresh session — repo artifacts, not chat
   history, are the handoff.

## Why two files

Different agent runtimes look for different filenames:

| Runtime | Looks for |
|---------|-----------|
| Claude Code | `CLAUDE.md` |
| Codex | `AGENTS.md` |
| Cursor | `.cursorrules`, `AGENTS.md`, or `CLAUDE.md` (configurable) |

We ship both `AGENTS.md` (this short routing alias) and `CLAUDE.md` (the
full operating contract) as kernel files. The two files are **kept in
sync by an automated drift-detection check** (`scripts/check-sync.mjs`),
wired into pre-commit, CI (`spec-gates.yml`), and the
`/doctor` shell command.

If you add a rule to one, add it to the other. If you genuinely need a
rule in only one (e.g. a Cursor-specific instruction that makes no
sense for Claude Code), put this marker on its own line in the file
that owns it:

```
<!-- sync-exempt: <ruleId> -->
```

The check supports the following canonical rule IDs (extend in
`scripts/check-sync.mjs` if you add new shared rules):

- `wip-1` — only one feature in active progress at a time.
- `evidence-required` — no completion claim without runnable evidence.
- `no-refactor-mid-feature` — completion priority constraint.
- `progress-log` — `claude-progress.md` referenced.
- `commit-policy` — commit/push requires explicit user or human-authored policy.
- `self-skip-live` — live tests self-skip without credentials.
- `policy-truth` — policy tables are not mocked.
- `write-path-fixtures` — fixtures come from the real write path.
- `generated-fallback` — generated values are checked against fallback leakage.
- `agents-routes-to-claude` — AGENTS.md must reference CLAUDE.md.

Read `CLAUDE.md` next for the full contract.
