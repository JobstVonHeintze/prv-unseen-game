import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
import type { Canon, CanonIndex } from "./types.js";

function listYaml(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

function loadMany<T>(dir: string, parse: (raw: unknown) => T): T[] {
  return listYaml(dir).map((file) => {
    const raw = parseYaml(readFileSync(file, "utf8"));
    return parse(raw);
  });
}

function loadText(dir: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      const id = name.replace(/\.md$/, "");
      out[id] = readFileSync(join(dir, name), "utf8");
    }
    return out;
  } catch {
    return {};
  }
}

export function loadCanon(root: string): Canon {
  const meta = MetaSchema.parse(parseYaml(readFileSync(join(root, "meta.yaml"), "utf8")));
  return {
    meta,
    characters: loadMany(join(root, "characters"), (r) => CharacterSchema.parse(r)),
    locations: loadMany(join(root, "locations"), (r) => LocationSchema.parse(r)),
    scenes: loadMany(join(root, "scenes"), (r) => SceneSchema.parse(r)),
    gates: loadMany(join(root, "gates"), (r) => GateSchema.parse(r)),
    secrets: loadMany(join(root, "secrets"), (r) => SecretSchema.parse(r)),
    witnesses: loadMany(join(root, "witnesses"), (r) => WitnessSchema.parse(r)),
    beliefs: loadMany(join(root, "beliefs"), (r) => BeliefSchema.parse(r)),
    conditions: loadMany(join(root, "conditions"), (r) => ConditionSchema.parse(r)),
    incidents: loadMany(join(root, "incidents"), (r) => IncidentSchema.parse(r)),
    text: loadText(join(root, "text")),
  };
}

export function writeIndex(canon: Canon, outPath: string): CanonIndex {
  const ids = [
    ...canon.characters.map((e) => e.id),
    ...canon.locations.map((e) => e.id),
    ...canon.locations.flatMap((l) => l.nodes.map((n) => n.id)),
    ...canon.scenes.map((e) => e.id),
    ...canon.gates.map((e) => e.id),
    ...canon.secrets.map((e) => e.id),
    ...canon.witnesses.map((e) => e.id),
    ...canon.beliefs.map((e) => e.id),
    ...canon.conditions.map((e) => e.id),
    ...canon.incidents.map((e) => e.id),
  ];
  const index: CanonIndex = {
    version: canon.meta.version,
    ids,
    byType: {
      character: canon.characters.map((e) => e.id),
      location: canon.locations.map((e) => e.id),
      scene: canon.scenes.map((e) => e.id),
      gate: canon.gates.map((e) => e.id),
      secret: canon.secrets.map((e) => e.id),
      witness: canon.witnesses.map((e) => e.id),
      belief: canon.beliefs.map((e) => e.id),
      condition: canon.conditions.map((e) => e.id),
      incident: canon.incidents.map((e) => e.id),
    },
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n");
  return index;
}

export function queryIndex(index: CanonIndex, type?: string): string[] {
  if (!type) return index.ids;
  return index.byType[type] ?? [];
}
