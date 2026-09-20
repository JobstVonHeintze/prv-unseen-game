import type { Canon, Choice, Condition } from "@contrejour/canon";
import type { State } from "./types.js";

export function conditionId(slug: string): string {
  return slug.startsWith("condition.") ? slug : `condition.${slug}`;
}

export function conditionDef(canon: Canon, id: string): Condition | undefined {
  return canon.conditions.find((c) => c.id === conditionId(id));
}

export function currentLevel(state: State, def: Condition): string {
  return state.conditions[def.id] ?? def.default;
}

export function levelIndex(def: Condition, level: string): number {
  const index = def.levels.indexOf(level);
  return index === -1 ? 0 : index;
}

export function choiceAllowed(canon: Canon, state: State, choice: Choice): boolean {
  const flags = choice.requires?.flags;
  if (flags) {
    if (!flags.all.every((f) => state.flags[f])) return false;
    if (flags.none.some((f) => state.flags[f])) return false;
  }
  const rules = choice.requires?.conditions;
  if (!rules) return true;
  for (const [slug, rule] of Object.entries(rules)) {
    const def = conditionDef(canon, slug);
    if (!def) return false;
    const level = currentLevel(state, def);
    const index = levelIndex(def, level);
    if (rule.max && index > levelIndex(def, rule.max)) return false;
    if (rule.min && index < levelIndex(def, rule.min)) return false;
    if (rule.in && !rule.in.includes(level)) return false;
  }
  return true;
}

export function feltLines(canon: Canon, state: State): string[] {
  const lines: string[] = [];
  for (const def of canon.conditions) {
    const level = currentLevel(state, def);
    const line = def.felt[level];
    if (line) lines.push(line);
  }
  return lines;
}

export function conditionRows(canon: Canon, state: State): Array<{
  id: string;
  level: string;
  lastChange: string;
  gates: string[];
}> {
  return canon.conditions.map((def) => {
    const level = currentLevel(state, def);
    const gates: string[] = [];
    for (const scene of canon.scenes) {
      for (const choice of scene.choices) {
        if (!choice.requires?.conditions) continue;
        const allowed = choiceAllowed(canon, state, choice);
        gates.push(`${allowed ? "open" : "blocked"}:${choice.id}`);
      }
    }
    return {
      id: def.id,
      level,
      lastChange: state.conditionChanged[def.id] ?? "default",
      gates,
    };
  });
}
