import type { Canon } from "./types.js";

const PREFIX_DIR: Array<[string, string]> = [
  ["char.", "characters"],
  ["loc.", "locations"],
  ["scene.", "scenes"],
  ["gate.", "gates"],
  ["secret.", "secrets"],
  ["witness.", "witnesses"],
  ["belief.", "beliefs"],
  ["condition.", "conditions"],
  ["incident.", "incidents"],
];

export type CanonEntityRef = {
  id: string;
  type: string;
  path: string;
  label: string;
};

export function entityRelPath(id: string): string | null {
  if (id === "meta") return "meta.yaml";
  for (const [prefix, dir] of PREFIX_DIR) {
    if (id.startsWith(prefix)) return `${dir}/${id}.yaml`;
  }
  return null;
}

export function listCanonEntities(canon: Canon): CanonEntityRef[] {
  const rows: CanonEntityRef[] = [];
  const add = (type: string, id: string, label: string) => {
    const path = entityRelPath(id);
    if (!path) return;
    rows.push({ id, type, path, label: label || id });
  };
  for (const c of canon.characters) add("characters", c.id, c.display_name);
  for (const l of canon.locations) add("locations", l.id, l.display_name);
  for (const s of canon.scenes) add("scenes", s.id, s.beat.slice(0, 72));
  for (const g of canon.gates) add("gates", g.id, g.name);
  for (const s of canon.secrets) add("secrets", s.id, s.summary);
  for (const w of canon.witnesses) add("witnesses", w.id, w.character);
  for (const b of canon.beliefs) add("beliefs", b.id, b.statement);
  for (const c of canon.conditions) add("conditions", c.id, c.id);
  for (const i of canon.incidents) add("incidents", i.id, i.name ?? i.id);
  return rows;
}

export function searchCanonEntities(canon: Canon, q: string): CanonEntityRef[] {
  const all = listCanonEntities(canon);
  const query = q.trim().toLowerCase();
  if (!query) return all;
  return all.filter((row) => {
    const hay = `${row.id} ${row.type} ${row.label} ${row.path}`.toLowerCase();
    return hay.includes(query);
  });
}
