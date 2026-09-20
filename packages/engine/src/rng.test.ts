import { describe, expect, it } from "vitest";
import { createRng } from "./rng.js";

describe("rng", () => {
  it("repeats for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
});
