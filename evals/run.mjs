#!/usr/bin/env node
// evals/run.mjs — outcome + trajectory eval runner for the agent harness.
//
// What it does, per task and per sample:
//   1. Clones the repo at HEAD into a temp workspace (agent never sees evals/).
//   2. Overlays the task's fixture/ files (if any) and commits the baseline.
//   3. Runs the configured headless agent with the task prompt.
//   4. Collects trajectory metrics (duration, diff size, files outside scope).
//   5. Runs the task's hidden verify/verify.sh against the workspace.
//   6. Records a JSONL row with full config provenance.
//
// Usage:
//   node evals/run.mjs --tier smoke            # fast gate (scaffold/prompt changes)
//   node evals/run.mjs --tier full             # nightly
//   node evals/run.mjs --tier hidden           # held-out set (before model swaps)
//   node evals/run.mjs --task T-002-scope-honeypot --samples 3
//   node evals/run.mjs --list                  # show tasks without running
//
// Exit code: 0 if every executed tier meets its gate in evals.config.json.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(EVALS_DIR, "..");

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);

// Runs cost real money: unknown flags (or --help) must NEVER fall through
// into a default full run. Learned 2026-09-03: `--help` silently started a
// paid smoke-tier run in a downstream project.
const KNOWN_FLAGS = new Set(["--tier", "--task", "--samples", "--list", "--help", "-h"]);
const USAGE = `Usage:
  node evals/run.mjs --tier smoke            # fast gate (scaffold/prompt changes)
  node evals/run.mjs --tier full             # nightly
  node evals/run.mjs --tier hidden           # held-out set (before model swaps)
  node evals/run.mjs --task T-002-scope-honeypot --samples 3
  node evals/run.mjs --list                  # show tasks without running`;
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
{
  const unknown = argv.filter((a) => a.startsWith("-") && !KNOWN_FLAGS.has(a));
  if (unknown.length > 0) {
    console.error(`Unknown flag(s): ${unknown.join(", ")}\n${USAGE}`);
    process.exit(1);
  }
}

function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const TIER = flag("tier", "smoke");          // smoke | full | hidden | all
const ONLY_TASK = flag("task", null);
const SAMPLES_OVERRIDE = flag("samples", null);
const LIST_ONLY = argv.includes("--list");

// ---------------------------------------------------------------- config
const config = JSON.parse(fs.readFileSync(path.join(EVALS_DIR, "evals.config.json"), "utf8"));

// ---------------------------------------------------------------- tasks
function loadTasks() {
  const dirs = [path.join(EVALS_DIR, "tasks")];
  if (TIER === "hidden" || TIER === "all") dirs.push(path.join(EVALS_DIR, "hidden"));
  const tasks = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(dir, entry.name, "task.json");
      if (!fs.existsSync(file)) continue;
      const task = JSON.parse(fs.readFileSync(file, "utf8"));
      task._dir = path.join(dir, entry.name);
      tasks.push(task);
    }
  }
  return tasks
    .filter((t) => t.status !== "template")
    .filter((t) => ONLY_TASK ? t.id === ONLY_TASK : true)
    .filter((t) => {
      if (ONLY_TASK || TIER === "all") return true;
      return t.tier === TIER;
    });
}

// ---------------------------------------------------------------- helpers
const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", ...opts }).trim();

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function evalSetHash(tasks) {
  const blob = tasks
    .map((t) => fs.readFileSync(path.join(t._dir, "task.json"), "utf8"))
    .sort()
    .join("\n");
  return sha256(blob);
}

function provenance(tasks) {
  let repoHead = "unknown", dirty = false;
  try {
    repoHead = sh("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT });
    dirty = sh("git", ["status", "--porcelain"], { cwd: REPO_ROOT }).length > 0;
  } catch { /* not fatal */ }
  let claudeMdSha = "missing";
  const claudeMd = path.join(REPO_ROOT, "CLAUDE.md");
  if (fs.existsSync(claudeMd)) claudeMdSha = sha256(fs.readFileSync(claudeMd));
  return {
    timestamp: new Date().toISOString(),
    repoHead, repoDirty: dirty,
    claudeMdSha256: claudeMdSha,
    evalSetHash: evalSetHash(tasks),
    agentCommand: config.agent.command.join(" "),
    model: config.agent.model ?? "unspecified",
    node: process.version,
  };
}

// Clean clone of HEAD; evals/ stripped so the agent can never read graders,
// other tasks, or the hidden set. Fixture overlays on top, then a baseline
// commit so diff metrics measure only what the agent changed.
function makeWorkspace(task, sampleDir) {
  const ws = path.join(sampleDir, "workspace");
  sh("git", ["clone", "--quiet", "--local", "--no-hardlinks", REPO_ROOT, ws]);
  fs.rmSync(path.join(ws, "evals"), { recursive: true, force: true });
  const fixture = path.join(task._dir, "fixture");
  if (fs.existsSync(fixture)) {
    fs.cpSync(fixture, ws, { recursive: true });
  }
  const git = (args) => sh("git", args, {
    cwd: ws,
    env: { ...process.env, GIT_AUTHOR_NAME: "evals", GIT_AUTHOR_EMAIL: "evals@local",
           GIT_COMMITTER_NAME: "evals", GIT_COMMITTER_EMAIL: "evals@local" },
  });
  git(["add", "-A"]);
  try { git(["commit", "--quiet", "-m", "eval baseline (fixture overlay)"]); } catch { /* nothing to commit */ }
  return ws;
}

function runAgent(task, ws, transcriptPath) {
  const cmd = config.agent.command.map((part) => part.replaceAll("__PROMPT__", task.prompt));
  const timeoutSec = task.timeoutSeconds ?? config.defaultTimeoutSeconds ?? 900;
  const started = Date.now();
  const res = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ws,
    encoding: "utf8",
    timeout: timeoutSec * 1000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, EVAL_RUN: "1" },
  });
  const durationMs = Date.now() - started;
  const transcript = (res.stdout ?? "") + "\n--- stderr ---\n" + (res.stderr ?? "");
  fs.writeFileSync(transcriptPath, transcript, "utf8");
  const timedOut = res.error?.code === "ETIMEDOUT" || res.signal === "SIGTERM";
  // Best-effort cost extraction (claude CLI --output-format json emits this).
  const costMatch = transcript.match(/"total_cost_usd"\s*:\s*([0-9.]+)/);
  const turnsMatch = transcript.match(/"num_turns"\s*:\s*([0-9]+)/);
  return {
    durationMs, timedOut,
    exitCode: res.status,
    costUsd: costMatch ? Number(costMatch[1]) : null,
    turns: turnsMatch ? Number(turnsMatch[1]) : null,
  };
}

function diffMetrics(task, ws) {
  // No trim on the raw output: trimming would eat the leading status char
  // of the first porcelain line (" M path" -> "M path") and corrupt paths.
  const statusRaw = execFileSync("git", ["status", "--porcelain"], { cwd: ws, encoding: "utf8" });
  const changed = statusRaw
    .split("\n").filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .map((p) => p.includes(" -> ") ? p.split(" -> ").pop() : p);
  let diffLines = 0;
  const numstat = sh("git", ["diff", "HEAD", "--numstat"], { cwd: ws });
  for (const line of numstat.split("\n").filter(Boolean)) {
    const [a, d] = line.split("\t");
    diffLines += (Number(a) || 0) + (Number(d) || 0);
  }
  const allowed = task.scope?.allowed ?? null;
  const scopeViolations = allowed === null ? [] :
    changed.filter((f) => !allowed.some((a) => f === a || f.startsWith(a.endsWith("/") ? a : a + "/")));
  return { filesChanged: changed, diffLines, scopeViolations };
}

function runVerify(task, ws, transcriptPath) {
  const script = path.join(task._dir, "verify", "verify.sh");
  if (!fs.existsSync(script)) return { pass: false, mode: "missing-verify" };
  // Graders run with cwd = the WORKSPACE (not the repo). Before 2026-09-03
  // this was cwd = wherever run.mjs was invoked, which silently graded the
  // LIVE repo: one downstream grader always failed, another accidentally
  // passed. $WORKSPACE stays exported so existing `cd "$WORKSPACE"` graders
  // keep working.
  const res = spawnSync("bash", [script], {
    encoding: "utf8",
    timeout: 120_000,
    cwd: ws,
    env: { ...process.env, WORKSPACE: ws, TRANSCRIPT: transcriptPath, TASK_DIR: task._dir, REPO_ROOT },
  });
  const out = (res.stdout ?? "") + (res.stderr ?? "");
  const modeMatch = out.match(/FAILURE_MODE:\s*([a-z0-9-]+)/i);
  return {
    pass: res.status === 0,
    mode: res.status === 0 ? null : (modeMatch ? modeMatch[1] : "verify-failed"),
    verifyOutput: out.trim(),
  };
}

// ---------------------------------------------------------------- main
const tasks = loadTasks();
if (tasks.length === 0) {
  console.error(`No runnable tasks for tier '${TIER}'. Templates (status=template) are skipped.`);
  process.exit(LIST_ONLY ? 0 : 1);
}
if (LIST_ONLY) {
  for (const t of tasks) console.log(`${t.id}  [${t.tier}/${t.difficulty}]  ${t.kind}  ${t.title}`);
  process.exit(0);
}

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const resultsDir = path.join(EVALS_DIR, "results", runId);
fs.mkdirSync(resultsDir, { recursive: true });
const rows = [];

for (const task of tasks) {
  const samples = Number(SAMPLES_OVERRIDE ?? task.samples ?? config.samples ?? 5);
  for (let s = 1; s <= samples; s++) {
    const sampleDir = fs.mkdtempSync(path.join(os.tmpdir(), `eval-${task.id}-${s}-`));
    const transcriptPath = path.join(resultsDir, `${task.id}.sample${s}.transcript.txt`);
    let row = { runId, taskId: task.id, tier: task.tier, kind: task.kind, sample: s };
    try {
      const ws = makeWorkspace(task, sampleDir);
      const agent = runAgent(task, ws, transcriptPath);
      const metrics = diffMetrics(task, ws);
      let verdict;
      if (agent.timedOut) {
        verdict = { pass: false, mode: "timeout" };
      } else {
        verdict = runVerify(task, ws, transcriptPath);
        if (verdict.pass && metrics.scopeViolations.length > 0) {
          verdict = { pass: false, mode: "scope-creep" };
        }
      }
      row = { ...row, pass: verdict.pass, failureMode: verdict.mode,
              durationMs: agent.durationMs, costUsd: agent.costUsd, turns: agent.turns,
              agentExit: agent.exitCode, diffLines: metrics.diffLines,
              filesChanged: metrics.filesChanged.length,
              scopeViolations: metrics.scopeViolations };
    } catch (err) {
      row = { ...row, pass: false, failureMode: "runner-error", error: String(err?.message ?? err) };
    } finally {
      fs.rmSync(sampleDir, { recursive: true, force: true });
    }
    rows.push(row);
    fs.appendFileSync(path.join(resultsDir, "results.jsonl"), JSON.stringify(row) + "\n");
    console.log(`  ${row.pass ? "PASS" : "FAIL"}  ${task.id} sample ${s}/${samples}` +
      (row.failureMode ? `  [${row.failureMode}]` : ""));
  }
}

// ---------------------------------------------------------------- summary
const byTask = new Map();
for (const r of rows) {
  if (!byTask.has(r.taskId)) byTask.set(r.taskId, []);
  byTask.get(r.taskId).push(r);
}
const taskSummaries = [...byTask.entries()].map(([taskId, samples]) => {
  const n = samples.length;
  const p = samples.filter((r) => r.pass).length / n;
  const costs = samples.map((r) => r.costUsd).filter((c) => c != null);
  const turns = samples.map((r) => r.turns).filter((t) => t != null);
  return {
    taskId, tier: samples[0].tier, n,
    passAt1: Number(p.toFixed(3)),
    stderr: Number(Math.sqrt((p * (1 - p)) / n).toFixed(3)),
    avgCostUsd: costs.length ? Number((costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(4)) : null,
    avgDurationMs: Math.round(samples.reduce((a, r) => a + (r.durationMs ?? 0), 0) / n),
    avgTurns: turns.length ? Number((turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(2)) : null,
  };
});
const failureModes = {};
for (const r of rows.filter((r) => !r.pass)) {
  failureModes[r.failureMode ?? "unknown"] = (failureModes[r.failureMode ?? "unknown"] ?? 0) + 1;
}
const tierRates = {};
for (const t of taskSummaries) {
  tierRates[t.tier] = tierRates[t.tier] ?? [];
  tierRates[t.tier].push(t.passAt1);
}
const tierSummary = Object.fromEntries(Object.entries(tierRates)
  .map(([tier, rates]) => [tier, Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(3))]));

const summary = { provenance: provenance(tasks), tierSummary, taskSummaries, failureModes };
fs.writeFileSync(path.join(resultsDir, "summary.json"), JSON.stringify(summary, null, 2));

function isoZ(d = new Date()) {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}
function fleetIdentity() {
  const state = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".speckit-state.json"), "utf8")); }
    catch { return {}; }
  })();
  let project = state.projectName || state.project || path.basename(REPO_ROOT);
  let layer = "unknown";
  if (state.layers && typeof state.layers === "object") {
    const on = Object.entries(state.layers).filter(([, v]) => v).map(([k]) => k);
    layer = on.length ? on.join("+") : "kernel";
  }
  return { project, layer };
}
const mean = (vals) => vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
const ident = fleetIdentity();
const passRates = taskSummaries.map((t) => t.passAt1);
const costVals = taskSummaries.map((t) => t.avgCostUsd).filter((c) => c != null);
const durVals = taskSummaries.map((t) => t.avgDurationMs).filter((d) => d != null);
const turnVals = taskSummaries.map((t) => t.avgTurns).filter((c) => c != null);
const evalRecord = {
  schemaVersion: 1,
  kind: "eval-run",
  ts: isoZ(),
  sha: summary.provenance.repoHead,
  project: ident.project,
  layer: ident.layer,
  metrics: {
    passAt1: passRates.length ? Number(mean(passRates).toFixed(3)) : null,
    avgCostUsd: costVals.length ? Number(mean(costVals).toFixed(4)) : null,
    avgDurationMs: durVals.length ? Math.round(mean(durVals)) : null,
    avgTurns: turnVals.length ? Number(mean(turnVals).toFixed(2)) : null,
    n: rows.length,
    tasks: taskSummaries.length,
    tierSummary,
    failureModes,
    model: config.agent.model ?? "unspecified",
    claudeMdSha256: summary.provenance.claudeMdSha256,
    evalSetHash: summary.provenance.evalSetHash,
  },
};
try {
  const metricsDir = path.join(EVALS_DIR, "metrics");
  fs.mkdirSync(metricsDir, { recursive: true });
  fs.appendFileSync(path.join(metricsDir, "eval.jsonl"), JSON.stringify(evalRecord) + "\n");
} catch (err) {
  console.warn(`[warn] eval metrics: ${err && err.message ? err.message : String(err)}`);
}

console.log("\n=== Eval summary ===");
for (const t of taskSummaries) {
  console.log(`  ${t.taskId.padEnd(30)} pass@1=${t.passAt1} (n=${t.n}, ±${t.stderr})` +
    (t.avgCostUsd != null ? `  avg $${t.avgCostUsd}` : ""));
}
console.log("  Failure modes:", Object.keys(failureModes).length ? failureModes : "none");
console.log(`  Results: evals/results/${runId}/`);

let failedGate = false;
for (const [tier, rate] of Object.entries(tierSummary)) {
  const gate = config.gates?.[tier];
  if (gate != null && rate < gate) {
    console.error(`GATE FAILED: tier '${tier}' pass rate ${rate} < required ${gate}`);
    failedGate = true;
  }
}
process.exit(failedGate ? 1 : 0);
