import { describe, expect, it, afterEach } from "vitest";
import { PLAYER_VIEW_KEYS } from "@contrejour/engine";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("hidden state", () => {
  it("Player responses only contain allowlisted keys", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const created = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 3 }) });
    expect(created.status).toBe(201);
    const keys = Object.keys(created.body as object).sort();
    expect(keys).toEqual([...PLAYER_VIEW_KEYS].sort());
    const dump = JSON.stringify(created.body);
    expect(dump).not.toContain("meter.celeste");
    expect(dump).not.toContain("witnessQueue");
    expect(dump).not.toContain("endingForecast");
    expect(dump).not.toContain("condition.");
    expect(dump).not.toContain("incident.");
    expect(dump).not.toContain("proposal");
    expect(created.body).toHaveProperty("felt");
    const runId = (created.body as { runId: string }).runId;
    const view = await json(s.url, `/v1/runs/${runId}/view`);
    expect(Object.keys(view.body as object).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
    const tl = await json(s.url, `/v1/runs/${runId}/timeline`);
    expect(tl.body).not.toHaveProperty("meters");
    const consoleState = await json(s.url, `/v1/console/runs/${runId}/state`);
    expect(consoleState.body).toHaveProperty("meters");
    expect(consoleState.body).toHaveProperty("witnessQueue");
  });
});
