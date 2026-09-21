import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("findings to proposals", () => {
  it("queues a pending draft from a finding without writing canon", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const batch = await json(s.url, "/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({
        bots: ["drifter"],
        n: 1,
        seed_base: 11,
        max_evenings: 2,
        queue_proposals: true,
      }),
    });
    expect(batch.status).toBe(201);
    const body = batch.body as {
      findings: Array<{ id: string; entity_id: string }>;
      proposals: Array<{ id: string; status: string; path: string; rationale: string }>;
    };
    expect(body.findings.length).toBeGreaterThan(0);
    expect(body.proposals.length).toBe(body.findings.length);
    expect(body.proposals[0]?.status).toBe("pending");
    expect(body.proposals[0]?.rationale).toContain("never entered");
    const path = body.proposals[0]!.path;
    const before = readFileSync(join(s.canonDir, path), "utf8");

    const listed = await json(s.url, "/v1/console/proposals");
    expect((listed.body as Array<{ id: string }>).some((p) => p.id === body.proposals[0]?.id)).toBe(true);

    const finding = body.findings[0]!;
    const again = await json(s.url, `/v1/console/findings/${finding.id}/propose`, { method: "POST" });
    expect(again.status).toBe(201);
    expect((again.body as { status: string; author: string }).status).toBe("pending");
    expect((again.body as { author: string }).author).toBe("human");
    expect(readFileSync(join(s.canonDir, path), "utf8")).toBe(before);

    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 1 }) });
    expect(Object.keys(run.body as object).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
    const sneak = await json(
      s.url,
      `/v1/runs/${(run.body as { runId: string }).runId}/findings/${finding.id}/propose`,
      { method: "POST" },
    );
    expect(sneak.status).toBe(404);
  });
});
