import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import {
  assertValid,
  loadCanon,
  previewProposal,
  proposalHasErrors,
  readCanonFile,
  unifiedDiff,
  writeCanonFile,
  type Canon,
  type Finding,
} from "@contrejour/canon";
import {
  consoleView,
  createRng,
  fold,
  playerView,
  propose,
  rewind,
  startRun,
  type Action,
  type Event,
} from "@contrejour/engine";
import type { Store } from "./store.js";

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(json);
}

function notFound(res: ServerResponse): void {
  send(res, 404, { error: "not-found" });
}

export function createApi(canon: Canon, store: Store, options: { canonRoot: string }) {
  let live = canon;
  const root = options.canonRoot;
  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    const method = req.method ?? "GET";

    if (path === "/health" && method === "GET") {
      send(res, 200, { ok: true, bind: "127.0.0.1" });
      return;
    }

    if (path === "/v1/runs" && method === "POST") {
      const body = (await readBody(req)) as { mode?: string; seed?: number };
      const runId = randomUUID();
      const seed = typeof body.seed === "number" ? body.seed : 1;
      const mode = body.mode === "explorer" ? "explorer" : "honest";
      const events = startRun(live, seed, mode, runId);
      store.saveRun(runId, events);
      const state = fold(live, events);
      send(res, 201, playerView(live, state, events));
      return;
    }

    const runMatch = path.match(/^\/v1\/runs\/([^/]+)(?:\/(.+))?$/);
    if (runMatch) {
      const runId = runMatch[1]!;
      const rest = runMatch[2] ?? "";
      const rec = store.loadRun(runId);
      if (!rec) {
        send(res, 404, { error: "run-not-found" });
        return;
      }
      let events = rec.events;
      const state = fold(live, events);

      if (rest === "view" && method === "GET") {
        send(res, 200, playerView(live, state, events));
        return;
      }
      if (rest === "timeline" && method === "GET") {
        send(res, 200, {
          evenings: [...new Set(events.map((e) => e.t))].sort((a, b) => a - b).map((t) => ({
            evening: t,
            gates: events.filter((e) => e.t === t && e.kind === "gate.fired").map((e) => e.payload.gateId),
          })),
        });
        return;
      }
      if (rest === "actions" && method === "POST") {
        const action = (await readBody(req)) as Action;
        const rng = createRng(state.header.seed + events.length);
        events = propose(live, events, action, rng);
        store.saveRun(runId, events);
        send(res, 200, playerView(live, fold(live, events), events));
        return;
      }
      if (rest === "rewind" && method === "POST") {
        const body = (await readBody(req)) as { to_evening: number; sandbox?: boolean };
        if (body.sandbox) {
          send(res, 404, { error: "not-found" });
          return;
        }
        const next = rewind(live, events, body.to_evening, state.header.mode);
        if ("error" in next) {
          send(res, 400, next);
          return;
        }
        store.saveRun(runId, next);
        send(res, 200, playerView(live, fold(live, next), next));
        return;
      }
      if (rest === "commit" && method === "POST") {
        notFound(res);
        return;
      }
      if (rest === "findings" && method === "POST") {
        const body = (await readBody(req)) as Omit<Finding, "id" | "created_at" | "run_id" | "author">;
        const finding = store.addFinding({ ...body, run_id: runId, author: "tester" });
        send(res, 201, finding);
        return;
      }
    }

    if (path === "/v1/console/rehearsals") {
      notFound(res);
      return;
    }

    if (path === "/v1/console/proposals" && method === "GET") {
      send(res, 200, store.listProposals());
      return;
    }
    if (path === "/v1/console/proposals" && method === "POST") {
      const body = (await readBody(req)) as {
        path?: string;
        after?: string;
        author?: "human" | "ai";
        rationale?: string;
        entity_id?: string;
      };
      if (!body.path || typeof body.after !== "string") {
        send(res, 400, { error: "invalid-proposal" });
        return;
      }
      let before = "";
      try {
        before = readCanonFile(root, body.path);
      } catch {
        send(res, 400, { error: "invalid-path" });
        return;
      }
      const preview = previewProposal(live, body.path, body.after);
      const proposal = store.addProposal({
        entity_id: body.entity_id ?? preview.entityId,
        path: body.path,
        before,
        after: body.after,
        diff: unifiedDiff(before, body.after, body.path),
        author: body.author === "ai" ? "ai" : "human",
        rationale: body.rationale ?? "",
        status: "pending",
        validation: preview.issues,
      });
      send(res, 201, proposal);
      return;
    }
    const proposalMatch = path.match(/^\/v1\/console\/proposals\/([^/]+)(?:\/(approve|reject))?$/);
    if (proposalMatch) {
      const rec = store.getProposal(proposalMatch[1]!);
      if (!rec) {
        send(res, 404, { error: "not-found" });
        return;
      }
      if (!proposalMatch[2] && method === "GET") {
        send(res, 200, rec);
        return;
      }
      if (proposalMatch[2] === "approve" && method === "POST") {
        if (rec.status !== "pending") {
          send(res, 409, { error: "not-pending" });
          return;
        }
        if (proposalHasErrors(rec.validation)) {
          send(res, 400, { error: "invalid-canon", validation: rec.validation });
          return;
        }
        writeCanonFile(root, rec.path, rec.after);
        try {
          const next = loadCanon(root);
          assertValid(next);
          live = next;
        } catch (err) {
          writeCanonFile(root, rec.path, rec.before);
          send(res, 400, { error: "invalid-canon", message: err instanceof Error ? err.message : String(err) });
          return;
        }
        send(res, 200, store.saveProposal({ ...rec, status: "approved", decided_at: new Date().toISOString() }));
        return;
      }
      if (proposalMatch[2] === "reject" && method === "POST") {
        if (rec.status !== "pending") {
          send(res, 409, { error: "not-pending" });
          return;
        }
        const body = (await readBody(req)) as { reason?: string };
        send(
          res,
          200,
          store.saveProposal({
            ...rec,
            status: "rejected",
            reject_reason: body.reason ?? "",
            decided_at: new Date().toISOString(),
          }),
        );
        return;
      }
      notFound(res);
      return;
    }

    const canonMatch = path.match(/^\/v1\/console\/canon\/([^/]+)(?:\/([^/]+))?$/);
    if (canonMatch && method === "GET") {
      const type = canonMatch[1]!;
      const id = canonMatch[2];
      const table: Record<string, unknown[]> = {
        characters: live.characters,
        locations: live.locations,
        scenes: live.scenes,
        gates: live.gates,
        secrets: live.secrets,
        witnesses: live.witnesses,
        beliefs: live.beliefs,
        conditions: live.conditions,
        incidents: live.incidents,
      };
      const rows = table[type] ?? [];
      if (id) {
        const hit = (rows as Array<{ id: string }>).find((r) => r.id === id);
        if (!hit) {
          send(res, 404, { error: "not-found" });
          return;
        }
        send(res, 200, hit);
        return;
      }
      send(res, 200, rows);
      return;
    }

    const cRun = path.match(/^\/v1\/console\/runs\/([^/]+)\/(state|events|ending-forecast)$/);
    if (cRun && method === "GET") {
      const rec = store.loadRun(cRun[1]!);
      if (!rec) {
        send(res, 404, { error: "run-not-found" });
        return;
      }
      const st = fold(live, rec.events);
      if (cRun[2] === "state") {
        send(res, 200, consoleView(live, st, rec.events));
        return;
      }
      if (cRun[2] === "events") {
        send(res, 200, { events: rec.events });
        return;
      }
      send(res, 200, consoleView(live, st, rec.events).endingForecast);
      return;
    }

    if (path === "/v1/console/findings" && method === "GET") {
      send(res, 200, store.listFindings());
      return;
    }
    if (path === "/v1/console/findings" && method === "POST") {
      const body = (await readBody(req)) as Omit<Finding, "id" | "created_at">;
      send(res, 201, store.addFinding({ ...body, author: body.author ?? "author" }));
      return;
    }
    if (path === "/v1/console/storyboards" && method === "GET") {
      send(res, 200, store.listStoryboards());
      return;
    }
    if (path === "/v1/console/storyboards" && method === "POST") {
      const body = (await readBody(req)) as { entity_id: string; kind: "still" | "storyboard" | "map"; prompt: string; image_url?: string; notes?: string };
      send(res, 201, store.addStoryboard(body));
      return;
    }
    const board = path.match(/^\/v1\/console\/storyboards\/([^/]+)$/);
    if (board && method === "PATCH") {
      const body = (await readBody(req)) as { prompt?: string; image_url?: string; notes?: string };
      const next = store.patchStoryboard(board[1]!, body);
      if (!next) {
        send(res, 404, { error: "not-found" });
        return;
      }
      send(res, 200, next);
      return;
    }

    notFound(res);
  };

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      send(res, 500, { error: "internal", message: err instanceof Error ? err.message : String(err) });
    });
  });

  return server;
}

export function listen(server: ReturnType<typeof createServer>, port = 8787): Promise<number> {
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(port));
  });
}

export type { Event };
