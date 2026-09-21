import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("rehearsal personas", () => {
  it("skips a known persona without credentials and stays off the Player", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const res = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ personas: ["curious"], n: 1, seed_base: 3, max_evenings: 2 }),
    });
    expect(res.status).toBe(201);
    const body = res.body as {
      skipped_personas: string[];
      persona_skip_reason: string;
      traces: unknown[];
      findings: unknown[];
    };
    expect(body.skipped_personas).toEqual(["curious"]);
    expect(body.persona_skip_reason).toBe("no-credentials");
    expect(body.traces).toEqual([]);
    expect(body.findings).toEqual([]);
    expect(readFileSync(join(s.canonDir, "scenes/scene.first-night.yaml"), "utf8")).toContain("id: scene.first-night");

    const bad = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ personas: ["karma-farmer"] }),
    });
    expect(bad.status).toBe(400);

    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    expect(Object.keys(run.body as object).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
    const sneak = await json(s.url, `/v1/runs/${(run.body as { runId: string }).runId}/personas`, {
      method: "POST",
      body: JSON.stringify({ personas: ["curious"] }),
    });
    expect(sneak.status).toBe(404);
  });
});
