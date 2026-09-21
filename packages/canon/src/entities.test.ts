import { describe, expect, it } from "vitest";
import { entityRelPath, listCanonEntities, searchCanonEntities } from "./entities.js";
import type { Canon } from "./types.js";

const canon: Canon = {
  meta: {
    version: "t",
    spice_level: 2,
    slice: { parts: [1], last_gate: "gate.p1.g1" },
    calendar: { start_day: 1, sunday: 0, rent_day: 1 },
  },
  characters: [
    {
      id: "char.tilde",
      display_name: "Tilde Ekström",
      age: 22,
      tier: "recurring",
      liminal: false,
      romance: { available: true },
      knows: [],
      refuses: false,
    },
  ],
  locations: [],
  scenes: [
    {
      id: "scene.tilde-vip",
      part: 1,
      slot: "evening",
      location: "loc.galerie-restrepo.l1",
      node: "node.galerie.vip",
      cast: ["char.elena", "char.tilde"],
      tags: [],
      requires: { phase_min: 0, all: [], none: [] },
      beat: "A locked room off the white cube. Tilde is already there.",
      choices: [],
      hooks_back: [],
    },
  ],
  gates: [],
  secrets: [],
  witnesses: [],
  beliefs: [],
  conditions: [],
  incidents: [],
  text: {},
};

describe("canon entity catalogue", () => {
  it("maps stable ids onto canon-relative yaml paths", () => {
    expect(entityRelPath("char.tilde")).toBe("characters/char.tilde.yaml");
    expect(entityRelPath("scene.tilde-vip")).toBe("scenes/scene.tilde-vip.yaml");
    expect(entityRelPath("secret.s-tilde-vip")).toBe("secrets/secret.s-tilde-vip.yaml");
    expect(entityRelPath("node.galerie.vip")).toBeNull();
  });

  it("finds Tilde on id and on scene beat", () => {
    const listed = listCanonEntities(canon);
    expect(listed.map((r) => r.id)).toEqual(["char.tilde", "scene.tilde-vip"]);
    const hits = searchCanonEntities(canon, "tilde");
    expect(hits.map((r) => r.id)).toEqual(["char.tilde", "scene.tilde-vip"]);
    expect(searchCanonEntities(canon, "LOCKED ROOM").some((r) => r.id === "scene.tilde-vip")).toBe(true);
  });
});
