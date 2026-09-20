#!/usr/bin/env node
// Rationale: production boundary-gate post-mortem (F1/F3/F4/F6/F8) —
// see docs/decisions/2026-05-30-boundary-gate-postmortem.md
//
// harness/lib/check-boundaries.mjs — deterministic, config-driven, ratcheting
// module-boundary checker. Zero runtime dependencies (Node ≥18 builtins only).
//
// Why this file exists (the post-mortem in one paragraph):
//   In the audited production project the boundary check was a *manual* slash-command
//   that no hook, test, or CI job ever ran (F1). Sprint reviews asserted
//   "0 violations" while 4 forbidden edges existed since commit #1 (F5). The
//   CI gate that "existed" ran 0 times and was deleted (F7). When real drift
//   happened once, it was a *legitimate* DRY refactor that a naive gate would
//   have wrongly blocked (F3). This script turns the convention into a cheap,
//   deterministic, ratcheting gate that emits a machine artifact other phases
//   cite — so a boundary claim can never again be self-graded.
//
// Static-analysis limitation (do not hide it): regex import extraction cannot
//   see dynamic imports, dependency injection, or string-keyed coupling. This
//   gate COMPLEMENTS — does not replace — the preserved-capability contract tests.
//
// Exit codes (mirror scripts/check-sync.mjs):
//   0  -> ok (no class regressed over baseline, or boundaries not configured)
//   1  -> regression: some severity class increased over its baseline
//   2  -> setup error (config present but malformed)
//
// Flags:
//   --report                 human summary; writes nothing.
//   --json [path]            also write the machine evidence artifact
//                            (default: harness/boundaries.report.json).
//   --check                  (default) ratchet gate against the baseline.
//   --update-baseline        rewrite the baseline to the current measurement
//                            (human-invoked only — never in CI).
//   --append-trend <path>    append one JSONL line {sha,ts,violations_total,classes}
//                            so the factory accrues a drift series (F2).
//
// The canonical metric is `strict` (constitution-true: stdlib always allowed).
// A second `verbatim` count mimics the legacy naive grep (which over-reported
// stdlib, F6) and is shown for contrast only — the ratchet never uses it.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = path.resolve(here, "..");
const ROOT = path.resolve(here, "..", "..");
const CONFIG = path.join(HARNESS, "boundaries.config.json");
const BASELINE = path.join(HARNESS, "boundaries.baseline.json");
const DEFAULT_REPORT = path.join(HARNESS, "boundaries.report.json");

const CLASSES = ["policy_gap", "misplaced_contract", "infra_leak", "peer_coupling"];
// infra_leak + peer_coupling target zero: while baseline>0 they warn, once at 0
// any new edge hard-fails. policy_gap + misplaced_contract only need non-increase.
const ZERO_TARGET_CLASSES = new Set(["infra_leak", "peer_coupling"]);

function blocker(what, why, fix) {
  console.error(`BLOCKER: ${what}`);
  if (why) console.error(`  WHY: ${why}`);
  if (fix) console.error(`  FIX: ${fix}`);
}

function gitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch { return "unknown"; }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function flagValue(name, fallback) {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const next = argv[i + 1];
  if (next && !next.startsWith("--")) return next;
  return fallback;
}
const wantReport = argv.includes("--report");
const wantUpdateBaseline = argv.includes("--update-baseline");
const wantJson = argv.includes("--json");
const jsonPath = wantJson ? path.resolve(ROOT, flagValue("--json", DEFAULT_REPORT)) : null;
const trendPath = argv.includes("--append-trend")
  ? path.resolve(ROOT, flagValue("--append-trend", "docs/decisions/boundary-trend.jsonl"))
  : null;

// ---------------------------------------------------------------------------
// Config + baseline loading. Absent config => fail-open (exit 0).
// ---------------------------------------------------------------------------
// Even when we skip, emit a minimal evidence artifact if --json was requested,
// so CI (and the gate-liveness receipt, F7) always has a file to point at.
function writeSkipReport(reason) {
  if (!jsonPath) return;
  const report = {
    schemaVersion: 1,
    ts: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    sha: gitSha(),
    status: "skipped",
    skipped: true,
    reason,
    strict: null,
    verbatim: null,
    _provenance: "boundary post-mortem F1/F6 — docs/decisions/2026-05-30-boundary-gate-postmortem.md",
  };
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`boundaries: wrote evidence artifact (skipped) -> ${path.relative(ROOT, jsonPath)}`);
}

if (!fs.existsSync(CONFIG)) {
  console.log("boundaries: not configured (skipping)");
  console.log("  NOTE: create harness/boundaries.config.json to enable the ratcheting gate.");
  console.log("        See docs/decisions/2026-05-30-boundary-gate-postmortem.md (F1/F6).");
  writeSkipReport("config-absent");
  process.exit(0);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
} catch (e) {
  blocker(
    `harness/boundaries.config.json: invalid JSON — ${e.message}`,
    "the checker cannot run with an unparseable config",
    "fix the JSON syntax; validate with `node -e \"JSON.parse(require('fs').readFileSync('harness/boundaries.config.json','utf8'))\"`",
  );
  process.exit(2);
}

const modules = config.modules && typeof config.modules === "object" ? config.modules : {};
const moduleNames = Object.keys(modules);
const domainModule = config.domainModule || "domain";
const srcRoot = config.srcRoot || "src";
const allowedShared = new Set([domainModule, ...(config.allowedSharedTargets || [])]);
const targetKinds = config.targetKinds || {};
const infraList = new Set(targetKinds.infrastructure || []);
const sharedList = new Set(targetKinds.shared_kernel || []);
const infraRe = new RegExp(config.infraNamePattern || "db|database|repositor|store|client|config|flag|billing|storage|cache|queue|http|sdk", "i");
const contractRe = new RegExp(config.contractSymbolPattern || "validation|payload|schema|contract|model|type|dto", "i");

// Names the resolver recognises as project-internal targets.
const knownNames = new Set([
  ...moduleNames, domainModule,
  ...(config.allowedSharedTargets || []),
  ...infraList, ...sharedList,
]);

// ---------------------------------------------------------------------------
// Language adapters: content -> [{ path, symbols[], raw }]
// Adding a language is ~20 lines: an extractor + a file-extension list.
// ---------------------------------------------------------------------------
const ADAPTERS = {
  python: {
    exts: [".py"],
    extract(content) {
      const out = [];
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.split("#")[0]; // strip trailing comments (imports never contain '#')
        let m = /^\s*from\s+([.\w]+)\s+import\s+(.+)$/.exec(line);
        if (m) {
          const symbols = m[2].replace(/[()]/g, " ").split(/[,\s]+/)
            .filter((s) => s && s !== "as").map((s) => s.split(/\s+as\s+/)[0]);
          out.push({ path: m[1], symbols, raw: line.trim() });
          continue;
        }
        m = /^\s*import\s+(.+)$/.exec(line);
        if (m) {
          for (const part of m[1].split(",")) {
            const p = part.trim().split(/\s+as\s+/)[0].trim();
            if (p) out.push({ path: p, symbols: [p.split(".").pop()], raw: line.trim() });
          }
        }
      }
      return out;
    },
  },
  typescript: {
    exts: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".cts"],
    extract(content) {
      const out = [];
      let m;
      const reFrom = /import\s+(?:type\s+)?([^;'"]*?)\s+from\s+['"]([^'"]+)['"]/g;
      while ((m = reFrom.exec(content))) {
        const symbols = (m[1].match(/[A-Za-z_$][\w$]*/g) || []).filter((s) => !["type", "as"].includes(s));
        out.push({ path: m[2], symbols, raw: m[0].trim() });
      }
      const reSide = /import\s+['"]([^'"]+)['"]/g;
      while ((m = reSide.exec(content))) out.push({ path: m[1], symbols: [], raw: m[0].trim() });
      const reExport = /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
      while ((m = reExport.exec(content))) out.push({ path: m[1], symbols: [], raw: m[0].trim() });
      const reReq = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((m = reReq.exec(content))) out.push({ path: m[1], symbols: [], raw: m[0].trim() });
      return out;
    },
  },
  go: {
    exts: [".go"],
    extract(content) {
      const out = [];
      let m;
      const single = /^\s*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm;
      while ((m = single.exec(content))) out.push({ path: m[1], symbols: [m[1].split("/").pop()], raw: m[0].trim() });
      const group = /import\s*\(([\s\S]*?)\)/g;
      while ((m = group.exec(content))) {
        for (const line of m[1].split(/\r?\n/)) {
          const lm = /(?:[\w.]+\s+)?"([^"]+)"/.exec(line);
          if (lm) out.push({ path: lm[1], symbols: [lm[1].split("/").pop()], raw: line.trim() });
        }
      }
      return out;
    },
  },
};

const language = config.language || "unknown";
const adapter = ADAPTERS[language];
if (!adapter) {
  console.log(`boundaries: language "${language}" is not supported (skipping)`);
  console.log(`  NOTE: available adapters: ${Object.keys(ADAPTERS).join(", ")}.`);
  writeSkipReport(`unsupported-language:${language}`);
  process.exit(0);
}

if (moduleNames.length === 0) {
  console.log("boundaries: configured but no modules declared yet (skipping)");
  console.log("  NOTE: add entries under \"modules\" in harness/boundaries.config.json once they exist.");
  writeSkipReport("no-modules-declared");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// File discovery per module
// ---------------------------------------------------------------------------
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv", "venv", "target", "coverage"]);
function walkFiles(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return acc; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      walkFiles(full, acc);
    } else if (adapter.exts.includes(path.extname(e.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function moduleDir(value) {
  // Support trailing glob markers (`dir/**`, `dir/*`) by stripping them.
  const cleaned = String(value).replace(/\/\*+$/, "");
  return path.resolve(ROOT, srcRoot, cleaned);
}

const sourceRootPath = path.resolve(ROOT, srcRoot);
if (!fs.existsSync(sourceRootPath)) {
  console.log(`boundaries: source root "${srcRoot}" does not exist (skipping)`);
  writeSkipReport(`source-root-missing:${srcRoot}`);
  process.exit(0);
}
const configuredSourceFiles = Object.values(modules)
  .flatMap((value) => walkFiles(moduleDir(value), []));
if (configuredSourceFiles.length === 0) {
  console.log("boundaries: configured module paths contain no supported source files (skipping)");
  writeSkipReport("no-module-source-files");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Target resolution + classification
// ---------------------------------------------------------------------------
function resolveTarget(importPath) {
  const segs = String(importPath).split(/[\/.]/).filter((s) => s && s !== "." && s !== "..");
  for (const seg of segs) {
    if (knownNames.has(seg)) return seg;
  }
  // Heuristic catch: an unlisted infrastructure-looking segment still counts.
  for (const seg of segs) {
    if (infraRe.test(seg)) return seg;
  }
  return null; // external / stdlib / third-party / unresolved
}

function classifyTargetKind(target) {
  // Explicit config is authoritative and wins over the name heuristic, so a
  // legitimately declared module named like an infra word (e.g. `store`,
  // `client`, `cache`) is NOT mislabeled infrastructure. The regex heuristic
  // only applies to *unlisted* targets — overly broad heuristics that override
  // explicit intent are the F3/F6 false-positive failure mode.
  if (infraList.has(target)) return "infrastructure";                                // explicit infra
  if (Object.prototype.hasOwnProperty.call(modules, target)) return "peer_module";   // a declared module is always a peer
  if (sharedList.has(target)) return "shared_kernel";                                // explicitly blessed candidate
  if (infraRe.test(target)) return "infrastructure";                                 // heuristic for unlisted targets only
  return "shared_kernel"; // unknown leaf -> candidate shared kernel (policy gap)
}

function classifyEdge(target, symbols) {
  const kind = classifyTargetKind(target);
  const isContract = (symbols || []).some((s) => contractRe.test(s)) || contractRe.test(target);
  if (kind === "infrastructure") return { kind, cls: "infra_leak", severity: "high" };
  if (kind === "peer_module") {
    return isContract
      ? { kind, cls: "misplaced_contract", severity: "medium" }
      : { kind, cls: "peer_coupling", severity: "high" };
  }
  return { kind, cls: "policy_gap", severity: "low" };
}

const PRESCRIBED_FIX = {
  policy_gap: "bless the target into the shared kernel / domain (add it to allowedSharedTargets) once it is verified pure/no-IO.",
  misplaced_contract: "move the shared contract/type into the domain layer; import it from there.",
  infra_leak: "inject the dependency via a port; the orchestrator wires the concrete infrastructure.",
  peer_coupling: "invert the dependency through the orchestrator, or define the needed interface in the domain layer.",
};

// ---------------------------------------------------------------------------
// Measure
// ---------------------------------------------------------------------------
function measure() {
  const edges = [];
  const classCounts = { policy_gap: 0, misplaced_contract: 0, infra_leak: 0, peer_coupling: 0 };
  let strictTotal = 0;
  let verbatimTotal = 0;

  for (const name of moduleNames) {
    const dir = moduleDir(modules[name]);
    const files = walkFiles(dir, []);
    for (const file of files) {
      let content;
      try { content = fs.readFileSync(file, "utf8"); } catch { continue; }
      const rel = path.relative(ROOT, file);
      for (const imp of adapter.extract(content)) {
        const target = resolveTarget(imp.path);
        // Verbatim (naive grep): everything that is not a domain import.
        const firstSeg = String(imp.path).split(/[\/.]/).filter(Boolean)[0];
        const isDomainImport = target === domainModule || firstSeg === domainModule;
        if (!isDomainImport) verbatimTotal++;

        if (target === null) continue;          // stdlib / external -> strict ignores (F6)
        if (target === name) continue;           // intra-module -> allowed
        if (allowedShared.has(target)) continue; // domain or sanctioned shared kernel -> allowed (F3)

        const c = classifyEdge(target, imp.symbols);
        classCounts[c.cls]++;
        strictTotal++;
        edges.push({
          from: name, to: target, class: c.cls, severity: c.severity,
          kind: c.kind, symbol: (imp.symbols && imp.symbols[0]) || null,
          file: rel, statement: imp.raw,
        });
      }
    }
  }
  return { edges, classCounts, strictTotal, verbatimTotal };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) {
    return { classes: { policy_gap: 0, misplaced_contract: 0, infra_leak: 0, peer_coupling: 0 }, violations_total: 0, missing: true };
  }
  try {
    const b = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    const classes = b.classes && typeof b.classes === "object"
      ? { policy_gap: 0, misplaced_contract: 0, infra_leak: 0, peer_coupling: 0, ...b.classes }
      : null;
    return { ...b, classes, violations_total: b.violations_total ?? (classes ? Object.values(classes).reduce((a, x) => a + x, 0) : 0) };
  } catch (e) {
    blocker(
      `harness/boundaries.baseline.json: invalid JSON — ${e.message}`,
      "the ratchet needs a parseable baseline to compare against",
      "fix the JSON, or regenerate it: node harness/lib/check-boundaries.mjs --update-baseline",
    );
    process.exit(2);
  }
}

function buildReport(m) {
  return {
    schemaVersion: 1,
    ts: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    sha: gitSha(),
    status: "checked",
    skipped: false,
    reason: null,
    language, srcRoot,
    canonical: "strict",
    strict: { violations_total: m.strictTotal, classes: m.classCounts, edges: m.edges },
    verbatim: { violations_total: m.verbatimTotal, note: "naive grep count incl. stdlib — over-reports (F6); never gates" },
    _provenance: "boundary post-mortem F1/F2/F3/F6 — docs/decisions/2026-05-30-boundary-gate-postmortem.md",
  };
}

function writeJson(report) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`boundaries: wrote evidence artifact -> ${path.relative(ROOT, jsonPath)}`);
}

function appendTrend(report) {
  const line = JSON.stringify({
    sha: report.sha, ts: report.ts,
    violations_total: report.strict.violations_total,
    classes: report.strict.classes,
  });
  fs.mkdirSync(path.dirname(trendPath), { recursive: true });
  fs.appendFileSync(trendPath, line + "\n");
  console.log(`boundaries: appended trend point -> ${path.relative(ROOT, trendPath)}`);
}

function printSummary(m) {
  console.log("Module boundary check (strict = canonical; stdlib always allowed)");
  console.log("================================================================");
  console.log(`  Language:            ${language}`);
  console.log(`  Modules checked:     ${moduleNames.length}`);
  console.log(`  Violations (strict): ${m.strictTotal}   <- canonical; this is what the ratchet uses`);
  console.log(`  Violations (verbatim): ${m.verbatimTotal}   <- what a naive grep would flag (incl. stdlib/3rd-party); shown for contrast only, NEVER gates (F6)`);
  console.log("  By severity class:");
  for (const cls of CLASSES) console.log(`    ${cls.padEnd(20)} ${m.classCounts[cls]}`);
  if (m.edges.length) {
    console.log("  Forbidden edges:");
    for (const e of m.edges) {
      console.log(`    [${e.class}/${e.severity}] ${e.from} -> ${e.to}  (${e.symbol || "*"})  ${e.file}`);
      console.log(`        ${e.statement}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------
const m = measure();
const report = buildReport(m);
if (wantJson) writeJson(report);
if (trendPath) appendTrend(report);

if (wantUpdateBaseline) {
  const out = {
    violations_total: m.strictTotal,
    classes: m.classCounts,
    edges: m.edges.map((e) => `${e.from} -> ${e.to} [${e.class}]`),
    established: new Date().toISOString().slice(0, 10),
    note: "ratchet: a class may go DOWN, never UP — see F8. infra_leak/peer_coupling target 0.",
  };
  fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + "\n");
  console.log(`boundaries: baseline updated -> strict=${m.strictTotal} ${JSON.stringify(m.classCounts)}`);
  process.exit(0);
}

if (wantReport) {
  printSummary(m);
  process.exit(0);
}

// Default: --check (ratchet gate, per class).
const baseline = loadBaseline();
const regressions = [];
const warns = [];
const notes = [];
for (const cls of CLASSES) {
  const cur = m.classCounts[cls];
  const base = baseline.classes ? baseline.classes[cls] : 0;
  if (cur > base) {
    regressions.push({ cls, cur, base });
  } else if (cur < base) {
    notes.push(`${cls}: ${cur} < baseline ${base} — improvement! lower the baseline: node harness/lib/check-boundaries.mjs --update-baseline`);
  } else if (cur > 0 && ZERO_TARGET_CLASSES.has(cls)) {
    warns.push(`${cls}: ${cur} at baseline (target is 0) — schedule paydown; this debt must trend down (F4/F8).`);
  }
}

if (regressions.length > 0) {
  console.error(`Boundary ratchet FAILED — ${regressions.length} severity class(es) increased over baseline:`);
  console.error("");
  for (const r of regressions) {
    const newEdges = m.edges.filter((e) => e.class === r.cls);
    const hardZero = ZERO_TARGET_CLASSES.has(r.cls) && r.base === 0;
    blocker(
      `${r.cls}: ${r.cur} > baseline ${r.base}${hardZero ? " (HARD-ZERO class — any new edge fails)" : ""}`,
      `a new forbidden edge of class '${r.cls}' appeared; the ratchet only allows counts to stay flat or go down (F8). Pre-existing debt (F4) is grandfathered, regressions are not.`,
      `${PRESCRIBED_FIX[r.cls]} Offending edges:\n` +
        newEdges.map((e) => `    ${e.from} -> ${e.to} (${e.symbol || "*"}) in ${e.file}`).join("\n"),
    );
    console.error("");
  }
  for (const w of warns) console.error(`  [warn] ${w}`);
  console.error("If this edge is a legitimate shared-kernel/DRY refactor (F3), add the target to");
  console.error("`allowedSharedTargets` in harness/boundaries.config.json instead of weakening the gate.");
  process.exit(1);
}

console.log(`OK: boundary ratchet green — strict=${m.strictTotal} ${JSON.stringify(m.classCounts)} (canonical=strict; baseline not exceeded).`);
for (const w of warns) console.log(`  [warn] ${w}`);
for (const n of notes) console.log(`  NOTE: ${n}`);
process.exit(0);
