import { describe, expect, it } from "vitest";
import type { Canon, Scene } from "@contrejour/canon";
import { renderScene } from "./index.js";

const scene: Scene = {
  id: "scene.g1",
  part: 1,
  slot: "gate-internal",
  location: "loc.x",
  cast: [],
  tags: [],
  requires: { phase_min: 0, all: [], none: [] },
  beat: "the beat",
  choices: [{ id: "a", label: "A", effects: [] }],
  witnesses: [],
  hooks_back: [],
};

describe("renderer stub", () => {
  it("lets handwritten text win", () => {
    const canon = { text: { "scene.g1": "hand written" } } as unknown as Canon;
    expect(renderScene(canon, scene)).toEqual({ text: "hand written", provenance: "hand" });
  });

  it("falls back to the beat", () => {
    const canon = { text: {} } as unknown as Canon;
    expect(renderScene(canon, scene).provenance).toBe("beat");
  });
});
