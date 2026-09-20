import { describe, expect, it } from "vitest";
import type { Canon } from "./types.js";
import { validateCanon } from "./validate.js";

function emptyCanon(over: Partial<Canon> = {}): Canon {
  return {
    meta: {
      version: "t",
      spice_level: 2,
      slice: { parts: [1], last_gate: "gate.p1.g1" },
      calendar: { start_day: 1, sunday: 0, rent_day: 1 },
    },
    characters: [],
    locations: [],
    scenes: [],
    gates: [],
    secrets: [],
    witnesses: [],
    beliefs: [],
    conditions: [],
    incidents: [],
    text: {},
    ...over,
  };
}

describe("validator", () => {
  it("fails a romanceable minor", () => {
    const issues = validateCanon(
      emptyCanon({
        characters: [
          {
            id: "char.kid",
            display_name: "Kid",
            age: 16,
            tier: "day-player",
            liminal: false,
            romance: { available: true },
            knows: [],
            refuses: false,
          },
        ],
      }),
    );
    expect(issues.some((i) => i.code === "age-rule")).toBe(true);
  });

  it("fails a side strand without hooks_back", () => {
    const issues = validateCanon(
      emptyCanon({
        locations: [
          {
            id: "loc.x",
            display_name: "X",
            levels: { l1: { name: "L", phase: 0 } },
            nodes: [],
            edges: [],
            sightlines: [],
            earshot: [],
          },
        ],
        scenes: [
          {
            id: "scene.date",
            part: 1,
            slot: "evening",
            location: "loc.x",
            cast: [],
            tags: ["romance"],
            requires: { phase_min: 0, all: [], none: [] },
            beat: "x",
            choices: [{ id: "a", label: "A", effects: [] }],
            witnesses: [],
            hooks_back: [],
          },
        ],
      }),
    );
    expect(issues.some((i) => i.code === "hooks-back")).toBe(true);
  });

  it("fails a gate without a date trigger", () => {
    const issues = validateCanon(
      emptyCanon({
        scenes: [
          {
            id: "scene.g",
            part: 1,
            slot: "gate-internal",
            location: "loc.x",
            cast: [],
            tags: [],
            requires: { phase_min: 0, all: [], none: [] },
            beat: "x",
            choices: [{ id: "a", label: "A", effects: [] }],
            witnesses: [],
            hooks_back: [],
          },
        ],
        gates: [
          {
            id: "gate.p1.g1",
            name: "G",
            part: 1,
            order: 1,
            trigger: { progress: { all: [] }, date: { day: 0 } },
            scene: "scene.g",
            asks_theory_question: false,
            breaks_beliefs: [],
            opens_phase: null,
          },
        ],
      }),
    );
    expect(issues.some((i) => i.code === "dual-trigger" || i.code === "ref")).toBe(true);
  });

  it("fails an unknown enter or start_incident on a choice", () => {
    const issues = validateCanon(
      emptyCanon({
        locations: [
          {
            id: "loc.x",
            display_name: "X",
            levels: { l1: { name: "L", phase: 0 } },
            nodes: [],
            edges: [],
            sightlines: [],
            earshot: [],
          },
        ],
        scenes: [
          {
            id: "scene.g",
            part: 1,
            slot: "gate-internal",
            location: "loc.x",
            cast: [],
            tags: [],
            requires: { phase_min: 0, all: [], none: [] },
            beat: "x",
            choices: [{ id: "a", label: "A", effects: [{ enter: "scene.missing" }, { start_incident: "incident.missing" }] }],
            witnesses: [],
            hooks_back: [],
          },
        ],
      }),
    );
    expect(issues.some((i) => i.message.includes("unknown scene scene.missing"))).toBe(true);
    expect(issues.some((i) => i.message.includes("unknown incident incident.missing"))).toBe(true);
  });

  it("fails an intimate scene tagged coercion", () => {
    const issues = validateCanon(
      emptyCanon({
        scenes: [
          {
            id: "scene.bad",
            part: 1,
            slot: "evening",
            location: "loc.x",
            cast: [],
            tags: ["intimate", "coercion"],
            requires: { phase_min: 0, all: [], none: [] },
            beat: "x",
            choices: [{ id: "a", label: "A", effects: [] }],
            witnesses: [],
            hooks_back: [],
            intimate: { consent: "negotiated", mode: "play" },
          },
        ],
      }),
    );
    expect(issues.some((i) => i.code === "consent")).toBe(true);
  });
});
