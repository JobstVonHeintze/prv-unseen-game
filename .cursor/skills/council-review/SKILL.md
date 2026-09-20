---
name: council-review
description: Run the model council on a draft plan from inside a Cursor session — keyless, via two reviewer subagents on independent frontier models — then reconcile the findings into the plan. Use whenever a docs/plans/*.md is drafted or materially revised. Requires the council layer (council/ directory) to be present.
disable-model-invocation: true
---

# In-session model council (Cursor transport)

Inside a Cursor session no API keys are needed: spawn the reviewers as
subagents on the user's subscription. This transport is equivalent to
`node council/run-council.mjs <plan>` (the headless/CI transport) and
produces the same artifacts. Read `council/README.md` first; if your project
defines data rules there (e.g. plans only, never customer/person data), they
apply to both transports.

## Protocol

1. **Spawn two reviewer subagents in parallel** (one message, two Task
   calls, `run_in_background: false`):
   - Pick two strong, INDEPENDENT models (different vendors) from the
     session's available subagent models — e.g. a Grok frontier tier and a
     GPT frontier tier. Independence is the point: same-vendor pairs
     correlate their blind spots.
   - Each prompt must be self-contained (subagents don't see the chat):
     reviewer label; repo path; the plan path under review; instruction to
     read `docs/templates/council-review-template.md` (rubric),
     the constitution/spec files, `harness/feature_list.json` (current
     feature state), and `scripts/smoke.sh`; review focus (scope realism,
     coverage, DoD falsifiability, architecture fit, missing risks,
     sequencing); format ("what a 10/10 looks like" + scores per dimension
     with one concrete edit each + prioritized Critical/High/Medium edit
     list + verdict APPROVE / APPROVE-WITH-EDITS / REVISE; ≤120 lines).
   - **HARD RULE in every prompt:** write-free — the subagent must not
     create/modify/delete files or run mutating commands; its final response
     IS the review.
2. **Write the artifacts** (the driving agent writes; reviewers never do):
   - `docs/reviews/council/<YYYY-MM-DD>-<plan-basename>-insession/council-summary.md`
     — status, verdicts + scores, consensus findings, split findings with
     reconciliation, escalated items, subagent ids.
   - `raw/<reviewer>.stdout.md` in the same dir (keep raw out of version
     control if the project gitignores it).
   - The dir name must contain the plan basename so gates can match on it.
3. **Reconcile:** auto-adopt concrete, evidence-backed fixes; escalate only
   genuine judgment calls (scope, product trade-offs, irreversible choices)
   to the human per the autonomy dial (CLAUDE.md §3). Update the plan in
   place — keep `Status: draft` until human approval — and reference the
   council summary in the plan header.
4. **Repeated findings become evals** — if the council catches the same
   weakness twice, harvest it via `/eval-harvest`.

## When to use which transport

- Cursor session open → this skill (keyless; subagents may read the repo).
- Headless / CI / other editors → `node council/run-council.mjs <plan>`
  (needs the API keys configured in `council/council.config.json`).
