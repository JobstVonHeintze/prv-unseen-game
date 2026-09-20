# Learning: review gates cannot nest escaped quotes in workflow.yaml

- **Date:** 2026-09-20
- **Author:** learnings-writer
- **Scope:** `area:harness`
- **Status:** quarantined
- **Confidence:** unconfirmed
- **Uses:** 0
- **Last confirmed:** 2026-09-20
- **Supersedes:** N/A

## Trigger

`bash harness/run review docs/reviews/<file>.md` registers the artifact, then
the review-phase gate fails with
`grep: "docs/reviews/....md": No such file or directory` even though the file
exists.

## Lesson

`harness/run`'s purpose-built YAML parser strips only the outer quotes on a
`gate:` line. Inner `\"` stay in the command string. `eval` then passes a
filename that includes literal quote characters to `grep`.

Do not write review gates as
`grep -q \"boundaries.report.json\" \"$(harness/run review-path)\"`.
Use `harness/run assert-review-cites boundaries.report.json`, which greps
`$ROOT/$reviewArtifact`. The same trap applies to any workflow gate that
needs nested quotes.

A leftover loopback process on 8787/5173/5174 is a separate smoke failure:
health curl succeeds against the old server, but `/tmp/contrejour-api.log`
has no `127.0.0.1` bind line. `scripts/smoke.sh` now accepts a healthy
pre-existing loopback.

## Evidence (required)

- **Smoke/log/screenshot:** `bash harness/run review docs/reviews/2026-09-20-F-01.md`
  failed with `grep: "docs/reviews/2026-09-20-F-01.md": No such file` while
  the file existed and cited `harness/boundaries.report.json`.
- **Review/audit:** `docs/reviews/2026-09-20-F-01.md` — machine evidence
  already named the boundary report.
- **Test:** after `harness/run assert-review-cites` and the smoke bind
  fallback, `bash harness/run review …` then `advance` reached closeout
  (phase review OK, phase closeout OK).

## Promotion candidate

- [x] checklist item — already promoted: review gate calls
  `harness/run assert-review-cites`; smoke treats a healthy loopback as
  sufficient bind proof.
