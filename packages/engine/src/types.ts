export type Mode = "honest" | "explorer";

export type EventKind =
  | "run.started"
  | "evening.started"
  | "calendar.fired"
  | "scene.entered"
  | "choice.made"
  | "capture.started"
  | "capture.resolved"
  | "clip.marked"
  | "secret.sent"
  | "witness.observed"
  | "witness.told"
  | "gate.fired"
  | "phase.opened"
  | "theory.answered"
  | "evening.advanced"
  | "visit.recorded"
  | "incident.started"
  | "incident.ticked"
  | "incident.resolved"
  | "spice.set";

export interface Event {
  n: number;
  t: number;
  kind: EventKind;
  payload: Record<string, unknown>;
}

export interface RunHeader {
  runId: string;
  canonVersion: string;
  seed: number;
  mode: Mode;
}

export interface VaultItem {
  secretId: string;
  origin: "taken" | "given";
  proof: string;
  quality: number;
  summary: string;
}

export interface CaptureRecord {
  id: string;
  mode: "audio-drop" | "hidden-video";
  nodeId: string;
  placement: string;
  quality: number;
  secretId?: string;
  marked: boolean;
  blocked?: string;
}

export interface WitnessQueued {
  from: string;
  to: string;
  dueEvening: number;
  kind: string;
  flag?: string;
}

export interface State {
  header: RunHeader;
  evening: number;
  day: number;
  phase: number;
  flags: Record<string, boolean>;
  meters: { visibility: number; celeste: number };
  seenUsed: Record<string, { seen: boolean; used: boolean }>;
  firedGates: string[];
  currentScene?: string;
  currentLocation?: string;
  currentNode?: string;
  pendingGate?: string;
  askingTheory: boolean;
  theoryAnswers: string[];
  openQuestion: string;
  vault: VaultItem[];
  captures: CaptureRecord[];
  witnessQueue: WitnessQueued[];
  told: string[];
  visitWays: Record<string, string>;
  lastUseClass?: string;
  spine: Record<string, string>;
  conditions: Record<string, string>;
  conditionChanged: Record<string, string>;
  incident?: { id: string; pressure: number };
  spiceLevel: 1 | 2 | 3;
}

export type Action =
  | { type: "enter_scene"; sceneId: string }
  | { type: "choose"; choiceId: string }
  | { type: "start_capture"; mode: "audio-drop" | "hidden-video"; nodeId: string; placement: string }
  | { type: "stop_capture"; captureId: string }
  | { type: "mark_clip"; captureId: string }
  | { type: "send_secret"; secretId: string; recipientId: string }
  | { type: "answer_theory"; answer: string }
  | { type: "advance_evening" }
  | { type: "pick_location"; locationId: string }
  | { type: "set_spice"; level: 1 | 2 | 3 };

export const HIDDEN_STATE_KEYS = [
  "meters",
  "seenUsed",
  "witnessQueue",
  "flags",
  "spine",
  "pendingGate",
] as const;
