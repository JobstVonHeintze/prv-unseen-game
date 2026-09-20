import type { Canon, Gate, Scene } from "@contrejour/canon";
import type { Event, State } from "./types.js";

function emptyState(): Omit<State, "header"> {
  return {
    evening: 0,
    day: 1,
    phase: 0,
    flags: {},
    meters: { visibility: 0, celeste: 0 },
    seenUsed: {},
    firedGates: [],
    askingTheory: false,
    theoryAnswers: [],
    openQuestion: "Am I dead?",
    vault: [],
    captures: [],
    witnessQueue: [],
    told: [],
    visitWays: {},
    spine: {},
    conditions: {},
    conditionChanged: {},
    spiceLevel: 2,
  };
}

function applyEffects(canon: Canon, state: State, effects: Array<Record<string, unknown>>): void {
  for (const effect of effects) {
    if ("set" in effect && typeof effect.set === "string") {
      const key = effect.set;
      state.flags[key] = true;
      if (key.startsWith("flag.seen.")) {
        const id = `char.${key.slice("flag.seen.".length)}`;
        state.seenUsed[id] = { seen: true, used: state.seenUsed[id]?.used ?? false };
      }
      if (key.startsWith("flag.used.")) {
        const id = `char.${key.slice("flag.used.".length)}`;
        state.seenUsed[id] = { seen: state.seenUsed[id]?.seen ?? false, used: true };
      }
    }
    if ("add" in effect && effect.add && typeof effect.add === "object") {
      const add = effect.add as Record<string, number>;
      if (typeof add["meter.visibility"] === "number") state.meters.visibility += add["meter.visibility"];
      if (typeof add["meter.celeste"] === "number") state.meters.celeste += add["meter.celeste"];
    }
    if ("spine" in effect && typeof effect.spine === "string") {
      const [id, value] = effect.spine.split("=");
      if (id && value) state.spine[id] = value;
    }
    if ("set_level" in effect && effect.set_level && typeof effect.set_level === "object") {
      for (const [id, level] of Object.entries(effect.set_level as Record<string, string>)) {
        state.conditions[id] = level;
        state.conditionChanged[id] = "effect";
      }
    }
    if ("bank" in effect && typeof effect.bank === "string") {
      const secret = canon.secrets.find((s) => s.id === effect.bank);
      if (secret && !state.vault.some((v) => v.secretId === secret.id)) {
        state.vault = [
          ...state.vault,
          {
            secretId: secret.id,
            origin: secret.origin,
            proof: secret.proof,
            quality: 0.85,
            summary: secret.summary,
          },
        ];
      }
    }
    if ("step" in effect && typeof effect.step === "string") {
      const def = canon.conditions.find((c) => c.id === effect.step);
      if (def) {
        const current = state.conditions[def.id] ?? def.default;
        const index = def.levels.indexOf(current);
        const next = def.levels[Math.min(def.levels.length - 1, index + 1)];
        if (next) {
          state.conditions[def.id] = next;
          state.conditionChanged[def.id] = "step";
        }
      }
    }
  }
}

export function initialState(header: State["header"]): State {
  return { header, ...emptyState() };
}

export function fold(canon: Canon, events: readonly Event[]): State {
  let state = initialState({
    runId: "",
    canonVersion: canon.meta.version,
    seed: 0,
    mode: "honest",
  });

  for (const event of events) {
    const p = event.payload;
    switch (event.kind) {
      case "run.started":
        state = {
          ...initialState({
            runId: String(p.runId ?? ""),
            canonVersion: String(p.canonVersion ?? canon.meta.version),
            seed: Number(p.seed ?? 0),
            mode: p.mode === "explorer" ? "explorer" : "honest",
          }),
        };
        for (const def of canon.conditions) {
          state.conditions[def.id] = def.default;
          state.conditionChanged[def.id] = "default";
        }
        state.spiceLevel = canon.meta.spice_level;
        break;
      case "evening.started":
        state.evening = Number(p.evening ?? state.evening);
        state.day = Number(p.day ?? state.day);
        state.currentScene = undefined;
        state.currentLocation = undefined;
        state.pendingGate = undefined;
        break;
      case "calendar.fired":
        state.flags[String(p.flag ?? p.id)] = true;
        break;
      case "gate.fired":
        state.firedGates = [...state.firedGates, String(p.gateId)];
        state.pendingGate = String(p.gateId);
        state.currentScene = String(p.sceneId);
        if (p.opensPhase != null) state.phase = Number(p.opensPhase);
        if (p.asksTheory) state.askingTheory = true;
        if (typeof p.openQuestion === "string") state.openQuestion = p.openQuestion;
        break;
      case "phase.opened":
        state.phase = Number(p.phase ?? state.phase);
        break;
      case "scene.entered":
        state.currentScene = String(p.sceneId);
        state.currentLocation = typeof p.locationId === "string" ? p.locationId : state.currentLocation;
        state.currentNode = typeof p.nodeId === "string" ? p.nodeId : state.currentNode;
        break;
      case "visit.recorded":
        state.visitWays[String(p.locationId)] = String(p.way ?? "status");
        state.currentLocation = String(p.locationId);
        break;
      case "choice.made":
        applyEffects(canon, state, (p.effects as Array<Record<string, unknown>>) ?? []);
        if (p.resolvesScene !== false) {
          state.currentScene = undefined;
          state.currentLocation = undefined;
          state.pendingGate = undefined;
          state.askingTheory = false;
        }
        break;
      case "capture.started":
        state.captures = [
          ...state.captures,
          {
            id: String(p.captureId),
            mode: p.mode === "hidden-video" ? "hidden-video" : "audio-drop",
            nodeId: String(p.nodeId),
            placement: String(p.placement),
            quality: Number(p.quality ?? 0),
            secretId: typeof p.secretId === "string" ? p.secretId : undefined,
            marked: false,
            blocked: typeof p.blocked === "string" ? p.blocked : undefined,
          },
        ];
        break;
      case "capture.resolved":
        state.captures = state.captures.map((c) =>
          c.id === p.captureId
            ? { ...c, quality: Number(p.quality ?? c.quality), secretId: typeof p.secretId === "string" ? p.secretId : c.secretId, blocked: typeof p.blocked === "string" ? p.blocked : c.blocked }
            : c,
        );
        break;
      case "clip.marked": {
        const cap = state.captures.find((c) => c.id === p.captureId);
        if (cap && cap.secretId && !cap.blocked) {
          const secret = canon.secrets.find((s) => s.id === cap.secretId);
          if (secret && !state.vault.some((v) => v.secretId === secret.id)) {
            const proof = cap.quality >= 0.7 ? secret.proof : cap.quality >= 0.3 ? "rumour" : "none";
            if (proof !== "none") {
              state.vault = [
                ...state.vault,
                { secretId: secret.id, origin: secret.origin, proof, quality: cap.quality, summary: secret.summary },
              ];
            }
          }
          state.captures = state.captures.map((c) => (c.id === cap.id ? { ...c, marked: true } : c));
        }
        break;
      }
      case "secret.sent":
        state.lastUseClass = String(p.useClass ?? "keep");
        applyEffects(canon, state, (p.effects as Array<Record<string, unknown>>) ?? []);
        break;
      case "incident.started":
        state.incident = { id: String(p.incidentId), pressure: Number(p.pressure ?? 0) };
        break;
      case "incident.ticked":
        if (state.incident) state.incident = { ...state.incident, pressure: Number(p.pressure ?? state.incident.pressure) };
        if (typeof p.level === "string" && typeof p.conditionId === "string") {
          state.conditions[p.conditionId] = p.level;
          state.conditionChanged[p.conditionId] = `pressure ${String(p.pressure ?? "")}`;
        }
        break;
      case "incident.resolved":
        state.incident = undefined;
        if (typeof p.flag === "string") state.flags[p.flag] = true;
        break;
      case "spice.set":
        if (p.level === 1 || p.level === 2 || p.level === 3) state.spiceLevel = p.level;
        break;
      case "witness.observed":
        state.witnessQueue = [
          ...state.witnessQueue,
          {
            from: String(p.from),
            to: String(p.to),
            dueEvening: Number(p.dueEvening),
            kind: String(p.kind),
            flag: typeof p.flag === "string" ? p.flag : undefined,
          },
        ];
        break;
      case "witness.told":
        state.told = [...state.told, `${p.from}->${p.to}`];
        if (typeof p.flag === "string") state.flags[p.flag] = true;
        state.witnessQueue = state.witnessQueue.filter((q) => !(q.from === p.from && q.to === p.to && q.dueEvening === event.t));
        break;
      case "theory.answered":
        state.theoryAnswers = [...state.theoryAnswers, String(p.answer)];
        state.askingTheory = false;
        if (p.answer === "I think I died.") state.openQuestion = "They are doing it on purpose?";
        if (p.answer === "They are doing it on purpose.") state.openQuestion = "Who decided I do not exist?";
        break;
      case "evening.advanced":
        state.evening = Number(p.evening ?? state.evening + 1);
        state.day = Number(p.day ?? state.day + 1);
        state.currentScene = undefined;
        state.pendingGate = undefined;
        break;
      default:
        break;
    }
  }
  return state;
}

export function dueGates(canon: Canon, state: State): Gate[] {
  return canon.gates
    .filter((g) => g.part === 1)
    .filter((g) => !state.firedGates.includes(g.id))
    .filter((g) => {
      const dateDue = state.day >= g.trigger.date.day;
      const progressDue =
        g.trigger.progress.all.length > 0 && g.trigger.progress.all.every((f) => state.flags[f]);
      const previous = canon.gates.filter((o) => o.part === g.part && o.order < g.order);
      const orderOk = previous.every((o) => state.firedGates.includes(o.id));
      return orderOk && (dateDue || progressDue);
    })
    .sort((a, b) => a.order - b.order);
}

export function eligibleScenes(canon: Canon, state: State): Scene[] {
  if (state.currentScene || state.incident) return [];
  const due = dueGates(canon, state);
  if (due[0]) return [];
  return canon.scenes.filter((scene) => {
    if (scene.slot === "gate-internal") return false;
    if (state.phase < scene.requires.phase_min) return false;
    if (!scene.requires.all.every((f) => state.flags[f])) return false;
    if (scene.requires.none.some((f) => state.flags[f])) return false;
    if (state.currentLocation && !scene.location.startsWith(state.currentLocation.split(".").slice(0, 2).join(".")) && scene.location !== state.currentLocation) {
      const locRoot = scene.location.replace(/\.l[1-4]$/, "");
      if (locRoot !== state.currentLocation) return false;
    }
    return true;
  });
}

export function canonicalState(state: State): unknown {
  const { header, ...rest } = state;
  return {
    ...rest,
    seed: header.seed,
    mode: header.mode,
    canonVersion: header.canonVersion,
  };
}
