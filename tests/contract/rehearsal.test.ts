import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("rehearsal desk", () => {
  it("runs the drifter, files findings on a short run, stays off the Player", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const short = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ bots: ["drifter"], n: 1, seed_base: 11, max_evenings: 2 }),
    });
    expect(short.status).toBe(201);
    const shortBody = short.body as {
      id: string;
      missed_gate_scenes: Array<{ sceneId: string }>;
      findings: Array<{ entity_id: string; author: string; category: string }>;
    };
    expect(shortBody.missed_gate_scenes.length).toBeGreaterThan(0);
    expect(shortBody.findings.some((f) => f.author === "rehearsal" && f.category === "timing")).toBe(true);
    const listed = await json(s.url, "/v1/console/findings");
    expect((listed.body as Array<{ author: string }>).some((f) => f.author === "rehearsal")).toBe(true);
    const fetched = await json(s.url, `/v1/console/rehearsals/${shortBody.id}/report`);
    expect(fetched.status).toBe(200);
    expect((fetched.body as { id: string }).id).toBe(shortBody.id);

    const full = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ bots: ["drifter"], n: 1, seed_base: 11, max_evenings: 80 }),
    });
    expect(full.status).toBe(201);
    const fullBody = full.body as {
      missed_gate_scenes: unknown[];
      traces: Array<{ gates: string[] }>;
    };
    expect(fullBody.traces[0]?.gates).toEqual([
      "gate.p1.g1",
      "gate.p1.g2",
      "gate.p1.g3",
      "gate.p1.g4",
      "gate.p1.g5",
      "gate.p1.g6",
      "gate.p1.g7",
    ]);
    expect(fullBody.missed_gate_scenes).toEqual([]);
    expect(readFileSync(join(s.canonDir, "scenes/scene.first-night.yaml"), "utf8")).toContain("id: scene.first-night");

    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    expect(Object.keys(run.body as object).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
    const sneak = await json(s.url, `/v1/runs/${(run.body as { runId: string }).runId}/rehearsals`, {
      method: "POST",
      body: JSON.stringify({ bots: ["drifter"] }),
    });
    expect(sneak.status).toBe(404);
  });

  it("accepts the named bots and rejects an unknown one", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    for (const bot of ["completionist", "romantic", "detective", "saint"]) {
      const res = await json(s.url, "/v1/console/rehearsals", {
        method: "POST",
        body: JSON.stringify({ bots: [bot], n: 1, seed_base: 3, max_evenings: 2 }),
      });
      expect(res.status).toBe(201);
      const body = res.body as { traces: Array<{ bot: string }> };
      expect(body.traces[0]?.bot).toBe(bot);
    }
    const bad = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ bots: ["karma-farmer"] }),
    });
    expect(bad.status).toBe(400);
  });
});
