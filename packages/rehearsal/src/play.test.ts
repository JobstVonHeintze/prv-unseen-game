import { describe, expect, it } from "vitest";
import { compileReport, findingsFromReport, type PlayTrace } from "./play.js";
import type { Canon } from "@contrejour/canon";

const canon = {
  gates: [
    { id: "gate.p1.g1", scene: "scene.first-night" },
    { id: "gate.p1.g7", scene: "scene.dalia-pulse" },
  ],
} as Canon;

describe("rehearsal report", () => {
  it("drafts a timing finding for a missed gate scene", () => {
    const traces: PlayTrace[] = [
      { runId: "r", bot: "drifter", seed: 1, gates: ["gate.p1.g1"], scenes: ["scene.first-night"], secrets: [] },
    ];
    const report = compileReport(canon, traces);
    expect(report.missed_gate_scenes).toEqual([{ gateId: "gate.p1.g7", sceneId: "scene.dalia-pulse" }]);
    const drafts = findingsFromReport(report);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.entity_id).toBe("scene.dalia-pulse");
    expect(drafts[0]?.author).toBe("rehearsal");
    expect(drafts[0]?.body).toContain("0 of 1");
  });
});
