import { describe, expect, it } from "vitest";
import { runDrifter, type PlayerClient } from "./drifter.js";

describe("drifter", () => {
  it("stops when timeline reports gate.p1.g7", async () => {
    const client: PlayerClient = {
      async createRun() {
        return { runId: "r", currentScene: { id: "scene.x", choices: [{ id: "go" }] }, sceneOptions: [], canAdvance: false, askingTheory: false, theoryOptions: [] };
      },
      async view() {
        return { runId: "r", currentScene: null, sceneOptions: [], canAdvance: true, askingTheory: false, theoryOptions: [] };
      },
      async act() {
        return { currentScene: null, sceneOptions: [], canAdvance: true, askingTheory: false, theoryOptions: [] };
      },
      async timeline() {
        return { evenings: [{ evening: 0, gates: ["gate.p1.g1", "gate.p1.g7"] }] };
      },
    };
    await expect(runDrifter(client, 1, 3)).resolves.toEqual(["gate.p1.g1", "gate.p1.g7"]);
  });
});
