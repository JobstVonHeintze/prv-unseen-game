import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("Player surface", () => {
  it("ships a phone-frame page and files a finding from a run", async () => {
    const html = readFileSync(resolve(import.meta.dirname, "../../apps/player/index.html"), "utf8");
    expect(html).toContain("UNSEEN");
    const s = await serveSlice();
    handles.push(s.close);
    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    const id = (run.body as { runId: string }).runId;
    const finding = await json(s.url, `/v1/runs/${id}/findings`, {
      method: "POST",
      body: JSON.stringify({
        entity_id: "scene.first-night",
        category: "romance-gap",
        detail_axis: "l2",
        title: "Needs sensual beat",
        body: "Level 2 text is only a beat.",
      }),
    });
    expect(finding.status).toBe(201);
    const listed = await json(s.url, "/v1/console/findings");
    expect((listed.body as Array<{ entity_id: string }>).some((f) => f.entity_id === "scene.first-night")).toBe(true);
  });
});
