import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCanon, writeIndex, queryIndex } from "./load.js";
import { CharacterSchema } from "./schemas.js";

describe("loader", () => {
  it("parses a character fixture", () => {
    const ch = CharacterSchema.parse({
      id: "char.elena",
      display_name: "Elena Marin",
      age: 24,
      tier: "core",
    });
    expect(ch.romance.available).toBe(false);
  });

  it("loads a tiny canon tree and writes an index", () => {
    const root = mkdtempSync(join(tmpdir(), "canon-"));
    writeFileSync(
      join(root, "meta.yaml"),
      "version: test\nspice_level: 2\nslice:\n  parts: [1]\n  last_gate: gate.p1.g1\ncalendar:\n  start_day: 1\n  sunday: 0\n  rent_day: 1\n",
    );
    for (const d of ["characters", "locations", "scenes", "gates", "secrets", "witnesses", "beliefs", "text"]) {
      mkdirSync(join(root, d));
    }
    writeFileSync(
      join(root, "characters", "char.elena.yaml"),
      "id: char.elena\ndisplay_name: Elena Marin\nage: 24\ntier: core\n",
    );
    const canon = loadCanon(root);
    expect(canon.characters).toHaveLength(1);
    const index = writeIndex(canon, join(root, "index.json"));
    expect(queryIndex(index, "character")).toEqual(["char.elena"]);
  });
});
