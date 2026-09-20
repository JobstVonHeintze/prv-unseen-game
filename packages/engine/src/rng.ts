export interface SeededRng {
  next(): number;
  nextFloat(): number;
  chance(p: number): boolean;
}

/** xorshift32. Injected; engine never reads Math.random. */
export function createRng(seed: number): SeededRng {
  let s = seed >>> 0 || 1;
  const next = (): number => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s >>> 0;
  };
  return {
    next,
    nextFloat: () => next() / 0x100000000,
    chance: (p: number) => next() / 0x100000000 < p,
  };
}
