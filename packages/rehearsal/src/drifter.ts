export interface PlayerClient {
  createRun(seed: number): Promise<{
    runId: string;
    currentScene: { id: string; choices: Array<{ id: string }> } | null;
    sceneOptions: Array<{ id: string }>;
    canAdvance: boolean;
    askingTheory: boolean;
    theoryOptions: string[];
  }>;
  view(runId: string): Promise<{
    runId: string;
    currentScene: { id: string; choices: Array<{ id: string }> } | null;
    sceneOptions: Array<{ id: string }>;
    canAdvance: boolean;
    askingTheory: boolean;
    theoryOptions: string[];
  }>;
  act(runId: string, action: Record<string, unknown>): Promise<{
    currentScene: { id: string; choices: Array<{ id: string }> } | null;
    sceneOptions: Array<{ id: string }>;
    canAdvance: boolean;
    askingTheory: boolean;
    theoryOptions: string[];
  }>;
  timeline(runId: string): Promise<{ evenings: Array<{ evening: number; gates: string[] }> }>;
}

export async function runDrifter(client: PlayerClient, seed = 1, maxEvenings = 80): Promise<string[]> {
  const first = await client.createRun(seed);
  const runId = first.runId;
  let view = first;
  let playedFree = false;
  for (let i = 0; i < maxEvenings; i += 1) {
    if (view.askingTheory && view.theoryOptions[0]) {
      view = await client.act(runId, { type: "answer_theory", answer: view.theoryOptions[0] });
    } else if (view.currentScene) {
      const choice = view.currentScene.choices[0];
      if (choice) view = await client.act(runId, { type: "choose", choiceId: choice.id });
      else break;
      playedFree = true;
    } else if (!playedFree && view.sceneOptions[0]) {
      view = await client.act(runId, { type: "enter_scene", sceneId: view.sceneOptions[0].id });
    } else if (view.canAdvance) {
      view = await client.act(runId, { type: "advance_evening" });
      playedFree = false;
    } else {
      break;
    }
    const tl = await client.timeline(runId);
    if (tl.evenings.some((e) => e.gates.includes("gate.p1.g7"))) break;
  }
  const tl = await client.timeline(runId);
  return tl.evenings.flatMap((e) => e.gates);
}

export async function fetchClient(base: string): Promise<PlayerClient> {
  const json = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  };
  return {
    async createRun(seed) {
      return json("/v1/runs", { method: "POST", body: JSON.stringify({ seed, mode: "honest" }) });
    },
    async view(runId) {
      return json(`/v1/runs/${runId}/view`);
    },
    async act(runId, action) {
      return json(`/v1/runs/${runId}/actions`, { method: "POST", body: JSON.stringify(action) });
    },
    async timeline(runId) {
      return json(`/v1/runs/${runId}/timeline`);
    },
  };
}
