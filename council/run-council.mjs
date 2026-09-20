#!/usr/bin/env node
// council/run-council.mjs
//
// Runs configured headless reviewer commands against a draft plan and writes a
// durable council summary. Reviewers are stdout-only; they never edit files.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const COUNCIL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(COUNCIL_DIR, "..");
const CONFIG_PATH = path.join(COUNCIL_DIR, "council.config.json");
const RUBRIC_PATH = path.join(ROOT, "docs", "templates", "council-review-template.md");

const planArg = process.argv[2];

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function slugForPlan(planPath) {
  const base = path.basename(planPath, path.extname(planPath));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "plan";
}

function outputDir(planPath) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(ROOT, "docs", "reviews", "council", `${date}-${slugForPlan(planPath)}`);
}

function writeSummary(dir, body) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "council-summary.md");
  fs.writeFileSync(file, body.trimEnd() + "\n", "utf8");
  return file;
}

function skip(reason, details = {}) {
  const dir = outputDir(planArg || "missing-plan.md");
  const detailLines = Object.entries(details).map(([k, v]) => `- **${k}:** ${String(v)}`);
  const file = writeSummary(dir, `
# Model Council Summary

- **Status:** skipped
- **Reason:** ${reason}
- **Timestamp:** ${new Date().toISOString()}

${detailLines.join("\n")}

Continue the normal planning flow. A skipped council is not a blocker.
`);
  console.log(`model-council: skipped (${reason})`);
  console.log(`model-council: summary ${path.relative(ROOT, file)}`);
  process.exit(0);
}

if (!planArg) {
  console.error("Usage: node council/run-council.mjs docs/plans/<plan>.md");
  process.exit(2);
}

const planPath = path.resolve(ROOT, planArg);
if (!planPath.startsWith(ROOT + path.sep)) {
  console.error(`BLOCKER: plan path must stay inside repository: ${planArg}`);
  process.exit(2);
}
if (!fs.existsSync(planPath)) {
  console.error(`BLOCKER: plan not found: ${planArg}`);
  process.exit(2);
}

const config = readJson(CONFIG_PATH);
if (!config) skip("missing-config", { expected: "council/council.config.json" });
if (!config.enabled) skip("disabled", { hint: "set council/council.config.json enabled=true" });

const reviewers = Array.isArray(config.reviewers)
  ? config.reviewers.filter((r) => r && r.enabled !== false)
  : [];
if (reviewers.length === 0) skip("no-reviewers", { hint: "move configured reviewer entries into reviewers[]" });

const planText = fs.readFileSync(planPath, "utf8");
const rubricText = fs.existsSync(RUBRIC_PATH)
  ? fs.readFileSync(RUBRIC_PATH, "utf8")
  : "Review the plan for scope, deliverables, verification, risks, simplicity, and handoff readiness.";
const timeoutMs = Number(config.timeoutSeconds ?? 600) * 1000;
const dir = outputDir(planPath);
const rawDir = path.join(dir, "raw");
fs.mkdirSync(rawDir, { recursive: true });

function reviewerReady(reviewer) {
  const missingEnv = Array.isArray(reviewer.env)
    ? reviewer.env.filter((name) => !process.env[name])
    : [];
  if (missingEnv.length > 0) {
    return { ok: false, reason: `missing env: ${missingEnv.join(", ")}` };
  }
  if (!Array.isArray(reviewer.command) || reviewer.command.length === 0) {
    return { ok: false, reason: "missing command[]" };
  }
  return { ok: true };
}

function makePrompt(reviewer) {
  return `
You are an independent model-council reviewer for a software implementation plan.

Return only a review in markdown. Do not ask follow-up questions. Do not edit files.
Focus on concrete, evidence-backed feedback the original planner can reconcile.

Reviewer: ${reviewer.label ?? reviewer.id ?? "unnamed"}
Plan path: ${path.relative(ROOT, planPath)}

Rubric:
${rubricText}

Plan:
${planText}
`;
}

function runReviewer(reviewer) {
  const id = String(reviewer.id || reviewer.label || "reviewer").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const ready = reviewerReady(reviewer);
  if (!ready.ok) {
    return Promise.resolve({
      id,
      label: reviewer.label ?? id,
      status: "skipped",
      reason: ready.reason,
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 0,
    });
  }

  const prompt = makePrompt(reviewer);
  const command = reviewer.command.map((part) => String(part)
    .replaceAll("__PLAN_PATH__", path.relative(ROOT, planPath))
    .replaceAll("__PROMPT__", prompt)
    .replaceAll("__PLAN_TEXT__", planText));

  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: ROOT,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        child.kill("SIGTERM");
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        id,
        label: reviewer.label ?? id,
        status: "failed",
        reason: err.message,
        stdout,
        stderr,
        exitCode: 1,
        durationMs: Date.now() - started,
      });
    });
    child.on("close", (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        id,
        label: reviewer.label ?? id,
        status: signal ? "timeout-or-signal" : (code === 0 ? "completed" : "failed"),
        reason: signal || (code === 0 ? "" : `exit ${code}`),
        stdout,
        stderr,
        exitCode: code,
        durationMs: Date.now() - started,
      });
    });
    // A reviewer that exits (or crashes) before reading stdin raises EPIPE
    // on this write; without the guard the whole council run dies instead
    // of recording that one reviewer as failed. (Hit in production 2026-09-02.)
    child.stdin.on("error", (err) => {
      if (err.code !== "EPIPE") console.error(`[council] stdin error for ${id}: ${err.message}`);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const results = await Promise.all(reviewers.map(runReviewer));
for (const r of results) {
  fs.writeFileSync(path.join(rawDir, `${r.id}.stdout.md`), r.stdout || "", "utf8");
  fs.writeFileSync(path.join(rawDir, `${r.id}.stderr.txt`), r.stderr || "", "utf8");
}

const completed = results.filter((r) => r.status === "completed" && r.stdout.trim());
const required = Number(config.requiredReviewers ?? 2);
const status = completed.length >= required ? "completed" : "partial";

const reviewerSections = results.map((r) => `
## ${r.label}

- **Status:** ${r.status}
- **Duration:** ${r.durationMs} ms
${r.reason ? `- **Reason:** ${r.reason}` : ""}

${r.stdout.trim() || "_No review text captured._"}
`).join("\n");

const summaryFile = writeSummary(dir, `
# Model Council Summary

- **Status:** ${status}
- **Plan:** ${path.relative(ROOT, planPath)}
- **Completed reviewers:** ${completed.length} / ${results.length}
- **Required reviewers:** ${required}
- **Timestamp:** ${new Date().toISOString()}

## Reconciliation Guidance

The original planner should:

- adopt concrete, evidence-backed edits,
- reject vague or contradictory advice,
- keep scope narrow,
- preserve falsifiable Definition-of-Done commands,
- avoid marking the plan approved without user approval.

Raw reviewer outputs are stored under \`raw/\` and should not be read during
normal work unless debugging the council runner itself.

${reviewerSections}
`);

console.log(`model-council: ${status} (${completed.length}/${results.length} reviewers completed)`);
console.log(`model-council: summary ${path.relative(ROOT, summaryFile)}`);
process.exit(0);
