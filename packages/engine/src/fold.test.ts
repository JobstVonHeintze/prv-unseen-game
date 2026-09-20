import { describe, expect, it } from "vitest";
import type { Canon } from "@contrejour/canon";
import { createRng } from "./rng.js";
import { canonicalState, fold } from "./fold.js";
import { propose, startRun } from "./propose.js";

const canon = {
  meta: {
    version: "t",
    spice_level: 2 as const,
    slice: { parts: [1], last_gate: "gate.p1.g1" },
    calendar: { start_day: 1, sunday: 0, rent_day: 1 },
  },
  characters: [
    { id: "char.elena", display_name: "Elena", age: 24, tier: "core" as const, liminal: false, romance: { available: false }, knows: [], refuses: false },
  ],
  locations: [],
  scenes: [
    {
      id: "scene.g1",
      part: 1,
      slot: "gate-internal" as const,
      location: "loc.x",
      cast: [],
      tags: [],
      requires: { phase_min: 0, all: [], none: [] },
      beat: "gate",
      choices: [{ id: "go", label: "Go on", effects: [] }],
      witnesses: [],
      hooks_back: [],
    },
  ],
  gates: [
    {
      id: "gate.p1.g1",
      name: "One",
      part: 1,
      order: 1,
      trigger: { progress: { all: [] }, date: { day: 1 } },
      scene: "scene.g1",
      asks_theory_question: false,
      breaks_beliefs: [],
      opens_phase: null,
    },
  ],
  secrets: [],
  witnesses: [],
  beliefs: [],
  conditions: [],
  incidents: [],
  text: {},
} satisfies Canon;

describe("fold", () => {
  it("replays to an identical canonical state", () => {
    const a = startRun(canon, 7, "honest", "r1");
    const b = startRun(canon, 7, "honest", "r2");
    const sa = canonicalState(fold(canon, a));
    const sb = canonicalState(fold(canon, b));
    expect(sa).toEqual(sb);
  });

  it("keeps the incident scene on an invalid cover", () => {
    const wet: Canon = {
      ...canon,
      conditions: [
        { id: "condition.wetness", levels: ["dry", "damp", "wet", "soaked"], default: "dry", felt: { dry: "", damp: "d", wet: "w", soaked: "s" } },
      ],
      incidents: [
        {
          id: "incident.rain-street",
          after_choice: { scene: "scene.g1", choices: ["go"] },
          scene: "scene.rain",
          lock: ["advance_evening", "free_roam"],
          pressure: { condition: "condition.wetness", thresholds: [{ at: 1, level: "damp" }] },
          valid: ["gallery-door"],
          fires_gate: "gate.p1.g1",
        },
      ],
      scenes: [
        ...canon.scenes,
        {
          id: "scene.rain",
          part: 1,
          slot: "gate-internal",
          location: "loc.x",
          cast: [],
          tags: [],
          requires: { phase_min: 0, all: [], none: [] },
          beat: "rain",
          choices: [
            { id: "gallery-door", label: "Gallery", effects: [] },
            { id: "awning", label: "Awning", effects: [] },
          ],
          witnesses: [],
          hooks_back: [],
        },
      ],
    };
    const events = [
      { n: 0, t: 0, kind: "run.started" as const, payload: { runId: "r", seed: 1, mode: "honest", canonVersion: "t" } },
      { n: 1, t: 0, kind: "incident.started" as const, payload: { incidentId: "incident.rain-street", sceneId: "scene.rain", pressure: 0 } },
      { n: 2, t: 0, kind: "scene.entered" as const, payload: { sceneId: "scene.rain" } },
      { n: 3, t: 0, kind: "choice.made" as const, payload: { sceneId: "scene.rain", choiceId: "awning", effects: [], resolvesScene: false } },
      { n: 4, t: 0, kind: "incident.ticked" as const, payload: { incidentId: "incident.rain-street", pressure: 1, conditionId: "condition.wetness", level: "damp" } },
    ];
    const state = fold(wet, events);
    expect(state.currentScene).toBe("scene.rain");
    expect(state.incident?.pressure).toBe(1);
    expect(state.conditions["condition.wetness"]).toBe("damp");
  });

  it("starts an incident from after_choice when the choice has no start_incident", () => {
    const wet: Canon = {
      ...canon,
      conditions: [
        { id: "condition.wetness", levels: ["dry", "damp", "wet", "soaked"], default: "dry", felt: { dry: "", damp: "d", wet: "w", soaked: "s" } },
      ],
      incidents: [
        {
          id: "incident.rain-street",
          after_choice: { scene: "scene.g1", choices: ["go"] },
          scene: "scene.rain",
          lock: ["advance_evening", "free_roam"],
          pressure: { condition: "condition.wetness", thresholds: [{ at: 1, level: "damp" }] },
          valid: ["gallery-door"],
        },
      ],
      scenes: [
        ...canon.scenes,
        {
          id: "scene.rain",
          part: 1,
          slot: "gate-internal",
          location: "loc.x",
          cast: [],
          tags: [],
          requires: { phase_min: 0, all: [], none: [] },
          beat: "rain",
          choices: [{ id: "gallery-door", label: "Gallery", effects: [] }],
          witnesses: [],
          hooks_back: [],
        },
      ],
    };
    const events = propose(wet, startRun(wet, 1, "honest", "r"), { type: "choose", choiceId: "go" }, createRng(1));
    const state = fold(wet, events);
    expect(state.incident?.id).toBe("incident.rain-street");
    expect(state.currentScene).toBe("scene.rain");
  });

  it("rejects a choose whose required flags are missing", () => {
    const locked: Canon = {
      ...canon,
      scenes: [
        {
          ...canon.scenes[0]!,
          choices: [
            {
              id: "go",
              label: "Go on",
              effects: [{ set: "flag.should-not-set" }],
              requires: { flags: { all: ["flag.needed"], none: [] } },
            },
          ],
        },
      ],
    };
    const events = startRun(locked, 1, "honest", "r");
    const next = propose(locked, events, { type: "choose", choiceId: "go" }, createRng(1));
    expect(next).toEqual(events);
    expect(fold(locked, next).flags["flag.should-not-set"]).toBeUndefined();
  });

  it("is deterministic under the same actions", () => {
    const rng1 = createRng(9);
    const rng2 = createRng(9);
    let e1 = startRun(canon, 9, "honest", "a");
    let e2 = startRun(canon, 9, "honest", "b");
    e1 = propose(canon, e1, { type: "choose", choiceId: "go" }, rng1);
    e2 = propose(canon, e2, { type: "choose", choiceId: "go" }, rng2);
    expect(canonicalState(fold(canon, e1))).toEqual(canonicalState(fold(canon, e2)));
  });
});
