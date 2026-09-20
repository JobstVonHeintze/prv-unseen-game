import type { Canon, ValidationIssue } from "./types.js";

export function validateCanon(canon: Canon): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  const take = (id: string, entity: string) => {
    if (ids.has(id)) issues.push({ severity: "error", code: "duplicate-id", entity, message: `duplicate ${id}` });
    ids.add(id);
  };

  for (const c of canon.characters) {
    take(c.id, c.id);
    if (c.romance.available && c.age < 18) {
      issues.push({
        severity: "error",
        code: "age-rule",
        entity: c.id,
        message: "romanceable character must be 18 or older",
      });
    }
  }
  for (const loc of canon.locations) {
    take(loc.id, loc.id);
    for (const node of loc.nodes) take(node.id, node.id);
  }
  for (const s of canon.scenes) take(s.id, s.id);
  for (const g of canon.gates) take(g.id, g.id);
  for (const s of canon.secrets) take(s.id, s.id);
  for (const w of canon.witnesses) take(w.id, w.id);
  for (const b of canon.beliefs) take(b.id, b.id);
  for (const c of canon.conditions) {
    take(c.id, c.id);
    if (!c.levels.includes(c.default)) {
      issues.push({ severity: "error", code: "ref", entity: c.id, message: `default ${c.default} is not a level` });
    }
  }
  for (const inc of canon.incidents) take(inc.id, inc.id);

  const has = (id: string) =>
    ids.has(id) || id.startsWith("flag.") || id.startsWith("meter.") || id.startsWith("spine.") || id.startsWith("condition.");

  for (const scene of canon.scenes) {
    if (!has(scene.location.split(".").slice(0, 2).join(".")) && !ids.has(scene.location)) {
      const locId = scene.location.replace(/\.l[1-4]$/, "");
      if (!ids.has(locId)) {
        issues.push({ severity: "error", code: "ref", entity: scene.id, message: `unknown location ${scene.location}` });
      }
    }
    for (const member of scene.cast) {
      if (!ids.has(member)) issues.push({ severity: "error", code: "ref", entity: scene.id, message: `unknown cast ${member}` });
    }
    const side = scene.tags.some((t) => ["romance", "rent", "shift", "flirt"].includes(t));
    if (side && scene.hooks_back.length === 0 && scene.slot !== "gate-internal") {
      issues.push({
        severity: "error",
        code: "hooks-back",
        entity: scene.id,
        message: "side strand must declare hooks_back",
      });
    }
    if (scene.tags.includes("romance")) {
      for (const member of scene.cast) {
        const ch = canon.characters.find((c) => c.id === member);
        if (ch && ch.age < 18) {
          issues.push({
            severity: "error",
            code: "age-rule",
            entity: scene.id,
            message: `${member} is under 18 in a romance scene`,
          });
        }
      }
    }
    if (scene.intimate && scene.intimate.consent !== "negotiated") {
      issues.push({ severity: "error", code: "consent", entity: scene.id, message: "intimate scene requires consent: negotiated" });
    }
    if (scene.tags.includes("coercion") && scene.tags.includes("intimate")) {
      issues.push({
        severity: "error",
        code: "consent",
        entity: scene.id,
        message: "coercion may not be tagged intimate",
      });
    }
  }

  for (const gate of canon.gates) {
    if (!ids.has(gate.scene)) {
      issues.push({ severity: "error", code: "ref", entity: gate.id, message: `unknown scene ${gate.scene}` });
    }
    if (!gate.trigger.date?.day) {
      issues.push({ severity: "error", code: "dual-trigger", entity: gate.id, message: "gate missing date trigger" });
    }
    if (!gate.trigger.progress) {
      issues.push({ severity: "error", code: "dual-trigger", entity: gate.id, message: "gate missing progress trigger" });
    }
  }

  const checkEffects = (entity: string, effects: Array<Record<string, unknown>>) => {
    for (const effect of effects) {
      if (typeof effect.start_incident === "string" && !ids.has(effect.start_incident)) {
        issues.push({ severity: "error", code: "ref", entity, message: `unknown incident ${effect.start_incident}` });
      }
      if (typeof effect.enter === "string" && !ids.has(effect.enter)) {
        issues.push({ severity: "error", code: "ref", entity, message: `unknown scene ${effect.enter}` });
      }
      if (typeof effect.bank === "string" && !ids.has(effect.bank)) {
        issues.push({ severity: "error", code: "ref", entity, message: `unknown secret ${effect.bank}` });
      }
    }
  };

  for (const scene of canon.scenes) {
    for (const choice of scene.choices) checkEffects(scene.id, choice.effects as Array<Record<string, unknown>>);
  }

  for (const secret of canon.secrets) {
    if (!ids.has(secret.capture.node)) {
      issues.push({ severity: "error", code: "ref", entity: secret.id, message: `unknown node ${secret.capture.node}` });
    }
    for (const member of secret.about) {
      if (!ids.has(member)) issues.push({ severity: "error", code: "ref", entity: secret.id, message: `unknown about ${member}` });
    }
    checkEffects(secret.id, secret.uses.keep.effects as Array<Record<string, unknown>>);
    checkEffects(secret.id, secret.uses.tell.effects as Array<Record<string, unknown>>);
    checkEffects(secret.id, secret.uses.leverage.effects as Array<Record<string, unknown>>);
  }

  for (const w of canon.witnesses) {
    if (!ids.has(w.character)) {
      issues.push({ severity: "error", code: "ref", entity: w.id, message: `unknown character ${w.character}` });
    }
  }

  for (const inc of canon.incidents) {
    if (!ids.has(inc.scene)) {
      issues.push({ severity: "error", code: "ref", entity: inc.id, message: `unknown scene ${inc.scene}` });
    }
    if (inc.after_choice && !ids.has(inc.after_choice.scene)) {
      issues.push({ severity: "error", code: "ref", entity: inc.id, message: `unknown trigger scene ${inc.after_choice.scene}` });
    }
    if (inc.fires_gate && !ids.has(inc.fires_gate)) {
      issues.push({ severity: "error", code: "ref", entity: inc.id, message: `unknown gate ${inc.fires_gate}` });
    }
    if (!ids.has(inc.pressure.condition)) {
      issues.push({ severity: "error", code: "ref", entity: inc.id, message: `unknown condition ${inc.pressure.condition}` });
    }
    const cover = canon.scenes.find((s) => s.id === inc.scene);
    for (const choiceId of inc.valid) {
      if (cover && !cover.choices.some((c) => c.id === choiceId)) {
        issues.push({ severity: "error", code: "ref", entity: inc.id, message: `valid choice ${choiceId} missing on ${inc.scene}` });
      }
    }
  }

  return issues;
}

export function assertValid(canon: Canon): void {
  const errors = validateCanon(canon).filter((i) => i.severity === "error");
  if (errors.length > 0) {
    const msg = errors.map((e) => `${e.code} ${e.entity ?? ""}: ${e.message}`).join("\n");
    throw new Error(`canon invalid\n${msg}`);
  }
}
