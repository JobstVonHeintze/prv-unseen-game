# Hidden eval set

Tasks in this directory are the **held-out set**:

- They are loaded only by `node evals/run.mjs --tier hidden`.
- They are **never** used to iterate on prompts, CLAUDE.md, or the scaffold.
  If you looked at a hidden task while debugging a prompt, move it to
  `evals/tasks/` and write a replacement here.
- Agent runtimes are denied read access to this directory
  (see `.claude/settings.json`).
- Refresh quarterly: retire tasks into the visible set, add new ones from
  recent post-mortems.

Run the hidden tier before model swaps and major scaffold revisions — its
job is to catch a scaffold that has overfitted to the visible tasks.

Task format is identical to `evals/tasks/` (see `evals/README.md`).
