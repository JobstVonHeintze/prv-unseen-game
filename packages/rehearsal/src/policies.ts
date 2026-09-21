import type { Canon } from "@contrejour/canon";
import type { PlayerViewSlice } from "./drifter.js";

export const BOTS = [
  "drifter",
  "completionist",
  "romantic",
  "detective",
  "dark-optimiser",
  "saint",
] as const;

export type BotName = (typeof BOTS)[number];

export type PolicyCtx = {
  canon?: Canon;
  visited: string[];
  taken: string[];
  sent: string[];
};

export function isBot(name: string): name is BotName {
  return (BOTS as readonly string[]).includes(name);
}

function sceneOf(canon: Canon | undefined, id: string) {
  return canon?.scenes.find((s) => s.id === id);
}

function secretOf(canon: Canon | undefined, id: string) {
  return canon?.secrets.find((s) => s.id === id);
}

function tagsOf(canon: Canon | undefined, id: string): string[] {
  return sceneOf(canon, id)?.tags ?? [];
}

function effectsOf(canon: Canon | undefined, sceneId: string, choiceId?: string) {
  const scene = sceneOf(canon, sceneId);
  const choices = choiceId ? scene?.choices.filter((c) => c.id === choiceId) : scene?.choices;
  return (choices ?? []).flatMap((c) => c.effects);
}

function hasBank(canon: Canon | undefined, sceneId: string, choiceId?: string): boolean {
  return effectsOf(canon, sceneId, choiceId).some((e) => "bank" in e);
}

function isRomance(canon: Canon | undefined, id: string): boolean {
  const tags = tagsOf(canon, id);
  if (tags.some((t) => t === "romance" || t === "flirt")) return true;
  return /romance|flirt|date/.test(id);
}

function isClue(canon: Canon | undefined, id: string): boolean {
  if (hasBank(canon, id)) return true;
  const scene = sceneOf(canon, id);
  if (scene?.hooks_back.some((h) => h.startsWith("secret."))) return true;
  const tags = tagsOf(canon, id);
  if (tags.includes("clue")) return true;
  return /archive|watch|vip|secret|clue/.test(id);
}

function isForbiddenForSaint(id: string, label: string | undefined, canon: Canon | undefined, sceneId?: string): boolean {
  const text = `${id} ${label ?? ""}`;
  if (/lie|leverage|blackmail|threat|coerce/.test(text)) return true;
  if (sceneId && effectsOf(canon, sceneId, id).some((e) => "start_incident" in e && /leverage/.test(String(e.start_incident)))) {
    return true;
  }
  return false;
}

function prefer<T>(items: T[], want: (item: T) => boolean, fallback: "first" | "last"): T | undefined {
  const hit = items.find(want);
  if (hit) return hit;
  if (items.length === 0) return undefined;
  return fallback === "last" ? items[items.length - 1] : items[0];
}

export function pickScene(
  bot: string,
  options: Array<{ id: string }>,
  ctx: PolicyCtx,
): { id: string } | undefined {
  if (options.length === 0) return undefined;
  switch (bot) {
    case "completionist":
      return prefer(options, (o) => !ctx.visited.includes(o.id), "first");
    case "romantic":
      return prefer(options, (o) => isRomance(ctx.canon, o.id), "first");
    case "detective":
      return prefer(options, (o) => isClue(ctx.canon, o.id), "first");
    case "dark-optimiser":
      return options[options.length - 1];
    default:
      return options[0];
  }
}

export function pickChoice(
  bot: string,
  choices: Array<{ id: string; label?: string }>,
  sceneId: string,
  ctx: PolicyCtx,
): { id: string; label?: string } | undefined {
  if (choices.length === 0) return undefined;
  switch (bot) {
    case "completionist":
      return prefer(choices, (c) => !ctx.taken.includes(`${sceneId}:${c.id}`), "first");
    case "romantic":
      return prefer(
        choices,
        (c) => /romance|flirt|date|kiss/.test(`${c.id} ${c.label ?? ""}`) || isRomance(ctx.canon, sceneId),
        "first",
      );
    case "detective":
      return prefer(choices, (c) => hasBank(ctx.canon, sceneId, c.id) || /film|record|take|listen|search/.test(`${c.id} ${c.label ?? ""}`), "first");
    case "saint":
      return prefer(choices, (c) => !isForbiddenForSaint(c.id, c.label, ctx.canon, sceneId), "first");
    case "dark-optimiser":
      return choices[choices.length - 1];
    default:
      return choices[0];
  }
}

export function pickSend(
  bot: string,
  view: PlayerViewSlice,
  ctx: PolicyCtx,
): { type: "send_secret"; secretId: string; recipientId: string } | null {
  const vault = (view.vault ?? []).filter((v) => !ctx.sent.includes(v.secretId));
  const held = vault[0];
  if (!held) return null;
  const recipients = view.recipients ?? [];
  const secret = secretOf(ctx.canon, held.secretId);
  if (bot === "detective") {
    const tellTo = secret?.uses.tell.to.find((id) => recipients.some((r) => r.id === id));
    const recipientId = tellTo ?? recipients[0]?.id;
    if (!recipientId) return null;
    return { type: "send_secret", secretId: held.secretId, recipientId };
  }
  if (bot === "saint") {
    const tellTo = secret?.uses.tell.to.find((id) => recipients.some((r) => r.id === id));
    if (!tellTo) return null;
    if (secret?.uses.leverage.to.includes(tellTo)) return null;
    return { type: "send_secret", secretId: held.secretId, recipientId: tellTo };
  }
  return null;
}
