import { describe, expect, it } from "vitest";
import { canonicalState, createRng, fold, propose, startRun } from "@contrejour/engine";
import { loadSlice } from "../helpers.js";

describe("determinism", () => {
  it("replays an event log to the same canonical state", () => {
    const canon = loadSlice();
    const events = startRun(canon, 21, "honest", "x");
    expect(canonicalState(fold(canon, events))).toEqual(canonicalState(fold(canon, events)));
    const first = fold(canon, events).currentScene
      ? (canon.scenes.find((s) => s.id === fold(canon, events).currentScene)?.choices[0]?.id ?? "leave-street")
      : "leave-street";
    const a = propose(canon, events, { type: "choose", choiceId: first }, createRng(21));
    const b = propose(canon, events, { type: "choose", choiceId: first }, createRng(21));
    expect(canonicalState(fold(canon, a))).toEqual(canonicalState(fold(canon, b)));
  });
});
