# Harness Guide — contrejour

> Topic doc loaded by agents on demand. Linked from `CLAUDE.md` Section 11.
> Intended audience: any AI coding agent (or human) about to start a session.
> Adopted from
> [walkinglabs harness-engineering](https://github.com/walkinglabs/learn-harness-engineering)
> Lectures 02, 06, 07, 08, 09, 10, 12.

## Why this document is separate

Lecture 04 of the walkinglabs course (*"Why one giant instruction file fails"*)
is explicit: an entry file over ~200 lines starts losing the agent's
attention to the "lost in the middle" effect, and the agent's behaviour
drifts proportional to how buried each rule is. We keep `CLAUDE.md` ≤ 150
rendered lines and push detail here.

## Session lifecycle

```text
bash init.sh
  -> harness/run start F-NN
  -> build the one bound feature
  -> run its verification commands
  -> mark F-NN done with matching evidence
  -> harness/run advance                 # build -> verify
  -> write docs/reviews/<feature>.md
  -> harness/run review <review-path>    # explicit artifact, not newest file
  -> harness/run advance                 # review -> closeout
  -> record working-tree handoff
  -> harness/run reset --confirm
```

Commit/push is not a phase. It happens only when the user asks or a
human-authored standing order sets `commit: auto`.

## The harness primitives + one kernel companion

### `init.sh` — the session-start ritual (Lecture 06)

`init.sh` runs first. It validates the runtime, validates
`harness/feature_list.json` against its schema, prints the latest plan and
the latest progress entry. It exits 0 on a healthy environment, or 1 with a
single `BLOCKER:` line on a broken one.

Initialization does **not** reset lifecycle state. A new editor session
preserves the active feature, phase, and registered review.

**Optional deeper check.** Run with `INIT_VERIFY=1 bash init.sh` to also
run `scripts/smoke.sh` as part of init. This is slower (the full smoke
budget, ~60s) but catches "the project doesn't even build" before the
agent writes any code. Recommended for the first session of a
multi-session sprint.

```bash
$ bash init.sh
harness: init — health-checking the environment
harness: smoke harness present at scripts/smoke.sh
harness: latest plan -> docs/plans/2026-05-04-feature-x.md
harness: last progress entry -> ## 2026-05-03T19:42:00Z — sprint-runner — F-03 done
harness: init OK

$ INIT_VERIFY=1 bash init.sh
... (above) ...
harness: running scripts/smoke.sh as part of init (INIT_VERIFY=1)
smoke: build
smoke: tests
smoke: assembled behavior
smoke: ok
harness: init OK (with smoke)
```

### `harness/feature_list.json` — the scope contract (Lectures 07 + 08 + 09)

Every feature carries:

- `id` (`F-NN` regex), `title`, `priority` (P0/P1/P2), `area`.
- `user_behavior` — one sentence describing the observable user-facing change.
- `verification_commands[]` — at least one shell command that proves the feature works.
- `evidence[]` — typed entries (`commit`/`test_run`/`smoke_run`/`screenshot`/`log`) with `ref` and `ts`.
- `status` ∈ {not_started, in_progress, blocked, done, abandoned}.

The scaffold starts with `features: []`. Register a real feature with a
falsifiable command; never preserve a placeholder merely to make `select`
green.

**Anti-tampering.** The sprint-runner is the only agent allowed to mutate
`status` and append `evidence`. The validator
(`harness/lib/check-feature-list.mjs --evidence-required`) refuses
`status=done` without matching evidence using **exact-equality** of the
verification command against an evidence ref of kind `test_run` or
`smoke_run`. The sprint-reviewer cross-runs every command independently
and verifies every `commit` SHA against `git log`.

**WIP=1 (Lecture 07).** The validator rejects duplicate ids and more than one
feature in `status=in_progress`. Enter work with `harness/run start F-NN`;
the runner marks a `not_started` row active and binds lifecycle state to that
id. Backlog rows may remain `not_started`; only one is active.

**Testing truthfulness.**

- Live third-party tests self-skip without credentials; do not mock success.
- Policy/rules tables whose contents are product truth are exercised directly.
- Fixtures must be producible by the real write path.
- Generated catalogs assert sampled values against fallback/source values;
  presence and idempotency alone are insufficient.

### `claude-progress.md` — the per-session handoff log (Lecture 12)

Append-only. ~3–10 lines per entry. Format:

```markdown
## 2026-05-04T18:00:00Z — sprint-runner — F-03 done, F-04 in progress

- **done:** F-03 (image upload) shipped; smoke green; commit 4a1b2c3.
- **red:** F-04 partially done; integration test failing on macOS only.
- **next:** triage thumbnail test on macOS; finish F-04 if quick fix.
```

Kernel-resident: present even with the harness layer off.

### `scripts/smoke.sh` — the only proof of done (Lecture 10)

Project-owned and initially red. The contract is in `SMOKE.md`. Replace the
stub with a non-mutating build + tests + assembled-behavior check. Do not
install dependencies, tidy modules, use `--if-present`, or accept a zero-test
run. A library's consumer-level build/tests are its smoke; there is no
text-file bypass.

### `harness/run` — the workflow runner (Lecture 02)

Phases: `init → select → build → verify → review → closeout`, declared in
`harness/workflow.yaml`. Each phase has a `precondition` (must exit 0
before entering) and a `gate` (must exit 0 before leaving). The runner
refuses to advance past a failing gate. Runtime state and receipts are local,
ignored artifacts; durable scope/evidence stays in the feature board and
review.

| Subcommand | Purpose |
| --- | --- |
| `bash harness/run init` | Health-check the env (delegated by `init.sh`). |
| `bash harness/run start F-NN` | Mark/bind exactly one feature as `in_progress`; enter select. |
| `bash harness/run review docs/reviews/<file>.md` | Register the exact review for the active feature; enter review. |
| `bash harness/run status [--quiet]` | Current phase, active feature, review artifact, history. |
| `bash harness/run phase <name>` | Run a specific phase: precondition + gate. |
| `bash harness/run advance` | Move to the next phase if its gate is green. |
| `bash harness/run reset --confirm` | Clear local state after closeout. |

Slash command: `/harness-status` runs `bash harness/run status` and
suggests the next concrete action.

### Gate-liveness receipts + metric emission (the byproduct primitives)

Every gate `harness/run` executes leaves a **receipt** at
`harness/receipts/<phase>.json` (`{gate, exitCode, ts, sha}`), and each phase
transition appends a **schema-versioned process-health record** to
`harness/metrics/<phase>.jsonl` via `harness/lib/emit-metrics.mjs`
(`harness/metrics.schema.json`, `schemaVersion: 1`). `smoke_pass` and
`review_completion_ratio` are computed from receipts, `SMOKE_PASS`, and
`feature_list.json` — they are no longer permanently null.

Both are **byproducts of the loop** — nobody has to remember to run them —
and both are **fail-open**: emission never aborts a phase. CI publishes them
as artifacts; a central observatory aggregates the metrics across projects
into a fleet trend. Rationale: a gate that "exists" but never runs (or a
dashboard a human must launch) manufactures false assurance — exactly the
post-mortem failure modes below (F2/F7).

## Failure modes the harness layer catches

```
       WITHOUT HARNESS LAYER         WITH HARNESS LAYER
       =====================         ==================

       agent starts session,         init.sh exits 1 with
       env is broken,                BLOCKER: "node 18 needed,
       agent doesn't notice          found 16"; agent stops

                |                            |
                v                            v

       agent writes code,            user fixes env;
       tests fail for env            init.sh now exits 0;
       reasons, agent "fixes"        agent proceeds
       the wrong thing

                |                            |
                v                            v

       agent declares done,          smoke.sh + check-feature-list
       marks plan green;             refuse to mark feature done
       you find later it             without evidence;
       doesn't actually run          drift becomes impossible
```

### Three post-mortem failure modes (and how this layer closes each)

Sourced from a production boundary-gate post-mortem. See the
boundary-gate ADR at `docs/decisions/2026-05-30-boundary-gate-postmortem.md`.

- **(a) False self-report (F5).** An agent claims boundaries are clean without
  machine evidence — that project's sprint reviews asserted *"0 violations"*
  while 4 existed.
  *Closed by:* the deterministic checker
  (`harness/lib/check-boundaries.mjs`) emitting `harness/boundaries.report.json`,
  which reviews MUST cite — a boundary claim without the artifact is invalid.
- **(b) No-op gate (F1).** A check that "exists" but proves nothing — a CI job
  whose body was a green `echo`.
  *Closed by:* gates that actually run a deterministic check and exit non-zero
  on regression; a no-op cannot pass review because it produces no evidence.
- **(c) Dead gate (F7).** A gate that never runs or gets deleted — the one
  automated quality gate ran 0 times, then was removed.
  *Closed by:* per-gate **receipts** + a CI `gate-liveness` job that fails
  loudly when the expected receipt/evidence is missing, and the **observatory**
  that surfaces the fleet-wide gate-liveness rate over time.

## How sprint-runner uses all of this

1. **Pre-sprint:** read `claude-progress.md`, run `bash init.sh`.
2. **Phase 1 (Scoping):** propose bounded deliverables; register real features
   as `not_started`, then run `harness/run start F-NN` for the selected work.
3. **Phase 2 (Implementation):** implement and run the feature's commands;
   mark the active row `done` with exact matching evidence; advance through
   build to verify.
4. **Phase 3 (Review):** invoke `@sprint-reviewer`, then register the exact
   artifact with `harness/run review <path>`.
5. **Phase 4 (Closeout):** advance to `closeout`, record the working-tree
   handoff, update the plan in place, and reset local state. Commit remains
   separately authorized.

## Common rituals (cheat sheet)

| When | Run |
| --- | --- |
| Start of session | `bash init.sh` |
| Start one feature | `bash harness/run start F-NN` |
| Status overview | `bash harness/run status` (or `/harness-status`) |
| Monthly harness scorecard | `/harness-audit` |
| Enter/complete verification | `bash harness/run advance` from build |
| Register review | `bash harness/run review docs/reviews/<feature>.md` |
| Complete closeout | `bash harness/run advance` from review |
| Clear local lifecycle state | `bash harness/run reset --confirm` |
| Schema-check feature_list manually | `node harness/lib/check-feature-list.mjs --evidence-required` |
| Session end | walk `CLEAN_STATE_CHECKLIST.md` |
| After a prompt / gate / model change | `node evals/run.mjs --tier smoke` — not during the sprint |

The factory is measured on three cadences: in-loop receipts (every sprint),
offline evals (harness changes only), fleet HTML in the generator observatory
(weekly / on demand). Do not run evals on every feature.

## When an agent should NOT use the harness

- Hot-fix work where speed dominates and the change is a single-file edit.
  The plan-template.md DoD column is enough.
- Documentation-only sessions. Don't need a smoke gate for editing
  `MANUAL.md`.
- The harness layer is opt-out; if your project genuinely doesn't benefit
  from a feature board/walker, remove it. Constitution boundaries and
  migration-oriented test baselines remain independently usable;
  boundaries-only partial adoption is valid.

## Further reading

- Anthropic Masterclass at Google Cloud Convention 2026 — source of the
  current calibration: do not overengineer the harness; preserve agent freedom
  inside the implementation loop; verify outcomes at the edges; maintain a
  best-practice eval suite for prompt/model/scaffold changes.
- [walkinglabs Lecture 02: What a harness actually is](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/)
- [walkinglabs Lecture 06: Initialize before every agent session](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-06-why-initialization-needs-its-own-phase/)
- [walkinglabs Lecture 07: Draw clear task boundaries](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-07-why-agents-overreach-and-under-finish/)
- [walkinglabs Lecture 08: Feature lists are harness primitives](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/)
- [walkinglabs Lecture 09: Why agents declare victory too early](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-09-why-agents-declare-victory-too-early/)
- [walkinglabs Lecture 10: End-to-end testing changes results](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-10-why-end-to-end-testing-changes-results/)
- [walkinglabs Lecture 12: Clean handoff at end of every session](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/)
- OpenAI: *Harness engineering: leveraging Codex in an agent-first world*.
