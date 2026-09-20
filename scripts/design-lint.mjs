#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), "DESIGN.md");
const text = readFileSync(file, "utf8");
const parts = text.split("---");
if (parts.length < 3) {
  console.error("design:lint: DESIGN.md is missing YAML front matter");
  process.exit(1);
}
const front = parts[1] ?? "";
if (!front.includes("colors:") || !front.includes("typography:")) {
  console.error("design:lint: DESIGN.md front matter is missing required token blocks");
  process.exit(1);
}
const hexes = [...front.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
if (hexes.length < 8) {
  console.error(`design:lint: expected at least 8 color tokens, found ${hexes.length}`);
  process.exit(1);
}
process.stdout.write(`design:lint ok (${hexes.length} color tokens)\n`);
