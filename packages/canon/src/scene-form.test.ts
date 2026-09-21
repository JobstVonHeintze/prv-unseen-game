import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applySceneForm, sceneFormFromYaml } from "./scene-form.js";

const sample = readFileSync(join(process.cwd(), "canon/scenes/scene.first-night.yaml"), "utf8");

describe("scene form", () => {
  it("reads beat, tags, and choice effects from live YAML", () => {
    const form = sceneFormFromYaml(sample);
    expect(form?.id).toBe("scene.first-night");
    expect(form?.beat).toContain("dead badge");
    expect(form?.choices[0]).toEqual({
      id: "leave-street",
      label: "Leave down the street. Face burning.",
      effects: [{ kind: "start_incident", value: "incident.rain-street" }],
    });
  });

  it("applies field edits and keeps location and spice-adjacent keys", () => {
    const form = sceneFormFromYaml(sample);
    expect(form).not.toBeNull();
    const next = applySceneForm(sample, {
      ...form!,
      beat: "The lobby. She leaves.",
      tags: ["flirt"],
      choices: [
        {
          id: "leave-street",
          label: "Leave. Face burning.",
          effects: [{ kind: "start_incident", value: "incident.rain-street" }],
        },
      ],
    });
    expect(next).toContain("The lobby. She leaves.");
    expect(next).toContain("flirt");
    expect(next).toContain("Leave. Face burning.");
    expect(next).toContain("location: loc.ascend.l1");
    expect(next).toContain("id: scene.first-night");
    expect(sample).toContain("The lobby. The dead badge.");
  });

  it("returns null for a non-scene file", () => {
    expect(sceneFormFromYaml("id: condition.wetness\nlevels: [dry, wet]\n")).toBeNull();
  });
});
