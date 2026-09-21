export interface PlayerViewSlice {
  runId?: string;
  currentScene: { id: string; choices: Array<{ id: string; label?: string }> } | null;
  sceneOptions: Array<{ id: string }>;
  canAdvance: boolean;
  askingTheory: boolean;
  theoryOptions: string[];
  vault?: Array<{ secretId: string }>;
  recipients?: Array<{ id: string }>;
  captures?: Array<{ id: string; marked: boolean }>;
}

export interface PlayerClient {
  createRun(seed: number): Promise<PlayerViewSlice & { runId: string }>;
  view(runId: string): Promise<PlayerViewSlice & { runId: string }>;
  act(runId: string, action: Record<string, unknown>): Promise<PlayerViewSlice>;
  timeline(runId: string): Promise<{ evenings: Array<{ evening: number; gates: string[] }> }>;
}

export async function runDrifter(client: PlayerClient, seed = 1, maxEvenings = 80): Promise<string[]> {
  const { playScript } = await import("./play.js");
  const trace = await playScript(client, { seed, maxEvenings, bot: "drifter" });
  return trace.gates;
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
