import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("canon proposals", () => {
  it("diffs and validates, writes only on approve, stores reject reasons, stays off the Player", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const path = "conditions/condition.wetness.yaml";
    const original = readFileSync(join(s.canonDir, path), "utf8");
    const after = original.replace('dry: ""', 'dry: "Silk still clean."');

    const created = await json(s.url, "/v1/console/proposals", {
      method: "POST",
      body: JSON.stringify({
        path,
        after,
        author: "human",
        rationale: "Felt line for dry silk.",
      }),
    });
    expect(created.status).toBe(201);
    const proposal = created.body as {
      id: string;
      status: string;
      diff: string;
      validation: unknown[];
    };
    expect(proposal.status).toBe("pending");
    expect(proposal.diff).toContain("-  dry: \"\"");
    expect(proposal.diff).toContain("+  dry: \"Silk still clean.\"");
    expect(readFileSync(join(s.canonDir, path), "utf8")).toBe(original);

    const listed = await json(s.url, "/v1/console/proposals");
    expect((listed.body as Array<{ id: string }>).some((p) => p.id === proposal.id)).toBe(true);

    const approved = await json(s.url, `/v1/console/proposals/${proposal.id}/approve`, { method: "POST" });
    expect(approved.status).toBe(200);
    expect((approved.body as { status: string }).status).toBe("approved");
    expect(readFileSync(join(s.canonDir, path), "utf8")).toContain("Silk still clean.");
    const conds = await json(s.url, "/v1/console/canon/conditions");
    const wet = (conds.body as Array<{ id: string; felt: Record<string, string> }>).find((c) => c.id === "condition.wetness");
    expect(wet?.felt.dry).toBe("Silk still clean.");

    const rejectAfter = original.replace("The silk is dark at the shoulders.", "Shoulders dark.");
    const second = await json(s.url, "/v1/console/proposals", {
      method: "POST",
      body: JSON.stringify({ path, after: rejectAfter, rationale: "Shorter damp line." }),
    });
    const secondId = (second.body as { id: string }).id;
    const rejected = await json(s.url, `/v1/console/proposals/${secondId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: "Keep the original damp felt." }),
    });
    expect((rejected.body as { status: string; reject_reason: string }).status).toBe("rejected");
    expect((rejected.body as { reject_reason: string }).reject_reason).toBe("Keep the original damp felt.");
    expect(readFileSync(join(s.canonDir, path), "utf8")).toContain("Silk still clean.");

    const bad = await json(s.url, "/v1/console/proposals", {
      method: "POST",
      body: JSON.stringify({
        path: "characters/char.kid.yaml",
        after: `id: char.kid
display_name: Kid
age: 16
tier: day-player
romance: { available: true }
`,
      }),
    });
    expect(bad.status).toBe(201);
    const badId = (bad.body as { id: string; validation: Array<{ code: string }> }).id;
    expect((bad.body as { validation: Array<{ code: string }> }).validation.some((i) => i.code === "age-rule")).toBe(true);
    const refused = await json(s.url, `/v1/console/proposals/${badId}/approve`, { method: "POST" });
    expect(refused.status).toBe(400);
    expect(readFileSync(join(s.canonDir, path), "utf8")).toContain("Silk still clean.");

    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 2 }) });
    expect(Object.keys(run.body as object).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
    expect(JSON.stringify(run.body)).not.toContain("proposal");
    const runId = (run.body as { runId: string }).runId;
    const sneak = await json(s.url, `/v1/runs/${runId}/proposals`);
    expect(sneak.status).toBe(404);
  });
});
