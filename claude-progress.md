# claude-progress.md — contrejour

> **What this file is.** A per-session, append-only handoff log between
> consecutive AI coding-agent sessions. It is **not** a sprint review
> (those live in `docs/reviews/`) and **not** a plan (those live in
> `docs/plans/`). It is the smaller, faster artefact that makes the
> *next* session pick up exactly where this one left off.
>
> **Why this file exists.** The single biggest reliability lever on
> multi-session agentic work is a structured handoff. Without one, every
> new session re-derives state from scratch, re-reads the same files,
> and re-makes the same micro-decisions. With one, the next session
> opens this file first and knows three things in ten seconds: what
> got done, what's still red, what to pick up first. Concept adopted
> from [walkinglabs harness-engineering Lecture 12](https://github.com/walkinglabs/learn-harness-engineering).
>
> **Format rules.**
>
> 1. Append-only. Never edit a previous entry. If a previous entry was
>    wrong, write a new entry that says so.
> 2. One entry per session. Header `## YYYY-MM-DDTHH:MM:SSZ — <agent or human> — <one-line summary>`.
> 3. Three bullet groups under each entry: **done**, **red**, **next**.
> 4. Keep each entry to ~3–10 lines. Detail belongs in `docs/plans/` or
>    `docs/reviews/` — this file is the *index*, not the body.
> 5. The first entry is seeded by the scaffolder so the file is never
>    empty (an empty file has no signal value).
> 6. Rotation: when this file exceeds ~40 entries, move all but the newest
>    10 verbatim to `docs/progress-archive/<YYYY>-Q<N>.md` (create the folder
>    on first rotation). Entries stay immutable — rotation moves, never
>    rewrites. The newest entries always stay here, so reading the handoff
>    at session start stays a cheap, constant-size read.

---

## 2026-09-20T08:20:00Z — agent — F-01 walking skeleton playable; smoke green

- **done:** Part I engine + `/v1/` API + Player (5173) + Console (5174). 22 tests pass. `bash scripts/smoke.sh` ok. Drifter hits g1–g7 by date; progress can fire g6 before day 16. Browser: start run, play first night, flag romance-gap L2, lobby audio-drop marks s01, Console shows the finding on g1, storyboard prompt history, hidden state.
- **red:** none for F-01 verify. Plan is `review`. No commit (not asked).
- **next:** sprint-review F-01; then F-02 authoring/proposals if accepted. `pnpm dev` serves API + both surfaces on loopback.

## 2026-09-20T00:00:00Z — scaffolder — initial scaffold complete

- **done:** scaffolded project `contrejour` with `create-spec-kit`; layers enabled: specKit, constitution, sprint, contractTests, ui, manual, audits, github, hooks, harness, compound, evals, council, cursorSkills.
- **red:** none. Starter `BOOTSTRAP.md` was skipped by choice.
- **next:** read `MANUAL.md`, then read `CLAUDE.md`; optionally run the bootstrap skill later if you want AI-assisted product calibration.

## 2026-09-20T08:35:00Z — agent — F-01 closed; next session starts F-02

- **done:** F-01 verify + review + closeout. Smoke 22/22. Review `docs/reviews/2026-09-20-F-01.md` (11/12 Accept). Plan `docs/plans/2026-09-20-part-i-walking-skeleton.md` Status: done. Harness reset to init. F-02 queued `not_started`. Learning: `docs/learnings/2026-09-20-review-gate-no-nested-yaml-quotes.md`.
- **red:** none. No commit (`commit: ask`; `main` has no first commit yet). Ignore any firefighting/Kalt paste — not this repo.
- **next:** fresh session: `bash init.sh`, then `bash harness/run start F-02` (canon proposals + diff + approve/reject). Do not implement F-02 in the F-01 session.

## 2026-09-20T18:18:00Z — agent — F-03 closed; writer drop-in live; next session starts F-02

- **done:** F-03 verify + review + closeout. 17 files / 31 tests. `bash scripts/smoke.sh` ok. Review `docs/reviews/2026-09-20-F-03.md` (12/12 Accept). Plan `docs/plans/2026-09-20-incidents-and-conditions.md` Status: done. Harness reset to init. Writer path: YAML `{ start_incident }` / `{ enter }` / `{ bank }` on any choice or secret use; Console lists conditions and incidents. Learning: `docs/learnings/2026-09-20-writer-follow-through-on-effects.md`.
- **red:** none. No commit (`commit: ask`; `main` has no first commit yet). F-04 (playable Tilde VIP night) stays `not_started`.
- **next:** fresh session: `bash init.sh`, then `bash harness/run start F-02` (canon proposals). Do not start F-02 or F-04 in this session.

## 2026-09-20T20:44:00Z — agent — F-02 closed; owner asked commit+push

- **done:** F-02 proposals: diff + validation on POST, write on approve, reason on reject, Player allowlist unchanged. 19 files / 34 tests. `bash scripts/smoke.sh` ok. Review `docs/reviews/2026-09-20-F-02.md`. Plan `docs/plans/2026-09-20-canon-proposals.md` Status: done. Learning: `docs/learnings/2026-09-20-proposals-copy-canon-in-tests.md`.
- **red:** none. First commit `c372002` pushed to `origin/main`.
- **next:** after push, fresh session may start F-04 or the entity editor. Do not start them in this closeout.



