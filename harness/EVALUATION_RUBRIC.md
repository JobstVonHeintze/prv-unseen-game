# Evaluation Rubric — contrejour

> Used by the sprint-reviewer (and any independent reviewer agent or human)
> after implementation, before final acceptance. The worker/checker separation
> and "evaluate outcomes, not vibes" posture follow the Anthropic Masterclass
> at Google Cloud Convention 2026 guidance: don't over-control the worker loop,
> but do make evaluation reproducible. Adopted from
> [walkinglabs harness-engineering Lecture 11](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-11-why-observability-belongs-inside-the-harness/)
> ("evaluator rubric makes evaluation reproducible") and the canonical
> [evaluator-rubric template](https://walkinglabs.github.io/learn-harness-engineering/en/resources/templates/evaluator-rubric).

## Why this exists

Anthropic's 2026 research, discussed in the harness-engineering material and
consistent with the masterclass guidance, found that when an agent
evaluates its own work, it systematically gives overly positive
evaluations — even when a human observer would consider quality
substandard. The same model generating *and* evaluating is structurally
biased toward leniency.

The fix isn't to train the agent to be more critical. The fix is to
**separate the worker from the checker** and give the checker a structured
rubric so different evaluators (human or agent) reach similar conclusions
on the same output.

This file is that rubric.

## When to use

- After the sprint-runner reports Checkpoint 2 done, before invoking the
  sprint-reviewer.
- During code review on a PR (human or agent).
- Periodically (monthly) on a sample of recently-shipped features to spot
  drift.

## The rubric

For each category, score 0 / 1 / 2:

- **0** — clearly fails the criterion
- **1** — partially meets, has known gaps
- **2** — fully meets

| Category | Question | Score | Notes |
|----------|----------|-------|-------|
| Correctness | Does the implemented behavior match the requested feature? Does it match the `user_behavior` field in `harness/feature_list.json`? | / 2 | |
| Verification | Did the required `verification_commands` actually run, with matching evidence entries (kind=test_run / smoke_run, exact ref)? | / 2 | |
| Scope discipline | Did the session stay inside the chosen feature scope? Or did it sneak in unrelated refactors / "while we're at it" changes? (Lecture 07: WIP=1.) | / 2 | |
| Reliability | Does the result survive restart or rerun without manual repair? Can the next agent run `bash init.sh` and continue? | / 2 | |
| Maintainability | Is the code and documentation clear enough for the next session? Comments explain *why* (not what). No dead code. | / 2 | |
| Handoff readiness | Can a fresh session continue work from repo artefacts only? `claude-progress.md` updated, `feature_list.json` reflects truth, no chat-context dependency. (Lecture 12.) | / 2 | |

**Total: ___ / 12**

## Forcing function: describe the 10, then close the gap

Borrowed from gstack's per-persona reviews. For any category you score **0 or
1**, don't stop at the number — **state what a 2 (a "10") would look like**, then
name the concrete edit that gets there. The score says *where you are*; the
"what good looks like" says *where to go*. "Maintainability: 1" is noise;
"Maintainability: 1 — a 2 has no dead code and a `why` comment on the retry
loop; delete the commented block and document the backoff" is actionable. This
keeps the 0/1/2 scale honest without inflating it to a finer grain.

## Grounding questions

Before accepting a feature, answer these from repository evidence:

- What exact user behavior changed, and where is that behavior specified?
- Which command proves the behavior works now?
- Which files or feature-list entries prove the scope did not expand?
- If the next session starts fresh, what file tells it the current state?
- What would fail if the claimed completion were false?

## Verdict

| Total | Verdict | Action |
|-------|---------|--------|
| 11–12 | **Accept** | Merge / mark feature complete. |
| 8–10 | **Revise** | List required fixes; agent re-runs the failed dimensions. |
| 0–7 | **Block** | Do not merge. Roll the feature back to `in_progress`. Open a follow-up plan. |

## Why score 0 / 1 / 2 (and not finer)?

Finer grain (e.g. 0–10) tempts evaluators to tune scores to land in a
preferred bucket. Three buckets force a discrete judgement: clearly bad,
mixed, clearly good. Different evaluators converge faster on the same
verdict.

## Required follow-up section

If verdict is **Revise** or **Block**, fill these:

- **Missing evidence:** _what evidence entries should have been there_
- **Required fixes:** _what must change before re-review_
- **Next review trigger:** _what command must exit 0 to trigger another review_

## How this rubric integrates with the rest of the harness

```
                  feature implemented
                          |
                          v
                +-----------------+
                |  sprint-runner  |
                |  Phase 2 done   |
                +-----------------+
                          |
                          v
                +-----------------+
                | harness/run     |
                | advance -> verify| <-- machine gate
                +-----------------+
                          |
                          v
                +-----------------+
                | sprint-reviewer |
                | walks this      | <-- structured human/agent gate
                | rubric          |
                +-----------------+
                          |
                  Accept  | Revise / Block
                          |
                          v
                  feature -> done
```

The machine gate is necessary but not sufficient. The rubric is the
sufficient layer.
