import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("scene form", () => {
  it("loads a scene form, previews without writing, stays off the Player", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const loaded = await json(s.url, "/v1/console/canon/form?id=scene.first-night");
    expect(loaded.status).toBe(200);
    const body = loaded.body as {
      path: string;
      form: { id: string; beat: string; tags: string[]; choices: Array<{ id: string }> };
      yaml: string;
    };
    expect(body.path).toBe("scenes/scene.first-night.yaml");
    expect(body.form.id).toBe("scene.first-night");
    expect(body.form.choices.some((c) => c.id === "leave-street")).toBe(true);
    const original = readFileSync(join(s.canonDir, body.path), "utf8");
    expect(body.yaml).toBe(original);

    const preview = await json(s.url, "/v1/console/canon/form/preview", {
      method: "POST",
      body: JSON.stringify({
        id: "scene.first-night",
        form: {
          ...body.form,
          beat: "The lobby. She leaves.",
          tags: ["flirt"],
        },
      }),
    });
    expect(preview.status).toBe(200);
    const next = preview.body as { yaml: string; diff: string; stored: boolean };
    expect(next.stored).toBe(false);
    expect(next.yaml).toContain("The lobby. She leaves.");
    expect(next.diff).toContain("The lobby. She leaves.");
    expect(readFileSync(join(s.canonDir, body.path), "utf8")).toBe(original);

    const wet = await json(s.url, "/v1/console/canon/form?id=condition.wetness");
    expect(wet.status).toBe(400);

    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    expect(Object.keys(run.body as object).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
    const sneak = await json(s.url, `/v1/runs/${(run.body as { runId: string }).runId}/canon/form?id=scene.first-night`);
    expect(sneak.status).toBe(404);
  });
});
