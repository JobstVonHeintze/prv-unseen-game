import { describe, expect, it, afterEach } from "vitest";
import { fetchClient, runDrifter } from "@contrejour/rehearsal";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("gate reach", () => {
  it("date-trigger: the drifter reaches every Part I gate", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const gates = await runDrifter(await fetchClient(s.url), 11, 80);
    expect(gates).toEqual([
      "gate.p1.g1",
      "gate.p1.g2",
      "gate.p1.g3",
      "gate.p1.g4",
      "gate.p1.g5",
      "gate.p1.g6",
      "gate.p1.g7",
    ]);
  });

  it("progress-trigger: wardrobe and pulse can fire before their dates", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 4 }) });
    const id = (run.body as { runId: string }).runId;
    const play = async (action: unknown) =>
      json(s.url, `/v1/runs/${id}/actions`, { method: "POST", body: JSON.stringify(action) });
    const view = async () => (await json(s.url, `/v1/runs/${id}/view`)).body as {
      currentScene: { choices: Array<{ id: string }> } | null;
      day: number;
    };
    const fired = async () => {
      const tl = await json(s.url, `/v1/runs/${id}/timeline`);
      return (tl.body as { evenings: Array<{ gates: string[] }> }).evenings.flatMap((e) => e.gates);
    };
    const choose = async () => {
      const scene = (await view()).currentScene;
      if (scene) await play({ type: "choose", choiceId: scene.choices[0]!.id });
    };
    for (let i = 0; i < 40; i += 1) {
      const gates = await fired();
      if (gates.includes("gate.p1.g5")) break;
      if ((await view()).currentScene) await choose();
      else await play({ type: "advance_evening" });
    }
    expect(await fired()).toContain("gate.p1.g5");
    if ((await view()).currentScene) await choose();
    await play({ type: "enter_scene", sceneId: "scene.wardrobe-search" });
    await choose();
    await play({ type: "enter_scene", sceneId: "scene.mother-call" });
    await choose();
    const before = await json(s.url, `/v1/console/runs/${id}/state`);
    expect((before.body as { flags: Record<string, boolean> }).flags["flag.found-green-dress"]).toBe(true);
    expect((before.body as { flags: Record<string, boolean> }).flags["flag.mother-no-answer"]).toBe(true);
    expect((await view()).day).toBeLessThan(16);
    await play({ type: "advance_evening" });
    const after = await fired();
    expect(after.includes("gate.p1.g6") || after.includes("gate.p1.g7")).toBe(true);
    expect((await view()).day).toBeLessThan(16);
  });
});
