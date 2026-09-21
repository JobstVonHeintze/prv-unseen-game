import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { FindingSchema, ProposalSchema, StoryboardSchema, type Finding, type Proposal, type Storyboard } from "@contrejour/canon";
import type { Event } from "@contrejour/engine";

export interface RunRecord {
  events: Event[];
}

export function createStore(dataDir: string) {
  mkdirSync(join(dataDir, "runs"), { recursive: true });
  mkdirSync(join(dataDir, "findings"), { recursive: true });
  mkdirSync(join(dataDir, "storyboards"), { recursive: true });
  mkdirSync(join(dataDir, "proposals"), { recursive: true });
  mkdirSync(join(dataDir, "rehearsals"), { recursive: true });

  const runPath = (id: string) => join(dataDir, "runs", `${id}.json`);

  return {
    saveRun(id: string, events: Event[]): void {
      writeFileSync(runPath(id), JSON.stringify({ events }, null, 2));
    },
    loadRun(id: string): RunRecord | null {
      if (!existsSync(runPath(id))) return null;
      return JSON.parse(readFileSync(runPath(id), "utf8")) as RunRecord;
    },
    addFinding(input: Omit<Finding, "id" | "created_at"> & { id?: string }): Finding {
      const finding = FindingSchema.parse({
        ...input,
        id: input.id ?? `finding.${randomUUID()}`,
        created_at: new Date().toISOString(),
      });
      writeFileSync(join(dataDir, "findings", `${finding.id}.json`), JSON.stringify(finding, null, 2));
      return finding;
    },
    getFinding(id: string): Finding | null {
      const path = join(dataDir, "findings", `${id}.json`);
      if (!existsSync(path)) return null;
      return FindingSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    },
    listFindings(): Finding[] {
      const dir = join(dataDir, "findings");
      if (!existsSync(dir)) return [];
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => FindingSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
    },
    addStoryboard(input: { entity_id: string; kind: Storyboard["kind"]; prompt: string; image_url?: string; notes?: string }): Storyboard {
      const now = new Date().toISOString();
      const board = StoryboardSchema.parse({
        id: `board.${randomUUID()}`,
        entity_id: input.entity_id,
        kind: input.kind,
        prompt: input.prompt,
        prompt_history: [],
        image_url: input.image_url,
        notes: input.notes ?? "",
        created_at: now,
        updated_at: now,
      });
      writeFileSync(join(dataDir, "storyboards", `${board.id}.json`), JSON.stringify(board, null, 2));
      return board;
    },
    patchStoryboard(id: string, patch: { prompt?: string; image_url?: string; notes?: string }): Storyboard | null {
      const path = join(dataDir, "storyboards", `${id}.json`);
      if (!existsSync(path)) return null;
      const prev = StoryboardSchema.parse(JSON.parse(readFileSync(path, "utf8")));
      const now = new Date().toISOString();
      const next = StoryboardSchema.parse({
        ...prev,
        prompt: patch.prompt ?? prev.prompt,
        image_url: patch.image_url ?? prev.image_url,
        notes: patch.notes ?? prev.notes,
        prompt_history:
          patch.prompt && patch.prompt !== prev.prompt
            ? [...prev.prompt_history, { prompt: prev.prompt, edited_at: now }]
            : prev.prompt_history,
        updated_at: now,
      });
      writeFileSync(path, JSON.stringify(next, null, 2));
      return next;
    },
    listStoryboards(): Storyboard[] {
      const dir = join(dataDir, "storyboards");
      if (!existsSync(dir)) return [];
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => StoryboardSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
    },
    addProposal(input: Omit<Proposal, "id" | "created_at"> & { id?: string }): Proposal {
      const proposal = ProposalSchema.parse({
        ...input,
        id: input.id ?? `proposal.${randomUUID()}`,
        created_at: new Date().toISOString(),
      });
      writeFileSync(join(dataDir, "proposals", `${proposal.id}.json`), JSON.stringify(proposal, null, 2));
      return proposal;
    },
    getProposal(id: string): Proposal | null {
      const path = join(dataDir, "proposals", `${id}.json`);
      if (!existsSync(path)) return null;
      return ProposalSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    },
    saveProposal(proposal: Proposal): Proposal {
      const next = ProposalSchema.parse(proposal);
      writeFileSync(join(dataDir, "proposals", `${next.id}.json`), JSON.stringify(next, null, 2));
      return next;
    },
    saveRehearsal(record: { id: string; [key: string]: unknown }): { id: string; [key: string]: unknown } {
      writeFileSync(join(dataDir, "rehearsals", `${record.id}.json`), JSON.stringify(record, null, 2));
      return record;
    },
    getRehearsal(id: string): { id: string; [key: string]: unknown } | null {
      const path = join(dataDir, "rehearsals", `${id}.json`);
      if (!existsSync(path)) return null;
      return JSON.parse(readFileSync(path, "utf8")) as { id: string; [key: string]: unknown };
    },
    listRehearsals(): Array<{ id: string; [key: string]: unknown }> {
      const dir = join(dataDir, "rehearsals");
      if (!existsSync(dir)) return [];
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as { id: string; [key: string]: unknown });
    },
    listProposals(): Proposal[] {
      const dir = join(dataDir, "proposals");
      if (!existsSync(dir)) return [];
      return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ProposalSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
    },
  };
}

export type Store = ReturnType<typeof createStore>;
