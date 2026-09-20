import { describe, expect, it } from "vitest";
import { createRng, fold, propose, startRun } from "@contrejour/engine";
import { loadSlice } from "../helpers.js";

describe("witness to consequence", () => {
  it("Blanche observes an arrival and tells Cédric the same evening", () => {
    const canon = loadSlice();
    let events = startRun(canon, 2, "honest", "w");
    const rng = createRng(2);
    while (fold(canon, events).currentScene || fold(canon, events).incident) {
      const scene = canon.scenes.find((s) => s.id === fold(canon, events).currentScene);
      const choiceId = scene?.choices[0]?.id;
      if (!choiceId) break;
      events = propose(canon, events, { type: "choose", choiceId }, rng);
    }
    events = propose(canon, events, { type: "enter_scene", sceneId: "scene.cedric-lunch" }, rng);
    const state = fold(canon, events);
    expect(
      state.witnessQueue.some((q) => q.from === "witness.blanche" && q.to === "witness.cedric") ||
        state.told.includes("witness.blanche->witness.cedric") ||
        state.flags["flag.blanche-told-cedric"],
    ).toBe(true);
  });
});
