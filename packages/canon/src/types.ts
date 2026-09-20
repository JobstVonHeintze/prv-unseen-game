import type { z } from "zod";
import type {
  BeliefSchema,
  CharacterSchema,
  ConditionSchema,
  FindingSchema,
  GateSchema,
  IncidentSchema,
  LocationSchema,
  MetaSchema,
  SceneSchema,
  SecretSchema,
  ProposalSchema,
  StoryboardSchema,
  WitnessSchema,
} from "./schemas.js";

export type Meta = z.infer<typeof MetaSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Gate = z.infer<typeof GateSchema>;
export type Secret = z.infer<typeof SecretSchema>;
export type Witness = z.infer<typeof WitnessSchema>;
export type Belief = z.infer<typeof BeliefSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  entity?: string;
  message: string;
}

export interface Canon {
  meta: Meta;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  gates: Gate[];
  secrets: Secret[];
  witnesses: Witness[];
  beliefs: Belief[];
  conditions: Condition[];
  incidents: Incident[];
  text: Record<string, string>;
}

export interface CanonIndex {
  version: string;
  ids: string[];
  byType: Record<string, string[]>;
}
