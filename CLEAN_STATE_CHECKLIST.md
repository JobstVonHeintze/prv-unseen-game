# Clean State Checklist — contrejour

> Walk this checklist **before** ending a coding session. Adopted from
> [walkinglabs harness-engineering Lecture 12](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/)
> ("clean handoff at the end of every session"). The next session's
> success depends on this session's exit state.

## Why this exists

The biggest single cause of next-session diagnostic time is the previous
session leaving the repo in an undocumented half-finished state. When that
happens:

- The new agent spends the first ~30 minutes inferring "what did the last
  session actually do?".
- Stale artefacts (debug logs, commented-out code, half-deleted files)
  create cognitive load that compounds over weeks.
- "I'll clean up next time" almost never happens, because the next session
  has its own task to do, not yours to clean up.

Lehman's laws of software evolution: systems undergoing continuous change
inevitably grow in complexity unless actively managed. This checklist is
the active management.

## The five dimensions of clean state

A session is **only complete** when all five dimensions check out:

- [ ] **Build dimension** — the project builds without errors. The next
      session must not first fix a build error you left behind.
- [ ] **Test dimension** — all tests pass, including ones that existed
      before this session. You are responsible for not breaking what was
      already green.
- [ ] **Progress dimension** — current state is recorded in
      `claude-progress.md` (kernel) AND `harness/feature_list.json` (harness).
      A new session must be able to pick up exactly where this one stopped
      from repo artifacts alone — no chat context required.
- [ ] **Artifact dimension** — no debug logs, `console.log`/`debugger`,
      commented-out code, or stale temp files remain. Search and remove.
- [ ] **Startup dimension** — the standard startup path still works. A
      new session must be able to run `bash init.sh`
      and reach a working state without manual repair.

## Concrete commands to run

```bash
# Dimensions 1 + 2 — project-owned build/tests
bash scripts/smoke.sh

# Dimension 3 — progress recorded
test -f claude-progress.md && tail -20 claude-progress.md
node harness/lib/check-feature-list.mjs --evidence-required

# Dimension 4 — no debug residue
if [ -d "apps/player" ]; then rg -n 'console\.log|debugger|breakpoint\(\)|fmt\.Println' "apps/player" && echo "BLOCKER: review debug residue under apps/player"; fi
if [ -d "apps/console" ]; then rg -n 'console\.log|debugger|breakpoint\(\)|fmt\.Println' "apps/console" && echo "BLOCKER: review debug residue under apps/console"; fi
if [ -d "packages/api" ]; then rg -n 'console\.log|debugger|breakpoint\(\)|fmt\.Println' "packages/api" && echo "BLOCKER: review debug residue under packages/api"; fi

# Dimension 5 — startup path
bash init.sh   # must exit 0
```

## What to do when a dimension fails

| Dimension | What it means | What to do |
|-----------|---------------|------------|
| Build red | The next session will spend 20+ min on infra | Fix it, or revert this session's changes |
| Tests red | You broke something already green | Fix it, or revert; do **not** mark the feature complete |
| Progress missing | Next session re-derives state from chat (which is gone) | Append a `claude-progress.md` entry now |
| Artifacts dirty | Cognitive load compounds | Delete debug code, log files, commented-out blocks |
| Startup broken | Next session cannot even start | Fix; this is the highest-priority failure |

## Session context handoff (operator step)

The five dimensions above cover **repository** state. The final step covers
the **session** itself:

- [ ] Progress entry written — then **end the session**. The next task
      cold-starts from repo artifacts (`claude-progress.md`, plans, reviews),
      not from this conversation.
- [ ] Never carry one task's context into the next: stale context is re-sent
      on every turn and buries the new task's signal.
- [ ] End the editor session as the last act: rename it first if you may want
      it back later. Command cheat sheet: `MANUAL.md` § Session economics.

## The "clean up later" trap

Every session has its own task to do. The next session is there to do
*new work*, not to clean up *your work*. A repo that accumulates
half-finished sessions becomes unmaintainable in weeks, not months.

Lecture 12 cites a real measurement: same project, with vs. without
clean-state discipline, after 12 weeks:

| Metric | Without | With |
|--------|---------|------|
| Build pass rate | 68% | 97% |
| Test pass rate | 61% | 95% |
| New-session startup time | 60+ min | 9 min |
| Stale artefacts in repo | 103 | 11 |

This is the difference clean state makes.

## Periodic cleanup loop (in addition to per-session)

Once a week (or once per sprint), do a deeper cleanup:

- Run the full test suite from a fresh clone.
- Audit `docs/plans/` statuses and links; keep paths stable for review/decision
  references.
- Audit `docs/decisions/` for entries that became obsolete.
- Rotate `claude-progress.md` if oversized (see its format rule 6): archive
  all but the newest entries to `docs/progress-archive/`.
- Run `@quality-auditor` and `@security-auditor` for systematic findings.
- Update `QUALITY_SCORE.md`. New letter drops trigger follow-up plans.
- Audit `harness/feature_list.json`: any feature stuck in `blocked` for >2 sprints should either get unblocked or be moved to `abandoned`.

## Periodic harness simplification

Lecture 12 makes a sharper point: as model capabilities improve, harness
constraints that were essential six months ago may now be unnecessary
overhead. Once a month:

1. Run `/harness-audit` and identify the lowest-scoring subsystem.
2. Pick one harness component to test (e.g. a slash command, a check, a layer).
3. Temporarily disable or narrow it in a branch.
4. Run a representative benchmark task through the agent.
5. If results don't degrade: remove the component permanently.
6. If they do: keep it, document the dependency.

This is the opposite of the usual instinct ("add more rules"); it's
deliberate harness debt reduction.

## Quarterly agent-configuration review

Every 3 months, one named DRI reviews the agent setup:

1. Root and local `CLAUDE.md` files: remove stale rules, keep local context
   local, and promote repeated discoveries into durable guidance.
2. `.claude/agents/` and any installed skills: keep specialized expertise
   on-demand instead of bloating the root context.
3. Hooks, MCP servers, and `.claude/settings.json`: confirm permissions, deny
   rules, and external tools still match current team practice.
4. Recurring review comments: turn them into a local context note, a skill, a
   hook, a smoke check, or a checklist item.

The DRI is not a bureaucracy role; it is a garbage-collection role for agent
context.
