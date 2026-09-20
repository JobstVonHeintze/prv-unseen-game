import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  BeliefSchema,
  CharacterSchema,
  ConditionSchema,
  GateSchema,
  IncidentSchema,
  LocationSchema,
  MetaSchema,
  SceneSchema,
  SecretSchema,
  WitnessSchema,
} from "./schemas.js";
import type { Canon, ValidationIssue } from "./types.js";
import { validateCanon } from "./validate.js";

const ALLOWED = new Set([
  "characters",
  "locations",
  "scenes",
  "gates",
  "secrets",
  "witnesses",
  "beliefs",
  "conditions",
  "incidents",
  "text",
]);

export function safeCanonPath(root: string, rel: string): string {
  const trimmed = rel.replace(/^\/+/, "").replaceAll("\\", "/");
  if (!trimmed || trimmed.includes("\0")) throw new Error("invalid-path");
  const abs = resolve(root, trimmed);
  const relToRoot = relative(resolve(root), abs);
  if (relToRoot.startsWith("..") || relToRoot === "") throw new Error("invalid-path");
  const first = normalize(trimmed).split(/[\\/]/)[0] ?? "";
  if (trimmed !== "meta.yaml" && !ALLOWED.has(first)) throw new Error("invalid-path");
  if (sep === "\\" && abs.toLowerCase().indexOf(resolve(root).toLowerCase()) !== 0) throw new Error("invalid-path");
  return abs;
}

export function readCanonFile(root: string, rel: string): string {
  const abs = safeCanonPath(root, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8") : "";
}

export function writeCanonFile(root: string, rel: string, body: string): void {
  const abs = safeCanonPath(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body);
}

export function unifiedDiff(before: string, after: string, rel: string): string {
  if (before === after) return `--- a/${rel}\n+++ b/${rel}\n`;
  const a = before.split("\n");
  const b = after.split("\n");
  const lines = [`--- a/${rel}`, `+++ b/${rel}`, "@@"];
  for (const line of a) lines.push(`-${line}`);
  for (const line of b) lines.push(`+${line}`);
  return lines.join("\n");
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((e) => e.id === item.id);
  if (i === -1) return [...list, item];
  return list.map((e, idx) => (idx === i ? item : e));
}

export function previewProposal(canon: Canon, rel: string, after: string): {
  entityId: string;
  issues: ValidationIssue[];
} {
  try {
    safeCanonPath("/canon-root", rel);
  } catch {
    return { entityId: rel, issues: [{ severity: "error", code: "path", message: `path not allowed: ${rel}` }] };
  }
  const next: Canon = {
    ...canon,
    characters: [...canon.characters],
    locations: [...canon.locations],
    scenes: [...canon.scenes],
    gates: [...canon.gates],
    secrets: [...canon.secrets],
    witnesses: [...canon.witnesses],
    beliefs: [...canon.beliefs],
    conditions: [...canon.conditions],
    incidents: [...canon.incidents],
    text: { ...canon.text },
  };
  try {
    if (rel === "meta.yaml") {
      next.meta = MetaSchema.parse(parseYaml(after));
      return { entityId: "meta", issues: validateCanon(next) };
    }
    if (rel.startsWith("text/") && rel.endsWith(".md")) {
      const id = rel.slice("text/".length, -".md".length);
      next.text[id] = after;
      return { entityId: id, issues: validateCanon(next) };
    }
    const raw = parseYaml(after);
    const dir = rel.split("/")[0];
    if (dir === "characters") {
      const item = CharacterSchema.parse(raw);
      next.characters = upsert(next.characters, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "locations") {
      const item = LocationSchema.parse(raw);
      next.locations = upsert(next.locations, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "scenes") {
      const item = SceneSchema.parse(raw);
      next.scenes = upsert(next.scenes, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "gates") {
      const item = GateSchema.parse(raw);
      next.gates = upsert(next.gates, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "secrets") {
      const item = SecretSchema.parse(raw);
      next.secrets = upsert(next.secrets, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "witnesses") {
      const item = WitnessSchema.parse(raw);
      next.witnesses = upsert(next.witnesses, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "beliefs") {
      const item = BeliefSchema.parse(raw);
      next.beliefs = upsert(next.beliefs, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "conditions") {
      const item = ConditionSchema.parse(raw);
      next.conditions = upsert(next.conditions, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    if (dir === "incidents") {
      const item = IncidentSchema.parse(raw);
      next.incidents = upsert(next.incidents, item);
      return { entityId: item.id, issues: validateCanon(next) };
    }
    return { entityId: rel, issues: [{ severity: "error", code: "path", message: `unknown canon kind ${rel}` }] };
  } catch (err) {
    return {
      entityId: rel,
      issues: [{ severity: "error", code: "parse", message: err instanceof Error ? err.message : String(err) }],
    };
  }
}

export function proposalHasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
