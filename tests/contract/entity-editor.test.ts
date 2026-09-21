import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("entity editor", () => {
  it("searches, reads source, previews without writing, stays off the Player", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const hits = await json(s.url, "/v1/console/canon/search?q=tilde");
    const ids = (hits.body as Array<{ id: string; path: string }>).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["char.tilde", "scene.tilde-vip"]));

    const source = await json(s.url, "/v1/console/canon/source?id=scene.tilde-vip");
    expect(source.status).toBe(200);
    const src = source.body as { id: string; path: string; yaml: string };
    expect(src.path).toBe("scenes/scene.tilde-vip.yaml");
    expect(src.yaml).toContain("id: scene.tilde-vip");
    const original = readFileSync(join(s.canonDir, src.path), "utf8");
    expect(src.yaml).toBe(original);

    const after = original.replace("A locked room off the white cube.", "A locked room. The handle is contrejour.");
    const preview = await json(s.url, "/v1/console/proposals/preview", {
      method: "POST",
      body: JSON.stringify({ path: src.path, after }),
    });
    expect(preview.status).toBe(200);
    const body = preview.body as {
      entity_id: string;
      stored: boolean;
      diff: string;
      validation: unknown[];
    };
    expect(body.entity_id).toBe("scene.tilde-vip");
    expect(body.stored).toBe(false);
    expect(body.diff).toContain("-  A locked room off the white cube.");
    expect(body.diff).toContain("+  A locked room. The handle is contrejour.");
    expect(readFileSync(join(s.canonDir, src.path), "utf8")).toBe(original);
    const listed = await json(s.url, "/v1/console/proposals");
    expect(listed.body).toEqual([]);

    const queued = await json(s.url, "/v1/console/proposals", {
      method: "POST",
      body: JSON.stringify({ path: src.path, after, rationale: "Shorter beat.", author: "human" }),
    });
    expect(queued.status).toBe(201);
    expect(readFileSync(join(s.canonDir, src.path), "utf8")).toBe(original);

    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    const runId = (run.body as { runId: string }).runId;
    const keys = Object.keys(run.body as object).sort();
    expect(keys).toEqual([...PLAYER_VIEW_KEYS].sort());
    const sneak = await json(s.url, `/v1/runs/${runId}/canon/search?q=tilde`);
    expect(sneak.status).toBe(404);
    const sneakPreview = await json(s.url, `/v1/runs/${runId}/proposals/preview`, {
      method: "POST",
      body: JSON.stringify({ path: src.path, after }),
    });
    expect(sneakPreview.status).toBe(404);
  });
});
