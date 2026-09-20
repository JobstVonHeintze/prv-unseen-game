import type { Canon, Scene } from "@contrejour/canon";

export function renderScene(canon: Canon, scene: Scene): { text: string; provenance: "hand" | "beat" } {
  const hand = canon.text[scene.id];
  if (hand && hand.trim().length > 0) return { text: hand, provenance: "hand" };
  return { text: scene.beat, provenance: "beat" };
}
