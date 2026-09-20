import { describe, expect, it } from "vitest";
import { effectiveSpice, spiceLine } from "./spice.js";

describe("spice", () => {
  it("falls back from a level-3 placeholder to l2", () => {
    const shown = spiceLine(
      { l1: "cut", l2: "shoulder", l3: "[LEVEL 3 PLACEHOLDER: hand-written] Brief: x" },
      3,
    );
    expect(shown.text).toBe("shoulder");
    expect(shown.placeholder).toBe(true);
    expect(shown.shown).toBe(2);
  });

  it("locks currency-down and coercion to l1", () => {
    expect(
      effectiveSpice(3, {
        id: "scene.x",
        part: 1,
        slot: "evening",
        location: "loc.x",
        cast: [],
        tags: ["coercion"],
        requires: { phase_min: 0, all: [], none: [] },
        beat: "x",
        choices: [{ id: "a", label: "A", effects: [] }],
        witnesses: [],
        hooks_back: [],
      }),
    ).toBe(1);
  });
});
