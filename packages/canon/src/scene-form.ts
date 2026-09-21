import { parse as parseYaml, parseDocument } from "yaml";

export const EFFECT_KINDS = ["set", "bank", "enter", "start_incident", "spine", "step"] as const;

export type SceneFormEffect = { kind: (typeof EFFECT_KINDS)[number]; value: string };
export type SceneFormChoice = { id: string; label: string; effects: SceneFormEffect[] };
export type SceneForm = {
  id: string;
  beat: string;
  tags: string[];
  choices: SceneFormChoice[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function effectsFromRaw(raw: unknown): SceneFormEffect[] {
  if (!Array.isArray(raw)) return [];
  const out: SceneFormEffect[] = [];
  for (const item of raw) {
    const obj = asRecord(item);
    if (!obj) continue;
    const kind = EFFECT_KINDS.find((k) => k in obj);
    if (!kind) continue;
    out.push({ kind, value: String(obj[kind] ?? "") });
  }
  return out;
}

export function sceneFormFromYaml(source: string): SceneForm | null {
  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch {
    return null;
  }
  const obj = asRecord(raw);
  if (!obj || typeof obj.id !== "string" || !obj.id.startsWith("scene.")) return null;
  const choices = Array.isArray(obj.choices) ? obj.choices : [];
  return {
    id: obj.id,
    beat: typeof obj.beat === "string" ? obj.beat : "",
    tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [],
    choices: choices.map((row) => {
      const choice = asRecord(row) ?? {};
      return {
        id: String(choice.id ?? ""),
        label: String(choice.label ?? ""),
        effects: effectsFromRaw(choice.effects),
      };
    }),
  };
}

export function applySceneForm(source: string, form: SceneForm): string {
  const doc = parseDocument(source);
  doc.set("beat", form.beat);
  doc.set("tags", form.tags);
  doc.set(
    "choices",
    form.choices.map((c) => ({
      id: c.id,
      label: c.label,
      effects: c.effects
        .filter((e) => e.value.trim().length > 0)
        .map((e) => ({ [e.kind]: e.value.trim() })),
    })),
  );
  return String(doc);
}
