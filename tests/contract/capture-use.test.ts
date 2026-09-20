import { describe, expect, it, afterEach } from "vitest";
import { json, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("capture to use", () => {
  it("records s01 from the lobby graph and classifies the recipient", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 8 }) });
    const id = (run.body as { runId: string }).runId;
    const play = (action: unknown) => json(s.url, `/v1/runs/${id}/actions`, { method: "POST", body: JSON.stringify(action) });
    const started = await play({ type: "start_capture", mode: "audio-drop", nodeId: "node.ascend.lobby", placement: "tote-on-lap" });
    const cap = (started.body as { captures: Array<{ id: string; blocked?: string }> }).captures.at(-1);
    expect(cap).toBeTruthy();
    expect(cap?.blocked).toBeUndefined();
    await play({ type: "stop_capture", captureId: cap!.id });
    const marked = await play({ type: "mark_clip", captureId: cap!.id });
    expect((marked.body as { vault: Array<{ secretId: string }> }).vault.some((v) => v.secretId === "secret.s01")).toBe(true);
    await play({ type: "send_secret", secretId: "secret.s01", recipientId: "char.celeste" });
    const st = await json(s.url, `/v1/console/runs/${id}/state`);
    expect((st.body as { lastUseClass: string }).lastUseClass).toBe("leverage");
  });

  it("blocks capture on a phone-drawer node", async () => {
    const s = await serveSlice();
    handles.push(s.close);
    const run = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 8 }) });
    const id = (run.body as { runId: string }).runId;
    const started = await json(s.url, `/v1/runs/${id}/actions`, {
      method: "POST",
      body: JSON.stringify({ type: "start_capture", mode: "audio-drop", nodeId: "node.ascend.floor-7m", placement: "tote-on-lap" }),
    });
    const cap = (started.body as { captures: Array<{ blocked?: string }> }).captures.at(-1);
    expect(cap?.blocked).toBe("phone-drawer");
  });
});
