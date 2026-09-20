---
name: sprint
description: Runs one bounded feature through scope, implementation, verification, and explicit review. Use when the user explicitly asks to run a sprint in Cursor.
disable-model-invocation: true
---

# Sprint

Use the repository contract as the source of truth; this file is a Cursor
adapter, not a second workflow definition.

## Preflight

1. Read `AGENTS.md`, `CLAUDE.md`, the relevant spec/decision, and
   `docs/templates/plan-template.md`.
2. If present, read `docs/harness-guide.md` and the latest relevant review.
3. Capture pre-existing paths with:

   ```bash
   git status --short
   git diff --name-only
   git ls-files --others --exclude-standard
   ```

   Record them in the plan. Never stash, reset, overwrite, or adopt them.

## Checkpoint 1 — scope

Create one stable-path plan under `docs/plans/` with all required template
fields: `feature`, `verify`, `review`, `autonomy`, and `inputs`.

- Scope one feature with 3–6 deliverables.
- Every DoD is a literal, non-mutating command using project-owned or locked
  local tooling.
- Record explicit non-goals and the pre-existing tree.
- Present the plan. Wait only when the plan's autonomy level requires it.

Register one real `not_started` feature and run:

```bash
bash harness/run start F-NN
bash harness/run advance
```

## Checkpoint 2 — implement and verify

Implement the approved scope in one context. Keep unrelated changes untouched.
Run each deliverable DoD.

Add exact evidence, mark the active feature
`done`, then advance from build to verify:

```bash
bash harness/run advance
```

Present the implementation summary and a proposed commit batch. Do not commit
or push when `commit: ask`; autonomy does not grant commit rights.

## Checkpoint 3 — review and closeout

Run the plan-level `verify:` command. Confirm:

- fixtures come from the real write path;
- live tests self-skip without credentials;
- policy truth is not mocked;
- generated catalogs detect fallback/source-value leakage.

Invoke the `sprint-review` skill in a fresh context when possible. Record
`fresh host session | same-session subagent | human` honestly; same-session is
not independent.

Register the exact review and close out:

```bash
bash harness/run review docs/reviews/<feature-review>.md
bash harness/run advance
bash harness/run reset --confirm
```

Mark the plan `done` in place and update `claude-progress.md`. When generated
files or uncommitted sprint work make recovery relevant, cite the actual
durable host-session id. Keep raw transcripts ignored/outside the repository
unless the user approves a sanitized export.
