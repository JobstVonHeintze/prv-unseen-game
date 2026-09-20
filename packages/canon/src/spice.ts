import type { Scene } from "./types.js";

export type SpiceLevel = 1 | 2 | 3;

export interface SpiceText {
  l1: string;
  l2: string;
  l3?: string;
}

const PLACEHOLDER = /\[LEVEL 3 PLACEHOLDER/i;

export function isPlaceholder(text: string | undefined): boolean {
  return !text || text.trim().length === 0 || PLACEHOLDER.test(text);
}

export function effectiveSpice(requested: SpiceLevel, scene?: Scene): SpiceLevel {
  if (scene?.tags.includes("coercion")) return 1;
  if (scene?.intimate?.mode === "currency-down") return 1;
  return requested;
}

export function spiceLine(
  map: SpiceText | undefined,
  requested: SpiceLevel,
  scene?: Scene,
): { text: string; shown: SpiceLevel; placeholder: boolean } {
  if (!map) return { text: "", shown: requested, placeholder: false };
  const level = effectiveSpice(requested, scene);
  if (level === 1) return { text: map.l1, shown: 1, placeholder: false };
  if (level === 3 && !isPlaceholder(map.l3)) return { text: map.l3 ?? map.l2, shown: 3, placeholder: false };
  if (level === 3 && isPlaceholder(map.l3)) {
    return { text: map.l2, shown: 2, placeholder: true };
  }
  return { text: map.l2, shown: 2, placeholder: isPlaceholder(map.l3) };
}
