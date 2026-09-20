#!/usr/bin/env node
// evals/benchmark/run-background.mjs
//
// Background wrapper for evals/run.mjs. It is intentionally safe to wire into
// scheduled CI: disabled or unconfigured benchmarks exit 0 with a skip summary.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BENCHMARK_DIR = path.dirname(fileURLToPath(import.meta.url));
const EVALS_DIR = path.resolve(BENCHMARK_DIR, "..");
const RUNNER = path.join(EVALS_DIR, "run.mjs");
const CONFIG_PATH = path.join(BENCHMARK_DIR, "benchmark.config.json");
const EVAL_CONFIG_PATH = path.join(EVALS_DIR, "evals.config.json");
const RESULTS_DIR = path.join(BENCHMARK_DIR, "results");

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeSummary(summary) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(RESULTS_DIR, `${ts}.summary.json`);
  fs.writeFileSync(file, JSON.stringify(summary, null, 2) + "\n", "utf8");
  return file;
}

function skip(reason, details = {}) {
  const file = writeSummary({
    schemaVersion: 1,
    status: "skipped",
    reason,
    details,
    timestamp: new Date().toISOString(),
  });
  console.log(`benchmark: skipped (${reason})`);
  console.log(`benchmark: summary ${path.relative(process.cwd(), file)}`);
  process.exit(0);
}

const config = readJson(CONFIG_PATH);
if (!config) skip("missing-config", { expected: path.relative(process.cwd(), CONFIG_PATH) });
if (!config.enabled) skip("disabled", { hint: "set evals/benchmark/benchmark.config.json enabled=true" });

const evalConfig = readJson(EVAL_CONFIG_PATH);
if (!evalConfig?.agent?.command || !Array.isArray(evalConfig.agent.command) || evalConfig.agent.command.length === 0) {
  skip("missing-agent-command", { expected: path.relative(process.cwd(), EVAL_CONFIG_PATH) });
}
if (String(evalConfig.agent.model ?? "").includes("set-me")) {
  skip("placeholder-agent-model", { hint: "set evals/evals.config.json agent.model before enabling background benchmarks" });
}
if (!fs.existsSync(RUNNER)) {
  skip("missing-runner", { expected: path.relative(process.cwd(), RUNNER) });
}

const tier = String(flag("tier", config.tier ?? "smoke"));
const task = flag("task", null);
const samples = flag("samples", config.samples ?? null);
const allowedTiers = new Set(["smoke", "full", "hidden", "all"]);
if (!allowedTiers.has(tier)) {
  skip("invalid-tier", { tier, allowed: [...allowedTiers] });
}

const args = [RUNNER, "--tier", tier];
if (task) args.push("--task", String(task));
if (samples != null) args.push("--samples", String(samples));

console.log(`benchmark: running node ${args.map((a) => JSON.stringify(a)).join(" ")}`);
const started = Date.now();
const res = spawnSync(process.execPath, args, {
  cwd: path.resolve(EVALS_DIR, ".."),
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
process.stdout.write(res.stdout ?? "");
process.stderr.write(res.stderr ?? "");

const runSummaries = fs.existsSync(path.join(EVALS_DIR, "results"))
  ? fs.readdirSync(path.join(EVALS_DIR, "results"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(EVALS_DIR, "results", e.name, "summary.json"))
      .filter((p) => fs.existsSync(p))
      .map((p) => ({ path: p, mtimeMs: fs.statSync(p).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
  : [];

let latestSummary = null;
if (runSummaries[0]) {
  latestSummary = readJson(runSummaries[0].path);
}

const summaryFile = writeSummary({
  schemaVersion: 1,
  status: res.status === 0 ? "completed" : "failed",
  tier,
  task: task || null,
  samples: samples == null ? null : Number(samples),
  durationMs: Date.now() - started,
  runnerExitCode: res.status,
  latestEvalSummary: latestSummary,
  timestamp: new Date().toISOString(),
});

console.log(`benchmark: summary ${path.relative(process.cwd(), summaryFile)}`);

// Background mode should report but not break normal development unless a
// project deliberately turns it into a gate.
if (config.failOnGateFailure === true && res.status !== 0) {
  process.exit(res.status ?? 1);
}
process.exit(0);
