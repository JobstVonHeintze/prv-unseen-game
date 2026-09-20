import type { Canon, Secret } from "@contrejour/canon";
import { choiceAllowed } from "./conditions.js";
import { dueGates, fold } from "./fold.js";
import type { SeededRng } from "./rng.js";
import type { Action, Event, State } from "./types.js";

const QUALITY: Record<string, number> = { poor: 0.35, partial: 0.55, good: 0.85 };
const PLACE: Record<string, number> = {
  "tote-on-lap": 0.85,
  "under-table": 0.7,
  "left-on-desk": 0.6,
  hidden: 0.75,
};

export function captureQuality(
  canon: Canon,
  fromNode: string,
  toNode: string,
  mode: string,
  placement: string,
): number {
  const base = mode === "hidden-video" ? 0.9 : 0.8;
  let ear = 0.5;
  for (const loc of canon.locations) {
    const hit = loc.earshot.find((e) => e.from === fromNode && e.to === toNode);
    if (hit) ear = QUALITY[hit.quality] ?? 0.5;
    if (fromNode === toNode) ear = 0.9;
    const node = loc.nodes.find((n) => n.id === fromNode);
    if (node) {
      const noise = 1 - node.noise;
      return Math.min(1, base * ear * (PLACE[placement] ?? 0.7) * noise);
    }
  }
  return Math.min(1, base * ear * (PLACE[placement] ?? 0.7));
}

export function classifyUse(secret: Secret, recipientId: string): "keep" | "tell" | "expose" | "leverage" | "trade" {
  if (recipientId === "keep" || recipientId === "char.elena") return "keep";
  if (secret.uses.leverage.to.includes(recipientId)) return "leverage";
  if (secret.uses.expose.channels.includes(recipientId)) return "expose";
  if (secret.uses.trade.to.includes(recipientId)) return "trade";
  if (secret.uses.tell.to.includes(recipientId) || secret.about.includes(recipientId)) return "tell";
  if (secret.about.includes(recipientId)) return "leverage";
  return "tell";
}

function nextN(events: Event[]): number {
  return events.length === 0 ? 0 : events[events.length - 1]!.n + 1;
}

function push(events: Event[], t: number, kind: Event["kind"], payload: Record<string, unknown>): Event[] {
  return [...events, { n: nextN(events), t, kind, payload }];
}

function enterScene(canon: Canon, events: Event[], t: number, sceneId: string): Event[] {
  const dest = canon.scenes.find((s) => s.id === sceneId);
  if (!dest) return events;
  return push(events, t, "scene.entered", {
    sceneId: dest.id,
    locationId: dest.location,
    nodeId: dest.node,
    source: canon.text[dest.id] ? "hand" : "beat",
  });
}

function startIncident(canon: Canon, events: Event[], t: number, incidentId: string): Event[] {
  if (fold(canon, events).incident) return events;
  const inc = canon.incidents.find((i) => i.id === incidentId);
  if (!inc) return events;
  let next = push(events, t, "incident.started", { incidentId: inc.id, sceneId: inc.scene, pressure: 0 });
  return enterScene(canon, next, t, inc.scene);
}

/** Writer drop-in: any effect list may start an incident or enter a scene. */
function followThrough(
  canon: Canon,
  events: Event[],
  t: number,
  effects: Array<Record<string, unknown>>,
): Event[] {
  let next = events;
  const start = effects.find((e) => "start_incident" in e);
  if (start && typeof start.start_incident === "string") {
    return startIncident(canon, next, t, start.start_incident);
  }
  const enter = effects.find((e) => "enter" in e);
  if (enter && typeof enter.enter === "string") {
    return enterScene(canon, next, t, enter.enter);
  }
  return next;
}

function nodeHasDrawer(canon: Canon, nodeId: string): boolean {
  return canon.locations.some((l) => l.nodes.some((n) => n.id === nodeId && n.phone_drawer));
}

function sunday(_canon: Canon, day: number): boolean {
  return day > 0 && day % 7 === 0;
}

export function startRun(canon: Canon, seed: number, mode: State["header"]["mode"], runId: string): Event[] {
  let events = push([], 0, "run.started", { runId, seed, mode, canonVersion: canon.meta.version });
  events = push(events, 0, "evening.started", { evening: 0, day: 1 });
  return fireStartOfEvening(canon, events);
}

function fireStartOfEvening(canon: Canon, events: Event[]): Event[] {
  const state = fold(canon, events);
  if (sunday(canon, state.day)) {
    events = push(events, state.evening, "calendar.fired", { id: "sunday-call", flag: "flag.sunday-call-window" });
  }
  if (state.day === canon.meta.calendar.rent_day || state.day === 1) {
    events = push(events, state.evening, "calendar.fired", { id: "rent", flag: "flag.rent-overdue" });
  }
  const due = dueGates(canon, fold(canon, events));
  const gate = due[0];
  if (gate) {
    const scene = canon.scenes.find((s) => s.id === gate.scene);
    events = push(events, fold(canon, events).evening, "gate.fired", {
      gateId: gate.id,
      sceneId: gate.scene,
      trigger: gate.trigger.progress.all.every((f) => fold(canon, events).flags[f]) ? "progress" : "date",
      opensPhase: gate.opens_phase,
      asksTheory: gate.asks_theory_question,
      openQuestion: gate.asks_theory_question ? "What do you think is happening to you?" : undefined,
    });
    events = push(events, fold(canon, events).evening, "scene.entered", {
      sceneId: gate.scene,
      locationId: scene?.location,
      nodeId: scene?.node,
      source: scene && canon.text[scene.id] ? "hand" : "beat",
    });
  }
  const now = fold(canon, events);
  for (const q of now.witnessQueue) {
    if (q.dueEvening <= now.evening) {
      events = push(events, now.evening, "witness.told", { from: q.from, to: q.to, flag: q.flag });
    }
  }
  return events;
}

export function propose(canon: Canon, events: Event[], action: Action, rng: SeededRng): Event[] {
  const state = fold(canon, events);
  const t = state.evening;

  switch (action.type) {
    case "pick_location":
      return push(events, t, "visit.recorded", { locationId: action.locationId, way: "status" });
    case "enter_scene": {
      const scene = canon.scenes.find((s) => s.id === action.sceneId);
      if (!scene) return events;
      if (state.incident) return events;
      if (state.currentScene) return events;
      if (scene.slot === "gate-internal" && !dueGates(canon, state).some((g) => g.scene === scene.id)) {
        return events;
      }
      if (state.phase < scene.requires.phase_min) return events;
      if (!scene.requires.all.every((f) => state.flags[f])) return events;
      if (scene.requires.none.some((f) => state.flags[f])) return events;
      let next = push(events, t, "scene.entered", {
        sceneId: scene.id,
        locationId: scene.location,
        nodeId: scene.node,
        source: canon.text[scene.id] ? "hand" : "beat",
      });
      if (scene.node) {
        for (const w of canon.witnesses) {
          if (w.observes.nodes.includes(scene.node) && w.observes.kinds.includes("arrival")) {
            for (const edge of w.tells) {
              if (rng.chance(edge.probability)) {
                next = push(next, t, "witness.observed", {
                  from: w.id,
                  to: edge.to,
                  dueEvening: t + edge.delay_evenings,
                  kind: "arrival",
                  flag: w.consequence_flag,
                });
              }
            }
          }
        }
      }
      return next;
    }
    case "choose": {
      const scene = canon.scenes.find((s) => s.id === state.currentScene);
      const choice = scene?.choices.find((c) => c.id === action.choiceId);
      if (!scene || !choice) return events;
      if (!choiceAllowed(canon, state, choice)) return events;
      const open = state.incident ? canon.incidents.find((i) => i.id === state.incident?.id) : undefined;
      const inIncident = Boolean(open && open.scene === scene.id);
      const validExit = Boolean(open && open.valid.includes(choice.id));
      const resolvesScene = !(inIncident && !validExit);
      let next = push(events, t, "choice.made", {
        sceneId: scene.id,
        choiceId: choice.id,
        effects: choice.effects,
        resolvesScene,
      });
      if (inIncident && open && !validExit) {
        const pressure = (state.incident?.pressure ?? 0) + 1;
        const hit = open.pressure.thresholds.find((th) => th.at === pressure);
        next = push(next, t, "incident.ticked", {
          incidentId: open.id,
          pressure,
          conditionId: hit ? open.pressure.condition : undefined,
          level: hit?.level,
        });
        return next;
      }
      if (inIncident && open && validExit) {
        next = push(next, t, "incident.resolved", { incidentId: open.id, flag: open.flag });
        const after = fold(canon, next);
        if (open.fires_gate && !after.firedGates.includes(open.fires_gate)) {
          const gate = canon.gates.find((g) => g.id === open.fires_gate);
          const nextScene = gate ? canon.scenes.find((s) => s.id === gate.scene) : undefined;
          next = push(next, t, "gate.fired", {
            gateId: open.fires_gate,
            sceneId: gate?.scene,
            trigger: "progress",
            opensPhase: gate?.opens_phase ?? null,
            asksTheory: gate?.asks_theory_question ?? false,
          });
          if (nextScene) {
            next = push(next, t, "scene.entered", {
              sceneId: nextScene.id,
              locationId: nextScene.location,
              nodeId: nextScene.node,
              source: canon.text[nextScene.id] ? "hand" : "beat",
            });
          }
        }
        return next;
      }
      next = followThrough(canon, next, t, choice.effects as Array<Record<string, unknown>>);
      if (!fold(canon, next).incident) {
        const listed = canon.incidents.find(
          (i) => i.after_choice?.scene === scene.id && i.after_choice.choices.includes(choice.id),
        );
        if (listed) next = startIncident(canon, next, t, listed.id);
      }
      return next;
    }
    case "start_capture": {
      const captureId = `cap.${t}.${events.length}`;
      if (nodeHasDrawer(canon, action.nodeId)) {
        return push(events, t, "capture.started", {
          captureId,
          mode: action.mode,
          nodeId: action.nodeId,
          placement: action.placement,
          quality: 0,
          blocked: "phone-drawer",
        });
      }
      let blocked: string | undefined;
      if (sunday(canon, state.day) && rng.chance(0.35 + state.meters.visibility * 0.02)) {
        blocked = "sunday-call";
      }
      const secret = canon.secrets.find((s) => s.capture.node === action.nodeId);
      const target = secret?.capture.node ?? action.nodeId;
      const quality = blocked ? 0 : captureQuality(canon, action.nodeId, target, action.mode, action.placement);
      return push(events, t, "capture.started", {
        captureId,
        mode: action.mode,
        nodeId: action.nodeId,
        placement: action.placement,
        quality,
        secretId: secret?.id,
        blocked,
      });
    }
    case "stop_capture":
      return push(events, t, "capture.resolved", {
        captureId: action.captureId,
        quality: state.captures.find((c) => c.id === action.captureId)?.quality ?? 0,
        secretId: state.captures.find((c) => c.id === action.captureId)?.secretId,
        blocked: state.captures.find((c) => c.id === action.captureId)?.blocked,
      });
    case "mark_clip":
      return push(events, t, "clip.marked", { captureId: action.captureId });
    case "send_secret": {
      const secret = canon.secrets.find((s) => s.id === action.secretId);
      if (!secret) return events;
      const useClass = classifyUse(secret, action.recipientId);
      const effects =
        useClass === "leverage"
          ? secret.uses.leverage.effects
          : useClass === "tell"
            ? secret.uses.tell.effects
            : secret.uses.keep.effects;
      let next = push(events, t, "secret.sent", {
        secretId: secret.id,
        recipientId: action.recipientId,
        useClass,
        effects,
      });
      return followThrough(canon, next, t, effects as Array<Record<string, unknown>>);
    }
    case "answer_theory":
      return push(events, t, "theory.answered", { answer: action.answer });
    case "set_spice":
      if (action.level !== 1 && action.level !== 2 && action.level !== 3) return events;
      return push(events, t, "spice.set", { level: action.level });
    case "advance_evening": {
      if (state.currentScene || state.incident) return events;
      const nextEvening = state.evening + 1;
      const nextDay = state.day + 1;
      let next = push(events, t, "evening.advanced", { evening: nextEvening, day: nextDay });
      next = push(next, nextEvening, "evening.started", { evening: nextEvening, day: nextDay });
      return fireStartOfEvening(canon, next);
    }
    default:
      return events;
  }
}

export function rewind(
  canon: Canon,
  events: Event[],
  toEvening: number,
  mode: State["header"]["mode"],
): Event[] | { error: string } {
  const max = mode === "honest" ? 1 : 999;
  const latest = events.reduce((m, e) => Math.max(m, e.t), 0);
  if (latest - toEvening > max) return { error: "rewind-beyond-honest" };
  if (toEvening < 0) return { error: "rewind-invalid" };
  const kept = events.filter((e) => e.kind === "run.started" || e.t < toEvening);
  const day = toEvening + 1;
  return fireStartOfEvening(canon, push(kept, toEvening, "evening.started", { evening: toEvening, day }));
}
