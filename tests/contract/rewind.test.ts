import { describe, expect, it } from "vitest";
import { canonicalState, createRng, fold, propose, rewind, startRun } from "@contrejour/engine";
import { loadSlice } from "../helpers.js";

describe("rewind", () => {
  it("rewinding to evening 0 equals the fold of the start of that evening", () => {
    const canon = loadSlice();
    let events = startRun(canon, 5, "honest", "rw");
    const rng = createRng(5);
    while (fold(canon, events).currentScene || fold(canon, events).incident) {
      const scene = canon.scenes.find((s) => s.id === fold(canon, events).currentScene);
      const choiceId = scene?.choices[0]?.id;
      if (!choiceId) break;
      events = propose(canon, events, { type: "choose", choiceId }, rng);
    }
    events = propose(canon, events, { type: "advance_evening" }, rng);
    const reset = rewind(canon, events, 0, "honest");
    if ("error" in reset) throw new Error(reset.error);
    const start = startRun(canon, 5, "honest", "other");
    expect(canonicalState(fold(canon, reset))).toEqual(canonicalState(fold(canon, start)));
  });

  it("rejects Honest rewind beyond the previous evening", () => {
    const canon = loadSlice();
    let events = startRun(canon, 5, "honest", "rw");
    const rng = createRng(5);
    for (let i = 0; i < 8; i += 1) {
      if (fold(canon, events).currentScene) {
        const scene = canon.scenes.find((s) => s.id === fold(canon, events).currentScene);
        events = propose(canon, events, { type: "choose", choiceId: scene?.choices[0]?.id ?? "go" }, rng);
      } else {
        events = propose(canon, events, { type: "advance_evening" }, rng);
      }
    }
    expect(fold(canon, events).evening).toBeGreaterThan(1);
    const denied = rewind(canon, events, 0, "honest");
    expect(denied).toEqual({ error: "rewind-beyond-honest" });
  });
});
