#!/usr/bin/env node
// scripts/check-sync.mjs — drift-detection between CLAUDE.md and AGENTS.md.
//
// Why this file exists:
//   In a project that uses both Claude Code (reads CLAUDE.md) and
//   Cursor / Codex (reads AGENTS.md), a rule that lives in one file
//   but not the other silently produces inconsistent agent behaviour.
//   This script asserts that the canonical shared rules appear in both
//   files (modulo explicit exemption markers).
//
//   It does NOT auto-sync. It detects drift and reports it with WHY/FIX
//   lines. The fix is a human operation: add the rule to the missing
//   file (or mark it explicitly per-file with a sync-exempt marker).
//
// Exit codes:
//   0  -> in sync (or both files exist with all canonical rules present)
//   1  -> drift detected (printed BLOCKER lines)
//   2  -> setup error (missing one of the two files)
//
// Escape hatch:
//   To intentionally let a rule live in only one file, place this
//   comment in that file on its own line:
//       <!-- sync-exempt: <ruleId> -->
//   The rule is then ignored by the check for that file.
//
// Usage:
//   node scripts/check-sync.mjs           # check current directory
//   node scripts/check-sync.mjs <dir>     # check a specific directory

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.argv[2] || ".");
const CLAUDE_PATH = path.join(ROOT, "CLAUDE.md");
const AGENTS_PATH = path.join(ROOT, "AGENTS.md");

// ----------------------------------------------------------------------------
// Canonical shared rules. Pattern is matched case-insensitively against the
// file body (with sync-exempt lines pre-stripped). If `appliesTo` includes
// a side, the rule is required there.
//
// Adding a new rule: append an entry. Rule IDs are stable identifiers and
// also serve as the tag in `<!-- sync-exempt: <id> -->` markers.
// ----------------------------------------------------------------------------
const RULES = [
  {
    id: "wip-1",
    description: "WIP=1: only one feature in active progress at a time (Lecture 07)",
    pattern: /WIP=1|one feature in active progress|exactly one feature|one feature at a time|finish.{0,15}before.{0,15}start/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "evidence-required",
    description: "Evidence required for completion claims (Lecture 09)",
    pattern: /runnable evidence|claim completion without|do not claim completion|status=done.{0,40}without/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "no-refactor-mid-feature",
    description: "No refactor mid-feature (Lecture 09: completion priority)",
    pattern: /refactor unrelated|completion priority|no refactor.{0,15}mid|do not refactor/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "progress-log",
    description: "claude-progress.md is referenced as the per-session handoff",
    pattern: /claude-progress\.md/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "commit-policy",
    description: "Commit/push requires explicit user authorization or a human-authored auto policy",
    pattern: /commit (?:or|\/) push unless the user|commit\/push only when the user|autonomy.{0,40}does not grant commit/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "self-skip-live",
    description: "Live third-party tests self-skip when credentials are absent",
    pattern: /live third-party tests.{0,30}self-skip|self-skip.{0,30}credentials/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "policy-truth",
    description: "Policy/rules tables that define product truth are not mocked",
    pattern: /do not mock a policy|policy\/rules table.{0,30}not mocked/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "write-path-fixtures",
    description: "Fixtures must be producible by the real write path",
    pattern: /fixtures must be producible by the real write path|test fixtures.{0,20}real write path/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "generated-fallback",
    description: "Generated catalogs detect fallback/source-value leakage",
    pattern: /generated catalogs.{0,50}fallback|fallback\/source-value leakage/i,
    appliesTo: ["claude", "agents"],
  },
  {
    id: "agents-routes-to-claude",
    description: "AGENTS.md must reference CLAUDE.md (routing alias)",
    pattern: /\bCLAUDE\.md\b/,
    appliesTo: ["agents"],
  },
];

// ----------------------------------------------------------------------------
function readFileOrFail(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`BLOCKER: ${label} not found at ${p}`);
    console.error(`  WHY: this check requires both AGENTS.md and CLAUDE.md to detect sync drift`);
    console.error(`  FIX: re-scaffold or restore from templates: cp <generator>/templates/root/${path.basename(p)}.tpl ${p}`);
    process.exit(2);
  }
  return fs.readFileSync(p, "utf8");
}

function exemptRuleIds(body) {
  const ids = new Set();
  const re = /<!--\s*sync-exempt:\s*([a-z0-9-]+)\s*-->/gi;
  let m;
  while ((m = re.exec(body)) !== null) ids.add(m[1].toLowerCase());
  return ids;
}

function blocker(what, why, fix) {
  console.error(`BLOCKER: ${what}`);
  console.error(`  WHY: ${why}`);
  console.error(`  FIX: ${fix}`);
}

const claude = readFileOrFail(CLAUDE_PATH, "CLAUDE.md");
const agents = readFileOrFail(AGENTS_PATH, "AGENTS.md");

const claudeExempt = exemptRuleIds(claude);
const agentsExempt = exemptRuleIds(agents);

const failures = [];

for (const rule of RULES) {
  for (const side of rule.appliesTo) {
    const body = side === "claude" ? claude : agents;
    const exempt = side === "claude" ? claudeExempt : agentsExempt;
    if (exempt.has(rule.id)) continue;
    if (!rule.pattern.test(body)) {
      failures.push({ rule, side });
    }
  }
}

if (failures.length === 0) {
  console.log(`OK: CLAUDE.md and AGENTS.md in sync (${RULES.length} canonical rule(s) checked)`);
  process.exit(0);
}

console.error(`Sync drift between CLAUDE.md and AGENTS.md (${failures.length} rule(s) missing):`);
console.error("");

for (const { rule, side } of failures) {
  const sideName = side === "claude" ? "CLAUDE.md" : "AGENTS.md";
  blocker(
    `rule '${rule.id}' missing from ${sideName}`,
    rule.description,
    `add the rule to ${sideName}, OR add an explicit per-file exemption on its own line: <!-- sync-exempt: ${rule.id} -->`,
  );
  console.error("");
}

console.error(`See docs/harness-guide.md (or MANUAL.md § "Wie wir CLAUDE.md und AGENTS.md synchron halten") for the full mechanism.`);
process.exit(1);
