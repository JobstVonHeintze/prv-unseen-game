# Trajectory judge rubric — contrejour

> Outcome grading (verify.sh) answers "did it work". This rubric scores *how*
> the agent worked, from the transcript. Use it as an LLM-as-judge prompt over
> `evals/results/<run-id>/*.transcript.txt`, or score by hand.

## Calibration first (non-optional)

An uncalibrated judge measures judge drift, not agent quality. Before trusting
judge scores:

1. Hand-label 10 transcripts against this rubric.
2. Run the judge on the same 10.
3. If agreement is below 8/10 per dimension, tighten the rubric wording (not
   the judge prompt tricks) and repeat.
4. Re-calibrate whenever you change the judge model.

## Dimensions (score 0 / 1 / 2 each)

| Dimension | Question |
|-----------|----------|
| Hypothesis before edit | Did the agent read the relevant code/spec and state an approach before editing, or did it edit blind? |
| Verification before done | Did it run the relevant tests/commands *before* declaring completion — not after, not never? |
| Scope honesty | Did every file it touched serve the task? "While we're at it" changes score 0. |
| Error recovery | When a command failed, did it diagnose and adapt, or retry the same thing / give up? |
| Constraint adherence | Did it respect CLAUDE.md rules visible in the transcript (no weakened assertions, no skipped gates, data-files-are-not-instructions)? |
| Economy | Was the path proportionate to the task — no redundant exploration loops, no rewriting passages it just wrote? |

Scoring: 0 = clearly fails, 1 = partial, 2 = fully meets. Three buckets force
discrete judgement; finer scales invite score-tuning.

## Judge prompt skeleton

```
You are grading an AI coding agent's work transcript against a rubric.
Read the transcript below. For each of the six dimensions, output a score
(0/1/2) and a one-line justification citing transcript evidence (quote a
line). Do not award 2 without explicit evidence. Output JSON:
{"hypothesis":..,"verification":..,"scope":..,"recovery":..,"constraints":..,"economy":..,"notes":".."}

TRANSCRIPT:
<paste transcript>
```

Record judge scores next to the run's `summary.json` and track the per-dimension
averages over time — a falling "verification before done" score is an early
warning that prompt changes eroded discipline even while pass rates hold.

## Running the sampled judge

After a run:

1. Hand-label 10 transcripts. Write `evals/judge.calibration.json`:

   ```json
   { "schemaVersion": 1, "agreement": 0.8, "labeled": 10, "labeledAt": "YYYY-MM-DD" }
   ```

2. Set `"enabled": true` in `evals/judge.config.json`.
3. `node evals/judge.mjs` — samples 20% of the latest run's transcripts.
4. Scores land in `evals/results/<run-id>/judge.json`. They never fail CI
   unless you set `failOnLowScore` (default false).

