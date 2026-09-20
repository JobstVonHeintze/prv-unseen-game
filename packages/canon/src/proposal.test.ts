import { describe, expect, it } from "vitest";
import { previewProposal, proposalHasErrors, safeCanonPath, unifiedDiff } from "./proposal.js";
import type { Canon } from "./types.js";

const canon: Canon = {
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
};

describe("proposal preview", () => {
  it("rejects a path outside canon dirs", () => {
    expect(() => safeCanonPath("/tmp/canon", "../secret.yaml")).toThrow("invalid-path");
    const preview = previewProposal(canon, "../../etc/passwd", "x");
    expect(proposalHasErrors(preview.issues)).toBe(true);
  });

  it("reports age-rule without writing", () => {
    const after = `id: char.kid
display_name: Kid
age: 16
tier: day-player
liminal: false
romance:
  available: true
knows: []
refuses: false
`;
    const preview = previewProposal(canon, "characters/char.kid.yaml", after);
    expect(preview.entityId).toBe("char.kid");
    expect(preview.issues.some((i) => i.code === "age-rule")).toBe(true);
    expect(unifiedDiff("", after, "characters/char.kid.yaml")).toContain("+id: char.kid");
  });
});
