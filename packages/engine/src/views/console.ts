import type { Canon } from "@contrejour/canon";
import { conditionRows } from "../conditions.js";
import type { Event, State } from "../types.js";

export interface ConsoleView {
  runId: string;
  evening: number;
  day: number;
  phase: number;
  meters: { visibility: number; celeste: number };
  seenUsed: State["seenUsed"];
  flags: Record<string, boolean>;
  firedGates: string[];
  witnessQueue: State["witnessQueue"];
  told: string[];
  lastUseClass?: string;
  endingForecast: { remainingGates: string[] };
  openQuestion: string;
  conditions: Array<{ id: string; level: string; lastChange: string; gates: string[] }>;
  incident: null | { id: string; pressure: number };
  spiceLevel: 1 | 2 | 3;
}

export function consoleView(canon: Canon, state: State, _events: readonly Event[]): ConsoleView {
  return {
    runId: state.header.runId,
    evening: state.evening,
    day: state.day,
    phase: state.phase,
    meters: { ...state.meters },
    seenUsed: state.seenUsed,
    flags: { ...state.flags },
    firedGates: [...state.firedGates],
    witnessQueue: [...state.witnessQueue],
    told: [...state.told],
    lastUseClass: state.lastUseClass,
    endingForecast: {
      remainingGates: canon.gates.filter((g) => g.part === 1 && !state.firedGates.includes(g.id)).map((g) => g.id),
    },
    openQuestion: state.openQuestion,
    conditions: conditionRows(canon, state),
    incident: state.incident ? { ...state.incident } : null,
    spiceLevel: state.spiceLevel,
  };
}
