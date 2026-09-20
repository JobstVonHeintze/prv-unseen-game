#!/usr/bin/env node
// evals/judge.mjs — sampled LLM-as-judge over eval transcripts.
//
// Default: skip. Enable only after writing evals/judge.calibration.json
// (see JUDGE_RUBRIC.md). Scores are advisory; they never fail the eval gate
// unless failOnLowScore is set.
//
//   node evals/judge.mjs
//   node evals/judge.mjs --run-id <evals/results/<id>>

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(EVALS_DIR, "judge.config.json");
const CALIBRATION_PATH = path.join(EVALS_DIR, "judge.calibration.json");
const RUBRIC_PATH = path.join(EVALS_DIR, "JUDGE_RUBRIC.md");
const RESULTS_DIR = path.join(EVALS_DIR, "results");

function skip(reason, extra = "") {
  console.log(`judge: skipped (${reason})${extra ? ` — ${extra}` : ""}`);
  process.exit(0);
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const config = readJson(CONFIG_PATH);
if (!config) skip("missing-config", CONFIG_PATH);
if (!config.enabled) skip("disabled", "set evals/judge.config.json enabled=true after calibration");

if (config.requireCalibration !== false) {
  const cal = readJson(CALIBRATION_PATH);
  if (!cal || typeof cal.agreement !== "number") {
    skip("missing-calibration", "hand-label 10 transcripts, then write evals/judge.calibration.json");
  }
  const min = Number(config.calibrationMinAgreement ?? 0.8);
  if (cal.agreement < min) {
    skip("calibration-below-threshold", `agreement ${cal.agreement} < ${min}`);
  }
}

const runId = flag("run-id", null);
let runDir = runId ? (path.isAbsolute(runId) ? runId : path.join(RESULTS_DIR, runId)) : null;
if (!runDir) {
  if (!fs.existsSync(RESULTS_DIR)) skip("no-results", "run node evals/run.mjs first");
  const dirs = fs.readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, mtime: fs.statSync(path.join(RESULTS_DIR, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!dirs.length) skip("no-results", "run node evals/run.mjs first");
  runDir = path.join(RESULTS_DIR, dirs[0].name);
}

const transcripts = fs.readdirSync(runDir)
  .filter((n) => n.endsWith(".transcript.txt"))
  .map((n) => path.join(runDir, n));
if (!transcripts.length) skip("no-transcripts", runDir);

const rate = Math.min(1, Math.max(0, Number(config.sampleRate ?? 0.2)));
const n = Math.max(1, Math.round(transcripts.length * rate));
const sampled = transcripts.slice(0, n);
const rubric = fs.existsSync(RUBRIC_PATH) ? fs.readFileSync(RUBRIC_PATH, "utf8") : "";
const cmd = Array.isArray(config.command) ? config.command : null;
if (!cmd || !cmd.length) skip("missing-judge-command");

const skeleton = `You are grading an AI coding agent's work transcript against a rubric.
Read JUDGE_RUBRIC.md (included) and the transcript. For each of the six dimensions,
output a score (0/1/2) and a one-line justification citing transcript evidence.
Do not award 2 without explicit evidence. Output JSON only:
{"hypothesis":n,"verification":n,"scope":n,"recovery":n,"constraints":n,"economy":n,"notes":"..."}

RUBRIC:
${rubric}

TRANSCRIPT:
`;

const scores = [];
for (const file of sampled) {
  const transcript = fs.readFileSync(file, "utf8").slice(0, 80_000);
  const prompt = skeleton + transcript;
  const argvCmd = cmd.map((part) => part.replaceAll("__PROMPT__", prompt));
  const res = spawnSync(argvCmd[0], argvCmd.slice(1), {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const jsonMatch = out.match(/\{[\s\S]*"hypothesis"[\s\S]*\}/);
  let parsed = null;
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]); } catch { /* keep null */ }
  }
  scores.push({
    transcript: path.basename(file),
    exitCode: res.status,
    scores: parsed,
  });
}

const outFile = path.join(runDir, "judge.json");
fs.writeFileSync(outFile, JSON.stringify({
  schemaVersion: 1,
  sampled: sampled.map((p) => path.basename(p)),
  scores,
}, null, 2) + "\n");
console.log(`judge: wrote ${path.relative(process.cwd(), outFile)} (${scores.length} sampled)`);
process.exit(0);
