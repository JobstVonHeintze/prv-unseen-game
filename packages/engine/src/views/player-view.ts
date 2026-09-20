import type { Canon } from "@contrejour/canon";
import { spiceLine } from "@contrejour/canon";
import { choiceAllowed, feltLines } from "../conditions.js";
import { dueGates, eligibleScenes } from "../fold.js";
import type { Event, State } from "../types.js";

/** Allowlist. Unknown keys must never appear. */
export interface PlayerView {
  runId: string;
  mode: "honest" | "explorer";
  evening: number;
  day: number;
  openQuestion: string;
  askingTheory: boolean;
  theoryOptions: string[];
  currentScene: null | {
    id: string;
    title: string;
    text: string;
    provenance: "hand" | "beat";
    choices: Array<{ id: string; label: string }>;
  };
  locationOptions: Array<{ id: string; name: string }>;
  sceneOptions: Array<{ id: string; title: string }>;
  vault: Array<{ secretId: string; summary: string; origin: string; proof: string }>;
  captures: Array<{ id: string; mode: string; marked: boolean; blocked?: string }>;
  recipients: Array<{ id: string; name: string }>;
  canAdvance: boolean;
  canRewindTo: number[];
  felt: string[];
  spiceLevel: 1 | 2 | 3;
}

export function playerView(canon: Canon, state: State, _events: readonly Event[]): PlayerView {
  const scene = canon.scenes.find((s) => s.id === state.currentScene);
  const gate = canon.gates.find((g) => g.scene === state.currentScene);
  const incident = canon.incidents.find((i) => i.scene === state.currentScene || i.id === state.incident?.id);
  const spice = spiceLine(scene?.spice, state.spiceLevel, scene);
  const text = scene ? (scene.spice ? spice.text : (canon.text[scene.id] ?? scene.beat)) : "";
  const due = dueGates(canon, state);
  const eligible = eligibleScenes(canon, state);
  const locs = new Map<string, string>();
  for (const s of eligible) {
    const locId = s.location.replace(/\.l[1-4]$/, "");
    const loc = canon.locations.find((l) => l.id === locId);
    locs.set(locId, loc?.display_name ?? locId);
  }
  const rewindMax = state.header.mode === "honest" ? 1 : state.evening;
  const canRewindTo: number[] = [];
  for (let e = Math.max(0, state.evening - rewindMax); e < state.evening; e += 1) canRewindTo.push(e);

  return {
    runId: state.header.runId,
    mode: state.header.mode,
    evening: state.evening,
    day: state.day,
    openQuestion: state.openQuestion,
    askingTheory: state.askingTheory,
    theoryOptions: state.askingTheory
      ? ["I think I died.", "They are doing it on purpose.", "I am losing my mind.", "It is just this city."]
      : [],
    currentScene: scene
      ? {
          id: scene.id,
          title: gate?.name ?? (incident?.scene === scene.id ? incident.name ?? scene.id : scene.id),
          text,
          provenance: canon.text[scene.id] ? "hand" : "beat",
          choices: scene.choices
            .filter((c) => choiceAllowed(canon, state, c))
            .map((c) => ({ id: c.id, label: c.label })),
        }
      : null,
    locationOptions: [...locs.entries()].map(([id, name]) => ({ id, name })),
    sceneOptions: due[0]
      ? []
      : eligible.map((s) => ({ id: s.id, title: s.beat.slice(0, 72) })),
    vault: state.vault.map((v) => {
      const secret = canon.secrets.find((s) => s.id === v.secretId);
      const shown = secret?.spice ? spiceLine(secret.spice, state.spiceLevel).text : v.summary;
      return { secretId: v.secretId, summary: shown || v.summary, origin: v.origin, proof: v.proof };
    }),
    captures: state.captures.map((c) => ({
      id: c.id,
      mode: c.mode,
      marked: c.marked,
      blocked: c.blocked,
    })),
    recipients: canon.characters
      .filter((c) => c.id !== "char.elena")
      .slice(0, 12)
      .map((c) => ({ id: c.id, name: c.display_name })),
    canAdvance: !state.currentScene && !state.incident,
    canRewindTo,
    felt: feltLines(canon, state),
    spiceLevel: state.spiceLevel,
  };
}

export const PLAYER_VIEW_KEYS = [
  "runId",
  "mode",
  "evening",
  "day",
  "openQuestion",
  "askingTheory",
  "theoryOptions",
  "currentScene",
  "locationOptions",
  "sceneOptions",
  "vault",
  "captures",
  "recipients",
  "canAdvance",
  "canRewindTo",
  "felt",
  "spiceLevel",
] as const;
