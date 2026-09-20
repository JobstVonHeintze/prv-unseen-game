import { describe, expect, it, afterEach } from "vitest";
import { effectiveSpice, spiceLine } from "@contrejour/canon";
import { classifyUse } from "@contrejour/engine";
import { json, loadSlice, serveSlice } from "../helpers.js";

const handles: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (handles.length) await handles.pop()?.();
});

describe("spice-scaled follow-ups", () => {
  it("keeps flags and leverage identical while depiction changes", async () => {
    const canon = loadSlice();
    const tilde = canon.secrets.find((s) => s.id === "secret.s-tilde-vip");
    expect(tilde).toBeTruthy();
    expect(classifyUse(tilde!, "char.tilde")).toBe("leverage");
    const l1 = spiceLine(tilde!.spice, 1).text;
    const l2 = spiceLine(tilde!.spice, 2).text;
    const l3 = spiceLine(tilde!.spice, 3);
    expect(l1).toContain("kisses");
    expect(l2).not.toEqual(l1);
    expect(l3.placeholder).toBe(true);
    expect(l3.text).toEqual(l2);
    expect(l3.text).not.toMatch(/PLACEHOLDER/);

    const watch = canon.scenes.find((s) => s.id === "scene.gallery-watch-door");
    expect(effectiveSpice(3, { ...watch!, intimate: { consent: "negotiated", mode: "currency-down" } })).toBe(1);

    const s = await serveSlice();
    handles.push(s.close);
    const created = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 8 }) });
    const id = (created.body as { runId: string }).runId;
    const act = (action: unknown) =>
      json(s.url, `/v1/runs/${id}/actions`, { method: "POST", body: JSON.stringify(action) });
    const view = async () =>
      (await json(s.url, `/v1/runs/${id}/view`)).body as {
        currentScene: { id: string; text: string } | null;
        spiceLevel: number;
        vault: Array<{ secretId: string; summary: string }>;
      };
    const playToDoor = async () => {
      await act({ type: "choose", choiceId: "leave-street" });
      await act({ type: "choose", choiceId: "gallery-door" });
      await act({ type: "choose", choiceId: "ask-viktor" });
      await act({ type: "choose", choiceId: "door-ajar" });
    };

    await act({ type: "set_spice", level: 1 });
    await playToDoor();
    const at1 = await view();
    expect(at1.spiceLevel).toBe(1);
    expect(at1.currentScene?.id).toBe("scene.gallery-watch-door");
    expect(at1.currentScene?.text).toContain("slice of hallway");
    expect(at1.currentScene?.text).not.toMatch(/PLACEHOLDER/);
    expect(at1.vault.some((v) => v.secretId === "secret.s-changing")).toBe(true);
    const flags1 = (await json(s.url, `/v1/console/runs/${id}/state`)).body as {
      flags: Record<string, boolean>;
      meters: { celeste: number };
    };
    expect(flags1.flags["flag.recorded.changing"]).toBe(true);
    expect(flags1.flags["flag.watch.provoked"]).toBe(true);

    const created2 = await json(s.url, "/v1/runs", { method: "POST", body: JSON.stringify({ seed: 8 }) });
    const id2 = (created2.body as { runId: string }).runId;
    const act2 = (action: unknown) =>
      json(s.url, `/v1/runs/${id2}/actions`, { method: "POST", body: JSON.stringify(action) });
    await act2({ type: "set_spice", level: 2 });
    await act2({ type: "choose", choiceId: "leave-street" });
    await act2({ type: "choose", choiceId: "gallery-door" });
    await act2({ type: "choose", choiceId: "ask-viktor" });
    await act2({ type: "choose", choiceId: "door-ajar" });
    const at2 = (await json(s.url, `/v1/runs/${id2}/view`)).body as { currentScene: { text: string } | null };
    expect(at2.currentScene?.text).toContain("Wet green");
    const flags2 = (await json(s.url, `/v1/console/runs/${id2}/state`)).body as {
      flags: Record<string, boolean>;
      meters: { celeste: number };
    };
    expect(flags2.flags["flag.recorded.changing"]).toBe(flags1.flags["flag.recorded.changing"]);
    expect(flags2.meters.celeste).toBe(flags1.meters.celeste);

    await act2({ type: "set_spice", level: 3 });
    const at3 = (await json(s.url, `/v1/runs/${id2}/view`)).body as { currentScene: { text: string } | null };
    expect(at3.currentScene?.text).toContain("Wet green");
    expect(at3.currentScene?.text).not.toMatch(/PLACEHOLDER/);

    await act2({ type: "choose", choiceId: "continue" });
    await act2({ type: "send_secret", secretId: "secret.s-tilde-vip", recipientId: "char.tilde" });
    const afterSend = (await json(s.url, `/v1/runs/${id2}/view`)).body as {
      currentScene: { id: string; choices: Array<{ id: string }> } | null;
    };
    expect(afterSend.currentScene?.id).toBe("scene.conduct-demand");
    expect(afterSend.currentScene?.choices.map((c) => c.id)).toEqual(
      expect.arrayContaining(["reveal-other", "film-another"]),
    );
    await act2({ type: "choose", choiceId: "reveal-other" });
    const after = (await json(s.url, `/v1/console/runs/${id2}/state`)).body as {
      lastUseClass: string;
      flags: Record<string, boolean>;
    };
    expect(after.lastUseClass).toBe("leverage");
    expect(after.flags["flag.tilde-pressed"]).toBe(true);
    expect(after.flags["flag.demand.reveal-other"]).toBe(true);
  });
});
