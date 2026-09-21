import type { Canon } from "@contrejour/canon";
import type { PlayerClient } from "./drifter.js";
import { pickChoice, pickScene, pickSend, type PolicyCtx } from "./policies.js";

export type PlayTrace = {
  runId: string;
  bot: string;
  seed: number;
  gates: string[];
  scenes: string[];
  secrets: string[];
  sent: string[];
};

export type RehearsalReport = {
  traces: PlayTrace[];
  entered_scenes: string[];
  missed_gate_scenes: Array<{ gateId: string; sceneId: string }>;
};

export type FindingDraft = {
  entity_id: string;
  category: "timing";
  detail_axis: "timing";
  title: string;
  body: string;
  author: "rehearsal";
  run_id?: string;
};

export async function playScript(
  client: PlayerClient,
  opts: { seed: number; maxEvenings: number; bot: string; canon?: Canon },
): Promise<PlayTrace> {
  const first = await client.createRun(opts.seed);
  const runId = first.runId;
  let view = first;
  let playedFree = false;
  const scenes: string[] = [];
  const taken: string[] = [];
  const sent: string[] = [];
  const ctx = (): PolicyCtx => ({ canon: opts.canon, visited: scenes, taken, sent });
  const noteScene = (id: string | undefined) => {
    if (id && !scenes.includes(id)) scenes.push(id);
  };
  noteScene(view.currentScene?.id);
  for (let i = 0; i < opts.maxEvenings; i += 1) {
    if (view.askingTheory && view.theoryOptions[0]) {
      view = await client.act(runId, { type: "answer_theory", answer: view.theoryOptions[0] });
    } else if (view.currentScene) {
      noteScene(view.currentScene.id);
      const choice = pickChoice(opts.bot, view.currentScene.choices, view.currentScene.id, ctx());
      if (!choice) break;
      taken.push(`${view.currentScene.id}:${choice.id}`);
      view = await client.act(runId, { type: "choose", choiceId: choice.id });
      noteScene(view.currentScene?.id);
      playedFree = true;
    } else {
      const send = pickSend(opts.bot, view, ctx());
      if (send) {
        sent.push(send.secretId);
        view = await client.act(runId, send);
      } else if (!playedFree && view.sceneOptions.length) {
        const scene = pickScene(opts.bot, view.sceneOptions, ctx());
        if (!scene) break;
        view = await client.act(runId, { type: "enter_scene", sceneId: scene.id });
        noteScene(view.currentScene?.id);
      } else if (view.canAdvance) {
        view = await client.act(runId, { type: "advance_evening" });
        playedFree = false;
      } else {
        break;
      }
    }
    noteScene(view.currentScene?.id);
    const tl = await client.timeline(runId);
    if (tl.evenings.some((e) => e.gates.includes("gate.p1.g7"))) break;
  }
  const tl = await client.timeline(runId);
  const latest = await client.view(runId);
  return {
    runId,
    bot: opts.bot,
    seed: opts.seed,
    gates: tl.evenings.flatMap((e) => e.gates),
    scenes,
    secrets: (latest.vault ?? []).map((v) => v.secretId),
    sent,
  };
}

export function compileReport(canon: Canon, traces: PlayTrace[]): RehearsalReport {
  const entered = [...new Set(traces.flatMap((t) => t.scenes))];
  const missed_gate_scenes = canon.gates
    .filter((g) => !entered.includes(g.scene))
    .map((g) => ({ gateId: g.id, sceneId: g.scene }));
  return { traces, entered_scenes: entered, missed_gate_scenes };
}

export function findingsFromReport(report: RehearsalReport): FindingDraft[] {
  const n = report.traces.length;
  return report.missed_gate_scenes.map((miss) => ({
    entity_id: miss.sceneId,
    category: "timing" as const,
    detail_axis: "timing" as const,
    title: `${miss.gateId} never entered`,
    body: `${miss.sceneId} was reached in 0 of ${n} runs.`,
    author: "rehearsal" as const,
    run_id: report.traces[0]?.runId,
  }));
}

/** @deprecated use `isBot` — kept so first/last aliases stay readable. */
export const BOT_PICK: Record<string, "first" | "last"> = {
  drifter: "first",
  completionist: "first",
  romantic: "first",
  detective: "first",
  "dark-optimiser": "last",
  saint: "first",
};
