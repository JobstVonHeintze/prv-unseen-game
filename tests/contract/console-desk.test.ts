import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("Console desk", () => {
  it("lists canon, inspects a run, and keeps storyboard prompt history", async () => {
    expect(readFileSync(resolve(import.meta.dirname, "../../apps/console/index.html"), "utf8")).toContain("contrejour");
    const s = await serveSlice();
    handles.push(s.close);
    const gates = await json(s.url, "/v1/console/canon/gates");
    expect((gates.body as unknown[]).length).toBe(7);
    const conds = await json(s.url, "/v1/console/canon/conditions");
    expect((conds.body as Array<{ id: string }>).some((c) => c.id === "condition.wetness")).toBe(true);
    const incs = await json(s.url, "/v1/console/canon/incidents");
    expect((incs.body as Array<{ id: string }>).some((i) => i.id === "incident.rain-street")).toBe(true);
    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    const id = (run.body as { runId: string }).runId;
    const st = await json(s.url, `/v1/console/runs/${id}/state`);
    expect(st.body).toHaveProperty("meters");
    expect(st.body).toHaveProperty("conditions");
    expect(st.body).toHaveProperty("incident");
    const created = await json(s.url, "/v1/console/storyboards", {
      method: "POST",
      body: JSON.stringify({
        entity_id: "gate.p1.g2",
        kind: "still",
        prompt: "Wet girl in green at a glass door, blue hour.",
        image_url: "https://example.com/ref.png",
      }),
    });
    expect(created.status).toBe(201);
    const patched = await json(s.url, `/v1/console/storyboards/${(created.body as { id: string }).id}`, {
      method: "PATCH",
      body: JSON.stringify({ prompt: "Same door, rain heavier, no face detail." }),
    });
    expect((patched.body as { prompt_history: unknown[] }).prompt_history).toHaveLength(1);
    expect((patched.body as { prompt: string }).prompt).toContain("rain heavier");
    const rehearsals = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ bots: ["drifter"], max_evenings: 1 }),
    });
    expect(rehearsals.status).toBe(201);
    expect((rehearsals.body as { traces: unknown[] }).traces.length).toBe(1);
  });
});
