# Plan: <Title>

- **Date:** YYYY-MM-DD
- **Status:** draft | approved | in-progress | review | done
- **Author:** <name or "Claude Code">
- **Spec(s):** <link or N/A>
- **Product track:** discovery | quick-fix | feature | sprint | correct-course | review | retrospective
- **feature:** F-NN | N/A
- **verify:** <one literal command that exits 0 when this plan is done>
- **review:** sprint-reviewer | <qualified human role when policy requires>
- **autonomy:** checkpointed | trusted | autonomous
- **inputs:**
  - <constitution/spec/decision path>

## Context

Why this work is needed. Link to any prior plans or reviews. Keep it to a
paragraph; if it takes more, split the plan.

## Product framing

- **User / stakeholder:** who benefits or who requested this?
- **Problem:** what user/business problem is being solved?
- **Outcome:** what observable behavior or decision changes when this is done?
- **Non-goals:** what is explicitly out of scope?
- **Decision log:** link to `docs/decisions/` entry, or N/A.
- **Prior learnings consulted:** what did `@learnings-researcher` surface from
  `docs/learnings/` that shapes this plan? Link the entries, or write "none relevant".

## Pre-existing working tree

Record `git status --short`, `git diff --name-only`, and untracked paths before
implementation. These paths are not part of the plan unless explicitly adopted:

- <path and owner/reason, or "clean">

## Deliverables

| # | Item | Type | Verification Path | Definition of Done | Priority |
|---|------|------|-------------------|--------------------|----------|
| 1 | ... | code \| test \| docs \| config | path/to/file | one shell command that exits 0 when this is genuinely done | P0 |
| 2 | ... | ... | ... | ... | P1 |

**Type values:** code, test, docs, config, ci, adapter, fixture, legacy-removal
**Priority:** P0 (must), P1 (should), P2 (nice)
**Definition of Done:** a literal command (e.g. `npm test -- features/x.test.ts`,
`curl -fsS http://localhost:3000/health`, `pytest tests/integration/`). If you cannot
write a falsifiable DoD, the deliverable is not yet ready for the plan — it is
still a discovery item. (Adopted from
[walkinglabs harness-engineering Lecture 07](https://github.com/walkinglabs/learn-harness-engineering).)
Commands must use project-owned scripts or locked local tools; they must not
download tooling implicitly. Prefer quiet output (dot reporters, `-q`): a DoD
command's output lands in the session context and is re-sent on every turn
after it.

## Acceptance criteria

- [ ] ...
- [ ] All existing tests continue to pass.
- [ ] No new TODO/FIXME comments introduced.

### Smoke evidence

Paste the output of the project's smoke command (`bash scripts/smoke.sh`,
or project equivalent) once it exits 0. This is the end-to-end gate the
harness-engineering literature treats as the only real proof of done —
necessary even when unit tests are green.

```
$ bash scripts/smoke.sh
... paste output here ...
```

The generated script starts as a red stub. Do not replace evidence with an
opt-out file: libraries and non-server projects still need a falsifiable
build/test or consumer-level verification command.

## Technical approach

Short description of the implementation strategy. Prefer bullet points over prose.

## Dependencies

- Requires: <other plans or external work>
- Blocked by: <anything preventing start>
- Blocks: <anything waiting on this>

## Open questions

- [ ] Q1: ? -> Decision: ___

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ... | low/med/high | ... |

## Estimated effort

- Implementation: ~N sessions
- Tests: ~N sessions
- Total: ~N sessions

## Checkpoint 3 — verification and recovery reference

1. Run the plan-level `verify:` command and every deliverable DoD.
2. Confirm fixtures are states the real write path can produce.
3. Confirm live third-party tests self-skip when credentials are absent.
4. Record review context: `fresh host session | same-session subagent | human`.
5. If generated/derived files were touched or sprint-owned work remains
   uncommitted, cite the actual durable host-session id in the review. Raw
   transcript exports stay ignored/outside the repo; commit a sanitized export
   only with explicit approval.

## Legacy removal

*(Delete this section if not applicable.)*

- [ ] `path/to/legacy/file` — replaced by this work
