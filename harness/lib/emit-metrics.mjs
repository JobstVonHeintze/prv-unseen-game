#!/usr/bin/env node
// Rationale: production boundary-gate post-mortem (F2/F7) — see
// docs/decisions/2026-05-30-boundary-gate-postmortem.md
//
// harness/lib/emit-metrics.mjs — append one schema-versioned process-health
// record per phase/run to harness/metrics/<phase>.jsonl. Zero runtime deps.
//
// Why this file exists:
//   F2: you cannot improve a process you do not measure — drift is invisible
//   without a baseline series. F7: a dashboard a human must remember to run
//   rots (that is exactly how quality.yml ran 0 times). So metrics MUST be a
//   byproduct of the loop, emitted automatically by harness/run on every phase
//   transition and published as a CI artifact. The *signal* ships in every
//   project; the *viewer* (observatory/) lives once, centrally.
//
// Fail-open contract: ANY error prints a single [warn] line and exits 0.
//   Emitting metrics must NEVER break the factory loop.
//
// Usage: node harness/lib/emit-metrics.mjs --phase <init|select|build|verify|review|closeout>

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;

function warn(msg) { console.warn(`[warn] emit-metrics: ${msg}`); }

try {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const HARNESS = path.resolve(here, "..");
  const ROOT = path.resolve(here, "..", "..");

  const argv = process.argv.slice(2);
  const pi = argv.indexOf("--phase");
  const phase = pi !== -1 ? argv[pi + 1] : "unknown";

  const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
  const round3 = (n) => Math.round(n * 1000) / 1000;

  // smoke_pass: env override (CI) else last verify-gate receipt. The verify
  // gate includes scripts/smoke.sh, so exit 0 implies smoke passed. A failing
  // verify is recorded false even if a later conjunct (evidence, boundaries)
  // was the actual failure — still better than a permanent null (F2).
  function readSmokePass() {
    const env = process.env.SMOKE_PASS;
    if (env === "1" || env === "true") return true;
    if (env === "0" || env === "false") return false;
    const receipt = readJson(path.join(HARNESS, "receipts", "verify.json"));
    if (receipt && typeof receipt.exitCode === "number") return receipt.exitCode === 0;
    return null;
  }

  // review_completion_ratio: among status=done features, share whose id
  // appears in docs/reviews/*.md or in the bound state.reviewArtifact.
  // Zero done features → null (do not plot an empty backlog as 0%).
  function readReviewCompletionRatio() {
    const list = readJson(path.join(HARNESS, "feature_list.json"));
    if (!list || !Array.isArray(list.features)) return null;
    const done = list.features.filter((f) => f && f.status === "done" && typeof f.id === "string");
    if (done.length === 0) return null;
    const bodies = [];
    try {
      const dir = path.join(ROOT, "docs", "reviews");
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith(".md")) continue;
        try { bodies.push(fs.readFileSync(path.join(dir, name), "utf8")); } catch { /* skip */ }
      }
    } catch { /* no reviews dir */ }
    const st = readJson(path.join(HARNESS, "state.json")) || {};
    let reviewed = 0;
    for (const f of done) {
      const inDocs = bodies.some((body) => body.includes(f.id));
      const inState = st.reviewArtifact && st.activeFeature === f.id;
      if (inDocs || inState) reviewed++;
    }
    return round3(reviewed / done.length);
  }

  // Wall time between this phase's receipt and the previous phase's receipt.
  // Null when a receipt is missing (CI emit without harness/run).
  function readPhaseDurationMs(currentPhase) {
    const order = ["init", "select", "build", "verify", "review", "closeout"];
    const current = readJson(path.join(HARNESS, "receipts", `${currentPhase}.json`));
    if (!current || typeof current.ts !== "string") return null;
    const i = order.indexOf(currentPhase);
    let prevTs = null;
    if (i > 0) {
      const prev = readJson(path.join(HARNESS, "receipts", `${order[i - 1]}.json`));
      if (prev && typeof prev.ts === "string") prevTs = prev.ts;
    }
    if (!prevTs) {
      const st = readJson(path.join(HARNESS, "state.json"));
      const hist = Array.isArray(st?.history) ? st.history : [];
      if (hist.length && typeof hist[hist.length - 1].ts === "string") {
        prevTs = hist[hist.length - 1].ts;
      }
    }
    if (!prevTs) return null;
    const ms = Date.parse(current.ts) - Date.parse(prevTs);
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  }

  function gitSha() {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync("git rev-parse HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
    catch { return "unknown"; }
  }

  // Project + layer identity (best-effort, from scaffold state).
  const state = readJson(path.join(ROOT, ".speckit-state.json")) || {};
  let project = state.projectName || state.project || path.basename(ROOT);
  let layer = "unknown";
  if (state.layers && typeof state.layers === "object") {
    const on = Object.entries(state.layers).filter(([, v]) => v).map(([k]) => k);
    layer = on.length ? on.join("+") : "kernel";
  }

  // Boundary signal: read the report the boundary gate already produced (F3/F4),
  // never recompute it here.
  const report = readJson(path.join(HARNESS, "boundaries.report.json"));
  const boundary_status = !report
    ? "missing"
    : report.status === "skipped" || report.skipped === true
      ? "skipped"
      : report.status === "checked" || report.strict
        ? "checked"
        : "missing";
  const boundary_reason = boundary_status === "missing"
    ? "report-missing"
    : boundary_status === "skipped"
      ? (report.reason || "unspecified")
      : null;
  const strict = boundary_status === "checked" && report.strict ? report.strict : null;
  const classes = strict && strict.classes ? strict.classes : null;
  const boundary_violations_strict = strict ? (strict.violations_total ?? 0) : null;
  const boundary_violations_verbatim = boundary_status === "checked" && report.verbatim
    ? (report.verbatim.violations_total ?? 0)
    : null;
  const boundary_forbidden_edges = strict && Array.isArray(strict.edges)
    ? strict.edges.length
    : boundary_violations_strict;

  // Module count from the boundary config (if present).
  const cfg = readJson(path.join(HARNESS, "boundaries.config.json"));
  const modules = cfg && cfg.modules ? Object.keys(cfg.modules).length : 0;
  const srcRoot = (cfg && cfg.srcRoot) || "src";

  // LOC: bounded walk of the source root. Capped so emission cost stays
  // predictable on every phase transition even in a large monorepo — telemetry
  // must never become the slow thing in the loop (the spirit of F7). The cap is
  // far above any realistic module's source size; if hit, `loc` is a documented
  // lower bound (`loc_truncated: true`).
  const CODE_EXTS = new Set([".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".mjs", ".cjs", ".mts", ".cts"]);
  const IGNORE = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv", "venv", "target", "coverage"]);
  const MAX_FILES = 20000;
  let filesScanned = 0;
  let locTruncated = false;
  function countLoc(dir) {
    let total = 0;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
    for (const e of entries) {
      if (filesScanned >= MAX_FILES) { locTruncated = true; break; }
      if (e.isDirectory()) {
        if (IGNORE.has(e.name) || e.name.startsWith(".")) continue;
        total += countLoc(path.join(dir, e.name));
      } else if (CODE_EXTS.has(path.extname(e.name))) {
        filesScanned++;
        try { total += fs.readFileSync(path.join(dir, e.name), "utf8").split(/\r?\n/).length; } catch { /* skip */ }
      }
    }
    return total;
  }
  const loc = countLoc(path.resolve(ROOT, srcRoot));

  // Gate-liveness: did the loop leave receipts (F7)?
  let gate_receipts_present = false;
  try { gate_receipts_present = fs.readdirSync(path.join(HARNESS, "receipts")).some((f) => f.endsWith(".json")); } catch { /* none */ }

  // Normalised fields so a CLI tool and a full-stack app are comparable
  // (a raw count is not — see the observatory's small-n/heterogeneous caveat).
  const boundary_violations_per_kloc = boundary_status === "checked" && loc > 0
    ? round3(boundary_violations_strict / (loc / 1000))
    : null;
  const boundary_violations_per_module = boundary_status === "checked" && modules > 0
    ? round3(boundary_violations_strict / modules)
    : null;

  const record = {
    schemaVersion: SCHEMA_VERSION,
    ts: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    sha: gitSha(),
    project,
    layer,
    phase,
    metrics: {
      boundary_status,
      boundary_reason,
      boundary_violations_strict,
      boundary_violations_verbatim,
      boundary_forbidden_edges,
      boundary_classes: {
        policy_gap: classes ? (classes.policy_gap ?? 0) : null,
        misplaced_contract: classes ? (classes.misplaced_contract ?? 0) : null,
        infra_leak: classes ? (classes.infra_leak ?? 0) : null,
        peer_coupling: classes ? (classes.peer_coupling ?? 0) : null,
      },
      loc,
      loc_truncated: locTruncated,
      modules,
      boundary_violations_per_kloc,
      boundary_violations_per_module,
      smoke_pass: readSmokePass(),
      review_completion_ratio: readReviewCompletionRatio(),
      phase_duration_ms: readPhaseDurationMs(phase),
      gate_receipts_present,
    },
    _provenance: "boundary post-mortem F2/F7 — docs/decisions/2026-05-30-boundary-gate-postmortem.md",
  };

  const dir = path.join(HARNESS, "metrics");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${phase}.jsonl`), JSON.stringify(record) + "\n");
  console.log(`metrics: appended ${phase} record (boundary=${boundary_status}, strict=${boundary_violations_strict ?? "n/a"}, loc=${loc}, modules=${modules})`);
  process.exit(0);
} catch (e) {
  warn(e && e.message ? e.message : String(e));
  process.exit(0); // fail-open: never break the loop
}
