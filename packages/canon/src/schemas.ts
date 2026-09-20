import { z } from "zod";

export const CanonId = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);

export const MetaSchema = z.object({
  version: z.string(),
  spice_level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  slice: z.object({
    parts: z.array(z.number().int()),
    last_gate: z.string(),
  }),
  calendar: z.object({
    start_day: z.number().int().min(1),
    sunday: z.number().int().min(0).max(6),
    rent_day: z.number().int().min(1).max(31),
  }),
});

export const RomanceSchema = z.object({
  available: z.boolean(),
  flirt_from: z.number().int().min(0).max(5).optional(),
  date_from: z.number().int().min(0).max(5).optional(),
  intimate_from: z.number().int().min(0).max(5).optional(),
});

export const CharacterSchema = z.object({
  id: z.string().startsWith("char."),
  display_name: z.string(),
  age: z.number().int().min(0),
  tier: z.enum(["core", "recurring", "day-player"]),
  home: z.string().optional(),
  liminal: z.boolean().default(false),
  romance: RomanceSchema.default({ available: false }),
  seen_flag: z.string().optional(),
  knows: z.array(z.string()).default([]),
  refuses: z.boolean().default(false),
});

export const LevelSchema = z.object({
  name: z.string(),
  phase: z.number().int().min(0).max(5),
  work_phase: z.number().int().min(0).max(5).optional(),
  price: z.string().optional(),
});

export const NodeSchema = z.object({
  id: z.string().startsWith("node."),
  level: z.enum(["l1", "l2", "l3", "l4"]),
  cameras: z.array(z.string()).default([]),
  facts: z.array(z.string()).default([]),
  hiding: z
    .array(
      z.object({
        spot: z.string(),
        cover: z.enum(["low", "medium", "high"]),
        checked_by: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  confined: z.boolean().default(false),
  phone_drawer: z.boolean().default(false),
  noise: z.number().min(0).max(1).default(0.2),
});

export const LocationSchema = z.object({
  id: z.string().startsWith("loc."),
  display_name: z.string(),
  levels: z.record(z.string(), LevelSchema),
  nodes: z.array(NodeSchema),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        kind: z.string(),
        lockable_from: z.string().optional(),
        requires: z.string().optional(),
      }),
    )
    .default([]),
  sightlines: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        quality: z.enum(["poor", "partial", "good"]),
      }),
    )
    .default([]),
  earshot: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        quality: z.enum(["poor", "partial", "good"]),
      }),
    )
    .default([]),
});

export const EffectSchema = z.union([
  z.object({ set: z.string() }),
  z.object({ add: z.record(z.string(), z.number()) }),
  z.object({ spine: z.string() }),
  z.object({ step: z.string() }),
  z.object({ set_level: z.record(z.string(), z.string()) }),
  z.object({ start_incident: z.string() }),
  z.object({ enter: z.string() }),
  z.object({ bank: z.string() }),
]);

export const ConditionRuleSchema = z.object({
  min: z.string().optional(),
  max: z.string().optional(),
  in: z.array(z.string()).optional(),
});

export const SpiceTextSchema = z.object({
  l1: z.string(),
  l2: z.string(),
  l3: z.string().optional(),
});

export const ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  effects: z.array(EffectSchema).default([]),
  requires: z
    .object({
      conditions: z.record(z.string(), ConditionRuleSchema).optional(),
      flags: z
        .object({
          all: z.array(z.string()).default([]),
          none: z.array(z.string()).default([]),
        })
        .optional(),
    })
    .optional(),
});

export const ConditionSchema = z.object({
  id: z.string().startsWith("condition."),
  levels: z.array(z.string()).min(2),
  default: z.string(),
  felt: z.record(z.string(), z.string()),
});

export const IncidentSchema = z.object({
  id: z.string().startsWith("incident."),
  name: z.string().optional(),
  after_choice: z
    .object({
      scene: z.string(),
      choices: z.array(z.string()).min(1),
    })
    .optional(),
  scene: z.string(),
  lock: z.array(z.enum(["advance_evening", "free_roam"])).default(["advance_evening", "free_roam"]),
  pressure: z.object({
    condition: z.string(),
    thresholds: z.array(z.object({ at: z.number().int().min(1), level: z.string() })),
  }),
  valid: z.array(z.string()).min(1),
  fires_gate: z.string().optional(),
  flag: z.string().optional(),
});

export const SceneSchema = z.object({
  id: z.string().startsWith("scene."),
  part: z.number().int().min(1).max(4),
  slot: z.enum(["evening", "morning", "any", "gate-internal"]),
  location: z.string(),
  node: z.string().optional(),
  cast: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  requires: z
    .object({
      phase_min: z.number().int().min(0).max(5).default(0),
      all: z.array(z.string()).default([]),
      none: z.array(z.string()).default([]),
    })
    .default({ phase_min: 0, all: [], none: [] }),
  beat: z.string(),
  text: z.string().optional(),
  spice: SpiceTextSchema.optional(),
  choices: z.array(ChoiceSchema).min(1),
  witnesses: z.array(z.string()).default([]),
  hooks_back: z.array(z.string()).default([]),
  intimate: z
    .object({
      consent: z.literal("negotiated"),
      mode: z.enum(["play", "currency-up", "currency-down"]),
    })
    .optional(),
});

export const GateSchema = z.object({
  id: z.string().startsWith("gate."),
  name: z.string(),
  part: z.number().int(),
  order: z.number().int(),
  trigger: z.object({
    progress: z.object({ all: z.array(z.string()).default([]) }),
    date: z.object({ day: z.number().int().min(1) }),
  }),
  scene: z.string(),
  asks_theory_question: z.boolean().default(false),
  breaks_beliefs: z.array(z.string()).default([]),
  opens_phase: z.number().int().min(0).max(5).nullable().default(null),
});

export const SecretSchema = z.object({
  id: z.string().startsWith("secret."),
  about: z.array(z.string()),
  origin: z.enum(["taken", "given"]),
  summary: z.string(),
  spice: SpiceTextSchema.optional(),
  capture: z.object({
    mode: z.enum(["audio-drop", "hidden-video", "found", "told"]),
    node: z.string(),
    phase_min: z.number().int().min(0).default(0),
  }),
  proof: z.enum(["rumour", "testimony", "recording", "document"]),
  uses: z.object({
    keep: z.object({ effects: z.array(EffectSchema).default([]) }).default({ effects: [] }),
    tell: z
      .object({
        to: z.array(z.string()).default([]),
        effects: z.array(EffectSchema).default([]),
      })
      .default({ to: [], effects: [] }),
    expose: z.object({ channels: z.array(z.string()).default([]) }).default({ channels: [] }),
    leverage: z
      .object({
        to: z.array(z.string()).default([]),
        effects: z.array(EffectSchema).default([]),
      })
      .default({ to: [], effects: [] }),
    trade: z.object({ to: z.array(z.string()).default([]) }).default({ to: [] }),
  }),
  is_canary: z.boolean().default(false),
});

export const WitnessSchema = z.object({
  id: z.string().startsWith("witness."),
  character: z.string(),
  observes: z.object({
    nodes: z.array(z.string()),
    kinds: z.array(z.string()),
  }),
  tells: z.array(
    z.object({
      to: z.string(),
      delay_evenings: z.number().int().min(0),
      probability: z.number().min(0).max(1),
    }),
  ),
  consequence_flag: z.string().optional(),
});

export const BeliefSchema = z.object({
  id: z.string().startsWith("belief."),
  statement: z.string(),
  part: z.number().int(),
  fed_by: z.array(z.string()).default([]),
  broken_by: z.array(z.string()).default([]),
});

export const FindingCategory = z.enum([
  "rewrite",
  "location-missing",
  "location-broken",
  "needs-detailing",
  "romance-gap",
  "backstory-mismatch",
  "timing",
  "player-knowledge",
]);

export const FindingSchema = z.object({
  id: z.string(),
  entity_id: z.string(),
  category: FindingCategory,
  detail_axis: z.enum(["l1", "l2", "l3", "backstory", "timing", "knowledge"]).optional(),
  title: z.string(),
  body: z.string(),
  run_id: z.string().optional(),
  author: z.enum(["tester", "author", "rehearsal"]).default("tester"),
  created_at: z.string(),
});

export const StoryboardSchema = z.object({
  id: z.string(),
  entity_id: z.string(),
  kind: z.enum(["still", "storyboard", "map"]),
  prompt: z.string(),
  prompt_history: z.array(z.object({ prompt: z.string(), edited_at: z.string() })),
  image_url: z.string().optional(),
  notes: z.string().default(""),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProposalSchema = z.object({
  id: z.string(),
  entity_id: z.string(),
  path: z.string(),
  before: z.string(),
  after: z.string(),
  diff: z.string(),
  author: z.enum(["human", "ai"]),
  rationale: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  validation: z.array(
    z.object({
      severity: z.enum(["error", "warning"]),
      code: z.string(),
      entity: z.string().optional(),
      message: z.string(),
    }),
  ),
  reject_reason: z.string().optional(),
  created_at: z.string(),
  decided_at: z.string().optional(),
});
