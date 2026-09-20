import { describe, expect, it, afterEach } from "vitest";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

type Player = {
  currentScene: { id: string; choices: Array<{ id: string }> } | null;
  felt: string[];
  canAdvance: boolean;
};

type ConsoleState = {
  conditions: Array<{ id: string; level: string; lastChange: string; gates: string[] }>;
  incident: null | { id: string; pressure: number };
  flags: Record<string, boolean>;
  firedGates: string[];
};

describe("incidents and felt conditions", () => {
  it("rain starts only after she leaves; only the gallery is valid; time soaks; soaked blocks home", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const created = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 8 }) });
    const id = (created.body as { runId: string }).runId;
    const act = (action: unknown) =>
      json(s.url, `/v1/runs/${id}/actions`, { method: "POST", body: JSON.stringify(action) });
    const view = async () => (await json(s.url, `/v1/runs/${id}/view`)).body as Player;
    const consoleState = async () =>
      (await json(s.url, `/v1/console/runs/${id}/state`)).body as ConsoleState;

    expect((created.body as Player).currentScene?.id).toBe("scene.first-night");
    expect(JSON.stringify(created.body)).not.toContain("condition.");
    expect((await consoleState()).incident).toBeNull();

    await act({ type: "choose", choiceId: "leave-street" });
    expect((await view()).currentScene?.id).toBe("scene.rain-cover");
    expect((await consoleState()).incident?.id).toBe("incident.rain-street");
    expect((await view()).canAdvance).toBe(false);
    const locked = await act({ type: "advance_evening" });
    expect((locked.body as Player).currentScene?.id).toBe("scene.rain-cover");

    await act({ type: "choose", choiceId: "shop-awning" });
    await act({ type: "choose", choiceId: "parked-car" });
    await act({ type: "choose", choiceId: "wait-rain" });
    const soaked = await consoleState();
    expect(soaked.conditions.find((c) => c.id === "condition.wetness")?.level).toBe("soaked");
    expect(soaked.incident?.pressure).toBe(3);

    const wetView = await view();
    expect(wetView.felt.some((line) => line.includes("clings"))).toBe(true);
    expect(JSON.stringify(wetView)).not.toContain("condition.");
    expect(JSON.stringify(wetView)).not.toContain("incident.");

    await act({ type: "choose", choiceId: "gallery-door" });
    const afterDoor = await view();
    expect(afterDoor.currentScene?.id).toBe("scene.gallery");
    expect(afterDoor.currentScene?.choices.map((c) => c.id)).not.toContain("walk-home");
    expect(afterDoor.currentScene?.choices.map((c) => c.id)).toEqual(
      expect.arrayContaining(["ask-viktor", "ask-paloma", "stay"]),
    );

    const forged = await act({ type: "choose", choiceId: "walk-home" });
    expect((forged.body as Player).currentScene?.id).toBe("scene.gallery");

    const once = await consoleState();
    expect(once.firedGates.filter((g) => g === "gate.p1.g2")).toEqual(["gate.p1.g2"]);
    expect(once.flags["flag.reached-gallery"]).toBe(true);
    expect(once.incident).toBeNull();

    await act({ type: "choose", choiceId: "ask-viktor" });
    expect((await view()).currentScene?.id).toBe("scene.gallery-change");
    await act({ type: "choose", choiceId: "door-ajar" });
    expect((await view()).currentScene?.id).toBe("scene.gallery-watch-door");
    expect((await consoleState()).flags["flag.recorded.changing"]).toBe(true);
    expect((await consoleState()).flags["flag.gallery-upstairs"]).toBe(true);
    expect((await consoleState()).flags["flag.watch.provoked"]).toBe(true);
  });
});
