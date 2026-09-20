#!/usr/bin/env node
// Validate harness/feature_list.json against the schema in
// harness/feature_list.schema.json. Zero runtime dependencies.
//
// Exit codes:
//   0 — valid
//   1 — invalid (prints structured BLOCKER: lines)
//   2 — file missing
//
// Flags:
//   --evidence-required   reject features with status=done that have empty
//                         evidence[] or whose verification_commands have no
//                         matching evidence entry.
//
// This is the only script that mutates the *interpretation* of the schema.
// The .schema.json file documents the contract; this file enforces it.
//
// Adopted from walkinglabs harness-engineering Lecture 08 (machine-readable
// scope), with the evidence-cross-check pattern from Lecture 09 (no
// declaring victory early).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Use fileURLToPath, NOT `new URL(import.meta.url).pathname`. The latter
// returns URL-encoded paths (e.g. "weird%20(path)" for a directory that
// actually exists on disk as "weird (path)"), so any project living under
// a path with spaces, parens, or other URL-reserved characters breaks the
// schema check.
const here = path.dirname(fileURLToPath(import.meta.url));
const FEATURE_LIST = path.resolve(here, "..", "feature_list.json");
const evidenceRequired = process.argv.includes("--evidence-required");

const STATUSES = new Set(["not_started", "in_progress", "blocked", "done", "abandoned"]);
const PRIORITIES = new Set(["P0", "P1", "P2"]);
const EVIDENCE_KINDS = new Set(["commit", "test_run", "smoke_run", "screenshot", "log"]);
const ID_RE = /^F-[0-9]{2,4}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const PLACEHOLDER_COMMAND_RE = /(?:<[^>]+>|\bTODO\b|replace this|edit verification|your (?:command|test))/i;
const NO_OP_COMMAND_RE = /^(?:true|:|exit\s+0|echo\b[^|;&]*|printf\b[^|;&]*)$/i;

// Agent-friendly BLOCKER format adopted from walkinglabs Lecture 09 / 10:
// emit `BLOCKER: <what>` followed by `  WHY: <why>` and `  FIX: <how>` so
// the reading agent can self-correct without humans translating the
// failure mode for them.
function blocker(what, why, fix) {
  console.error(`BLOCKER: ${what}`);
  if (why) console.error(`  WHY: ${why}`);
  if (fix) console.error(`  FIX: ${fix}`);
}

function readJSON(p) {
  if (!fs.existsSync(p)) {
    blocker(
      `missing file ${p}`,
      `the validator can only verify feature_list.json if it exists at the canonical path`,
      `create it from the template: cp templates/harness/feature_list.json.tpl ${p} (or re-add the harness layer: npx create-spec-kit shell . --command '/add harness')`,
    );
    process.exit(2);
  }
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) {
    blocker(
      `${p}: invalid JSON — ${e.message}`,
      `feature_list.json is not parseable as JSON`,
      `open ${p} and fix the syntax error at the location named in the error message; try \`node -e "JSON.parse(require('fs').readFileSync('${p}','utf8'))"\` to repro`,
    );
    process.exit(1);
  }
}

// `reasons` may be either an array of strings (legacy) or an array of
// {what, why, fix} objects. We accept both.
function fail(reasons) {
  for (const r of reasons) {
    if (typeof r === "string") blocker(r);
    else blocker(r.what, r.why, r.fix);
  }
  process.exit(1);
}

function validateTopLevel(doc) {
  const reasons = [];
  if (typeof doc !== "object" || doc === null) reasons.push("root is not an object");
  if (doc.schemaVersion !== 1) reasons.push(`schemaVersion must be 1, got ${JSON.stringify(doc.schemaVersion)}`);
  if (typeof doc.project !== "string" || doc.project.length === 0) reasons.push("project must be a non-empty string");
  if (!Array.isArray(doc.features)) reasons.push("features must be an array");
  return reasons;
}

function validateFeature(f, ix) {
  const reasons = [];
  const where = `features[${ix}]`;
  if (typeof f !== "object" || f === null || Array.isArray(f)) {
    return [`${where}: must be an object`];
  }
  for (const k of ["id", "title", "priority", "area", "user_behavior", "verification_commands", "evidence", "status", "blocker", "owner", "created_at", "updated_at"]) {
    if (!(k in f)) reasons.push(`${where}: missing required field '${k}'`);
  }
  if (typeof f.id === "string" && !ID_RE.test(f.id)) reasons.push(`${where}: id '${f.id}' must match /^F-[0-9]{2,4}$/`);
  if (typeof f.title === "string" && f.title.length === 0) reasons.push(`${where}: title must be non-empty`);
  if (typeof f.priority === "string" && !PRIORITIES.has(f.priority)) reasons.push(`${where}: priority '${f.priority}' must be one of P0|P1|P2`);
  if (typeof f.area === "string" && f.area.length === 0) reasons.push(`${where}: area must be non-empty`);
  if (typeof f.user_behavior === "string" && f.user_behavior.length === 0) reasons.push(`${where}: user_behavior must be non-empty`);
  if (!Array.isArray(f.verification_commands)) {
    reasons.push(`${where}: verification_commands must be an array`);
  } else if (f.verification_commands.length === 0) {
    reasons.push(`${where}: verification_commands must have ≥1 entry`);
  } else {
    f.verification_commands.forEach((command, ci) => {
      const commandWhere = `${where}.verification_commands[${ci}]`;
      if (typeof command !== "string" || command.trim().length === 0) {
        reasons.push(`${commandWhere}: must be a non-empty shell command`);
        return;
      }
      const normalized = command.trim().replace(/\s+/g, " ");
      if (PLACEHOLDER_COMMAND_RE.test(normalized) || NO_OP_COMMAND_RE.test(normalized)) {
        reasons.push(`${commandWhere}: '${command}' is a placeholder/no-op, not falsifiable verification`);
      }
    });
  }
  if (typeof f.status === "string" && !STATUSES.has(f.status)) reasons.push(`${where}: status '${f.status}' must be one of ${[...STATUSES].join("|")}`);
  if (f.status === "blocked") {
    if (typeof f.blocker !== "string" || f.blocker.trim().length === 0) {
      reasons.push(`${where}: status=blocked requires a non-empty blocker`);
    }
  } else if (f.blocker !== null && f.blocker !== "") {
    reasons.push(`${where}: blocker must be null/empty unless status=blocked`);
  }
  if (typeof f.owner === "string" && f.owner.length === 0) reasons.push(`${where}: owner must be non-empty`);
  for (const k of ["created_at", "updated_at"]) {
    if (typeof f[k] === "string" && !ISO_RE.test(f[k])) reasons.push(`${where}: ${k} '${f[k]}' is not ISO-8601 UTC`);
  }
  if (
    typeof f.created_at === "string" && ISO_RE.test(f.created_at)
    && typeof f.updated_at === "string" && ISO_RE.test(f.updated_at)
    && Date.parse(f.updated_at) < Date.parse(f.created_at)
  ) {
    reasons.push(`${where}: updated_at must not be earlier than created_at`);
  }
  if (Array.isArray(f.evidence)) {
    f.evidence.forEach((e, ei) => {
      const w = `${where}.evidence[${ei}]`;
      if (typeof e !== "object" || e === null) { reasons.push(`${w}: not an object`); return; }
      if (!EVIDENCE_KINDS.has(e.kind)) reasons.push(`${w}: kind '${e.kind}' must be one of ${[...EVIDENCE_KINDS].join("|")}`);
      if (typeof e.ref !== "string" || e.ref.length === 0) reasons.push(`${w}: ref must be non-empty string`);
      if (typeof e.ts !== "string" || !ISO_RE.test(e.ts)) reasons.push(`${w}: ts '${e.ts}' is not ISO-8601 UTC`);
    });
  }
  return reasons;
}

function validateFeatureSet(features) {
  const reasons = [];
  const seen = new Map();
  const active = [];

  features.forEach((feature, ix) => {
    if (typeof feature !== "object" || feature === null || Array.isArray(feature)) return;
    if (typeof feature.id === "string") {
      if (seen.has(feature.id)) {
        reasons.push({
          what: `duplicate feature id '${feature.id}' at features[${seen.get(feature.id)}] and features[${ix}]`,
          why: "feature ids are stable joins for plans, reviews, state, and evidence; duplicates make the active work item ambiguous",
          fix: "assign a new unused F-NN id to one row; never recycle an existing id",
        });
      } else {
        seen.set(feature.id, ix);
      }
    }
    if (feature.status === "in_progress") active.push(feature.id || `features[${ix}]`);
  });

  if (active.length > 1) {
    reasons.push({
      what: `WIP=1 violated: ${active.length} features are in_progress (${active.join(", ")})`,
      why: "the harness can bind its lifecycle and review evidence to only one active feature",
      fix: "finish, block, or return all but one feature to not_started before continuing",
    });
  }

  return reasons;
}

// Evidence kinds whose `ref` is a command line that can be matched against a
// verification_command. For other kinds (commit SHA, screenshot path, log
// path) the ref is not a command and matching by string would be meaningless.
const COMMAND_EVIDENCE_KINDS = new Set(["test_run", "smoke_run"]);

// Normalize whitespace so trailing/leading spaces and inner runs don't break
// equality. We deliberately do NOT do substring matching: a permissive
// matcher (e.g. `r.includes(cmd) || cmd.includes(r)`) lets a generic
// verification_command satisfy a specific evidence ref (or vice versa),
// which defeats the anti-tampering mechanism. Exact equality after
// whitespace normalisation is the strictest defensible rule.
function normalizeCommand(s) {
  return String(s).trim().replace(/\s+/g, " ");
}

function validateEvidenceCompleteness(features) {
  const reasons = [];
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    if (f.status !== "done") continue;
    if (!Array.isArray(f.evidence) || f.evidence.length === 0) {
      reasons.push({
        what: `features[${i}] (${f.id}) status=done but evidence is empty`,
        why:  `agents cannot declare victory early — every "done" feature must carry at least one evidence entry proving the verification ran (walkinglabs Lecture 09)`,
        fix:  `revert status to "in_progress", run the verification_commands, append matching test_run / smoke_run evidence entries (with kind, ref, ts), then mark done`,
      });
      continue;
    }
    const cmds = Array.isArray(f.verification_commands) ? f.verification_commands : [];
    if (cmds.length > 0) {
      const commandRefs = new Set(
        f.evidence
          .filter((e) => COMMAND_EVIDENCE_KINDS.has(e.kind))
          .map((e) => normalizeCommand(e.ref)),
      );
      const missing = cmds.filter((cmd) => !commandRefs.has(normalizeCommand(cmd)));
      if (missing.length > 0) {
        const noCommandKindEvidence = commandRefs.size === 0;
        reasons.push({
          what: `features[${i}] (${f.id}) status=done but verification_commands have no matching evidence: ${missing.join(", ")}`,
          why:  noCommandKindEvidence
            ? `the evidence array contains only commit/screenshot/log entries, not test_run or smoke_run — non-command evidence kinds can't prove a command ran`
            : `each verification_command must equal (after whitespace normalisation) the ref of a test_run or smoke_run evidence entry; substring matches are rejected to prevent fabrication`,
          fix:  `run each missing command exactly as written, then append an evidence entry like { "kind": "test_run", "ref": "<exact command>", "ts": "<ISO 8601 UTC>" }`,
        });
      }
    }
  }
  return reasons;
}

const doc = readJSON(FEATURE_LIST);
const top = validateTopLevel(doc);
if (top.length > 0) fail(top);

const feat = (doc.features || []).flatMap((f, i) => validateFeature(f, i));
if (feat.length > 0) fail(feat);

const setReasons = validateFeatureSet(doc.features);
if (setReasons.length > 0) fail(setReasons);

if (evidenceRequired) {
  const ec = validateEvidenceCompleteness(doc.features);
  if (ec.length > 0) fail(ec);
}

console.log(`OK: ${doc.features.length} feature(s) valid${evidenceRequired ? " (evidence-cross-checked)" : ""}.`);
