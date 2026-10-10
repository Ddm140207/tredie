/**
 * Deterministic pseudo-randomness derived from a real Stellar transaction hash.
 *
 * Every visual attribute of a Tredie is seeded from its transaction id, so the
 * exact same transaction always produces the exact same creature. That keeps
 * generation retries idempotent: a failed image generation is re-run against
 * identical attributes instead of rerolling a new creature for a paid transfer.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /**
   * Element chosen according to `weight`. Entries whose weight is zero (or
   * anything that is not a positive finite number) are never selectable.
   */
  weighted<T extends { weight: number }>(items: readonly T[]): T;
  /** True with probability `p`. Throws when `p` is outside [0, 1]. */
  chance(p: number): boolean;
}

export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * MurmurHash3's 32-bit finalizer: full avalanche in both directions.
 *
 * FNV-1a walks a string left to right and only XORs the last character, so the
 * *tail* of an input (the `purpose` half of a stream key) is mixed far more
 * weakly than the head: `fnv1a("...feature")` and `fnv1a("...features")` land
 * only a few arithmetic steps apart. Running each half of a stream key through
 * fmix32 first means sibling keys differing by one trailing character can never
 * seed near-identical generators.
 */
function fmix32(hash: number): number {
  let h = hash >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * splitmix32 step over a one-word cursor. It is a bijection on 32 bits, so
 * expanding a seed through it preserves every bit of entropy instead of folding
 * a wide seed into a single weak word.
 */
function splitmix32(cursor: { value: number }): number {
  cursor.value = (cursor.value + 0x9e3779b9) >>> 0;
  let z = cursor.value;
  z ^= z >>> 16;
  z = Math.imul(z, 0x21f0aaad);
  z ^= z >>> 15;
  z = Math.imul(z, 0x735a2d97);
  z ^= z >>> 15;
  return z >>> 0;
}

function rotl32(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

/**
 * Deterministic generator. The core is xoshiro128** with a 128-bit state
 * expanded from the seed by two independent splitmix32 chains. Two properties
 * matter for the product:
 *
 *   - `seed` may carry the full 53 bits of JavaScript's safe integer range
 *     (see `streamFor`), so a stream is not pinned to the 32 bits of one
 *     string hash; distinct transactions and distinct attribute streams stay
 *     independent.
 *   - one warm-up draw is burned before anything is returned, so the first
 *     value a caller sees depends on *both* seed halves. Two seeds sharing
 *     half their bits then diverge immediately instead of producing a
 *     correlated first roll.
 *
 * Given the same seed the sequence is identical forever, which is the contract
 * the whole Tredie generation loop depends on.
 */
export function createRng(seed: number): Rng {
  const lo = seed >>> 0;
  // Fold the upper half with a distinct constant so its splitmix chain can
  // never alias the lower half's chain for a valid (lo, hi) pair.
  const hi = (Math.floor(seed / 0x100000000) >>> 0) ^ 0xbb67ae85;

  const lower = { value: lo };
  const upper = { value: hi };
  let s0 = splitmix32(lower);
  let s1 = splitmix32(lower);
  let s2 = splitmix32(upper);
  let s3 = splitmix32(upper);

  // xoshiro must never rest on the all-zero state. Astronomically unlikely
  // after splitmix, but the guard makes it impossible rather than improbable.
  if ((s0 | s1 | s2 | s3) === 0) s3 = 1;

  const step = (): number => {
    const result = Math.imul(rotl32(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl32(s3, 11);
    return result / 4294967296;
  };

  // Warm-up (see the note above): the first *returned* value is taken after a
  // full state update, so it already reflects both halves of the seed.
  step();

  const next = step;

  const rng: Rng = {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new Error(`rng.int requires integer min <= max, received (${min}, ${max})`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]) {
      if (items.length === 0) throw new Error("rng.pick called with an empty list");
      return items[Math.floor(next() * items.length)] as T;
    },
    weighted<T extends { weight: number }>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("rng.weighted called with an empty list");
      let total = 0;
      for (const item of items) {
        if (Number.isFinite(item.weight) && item.weight > 0) total += item.weight;
      }
      if (total <= 0) throw new Error("rng.weighted requires a positive total weight");

      let remaining = next() * total;
      let lastEligible: T | undefined;
      for (const item of items) {
        // The naive `roll -= weight; if (roll <= 0)` form hands the item to a
        // zero-weight entry whenever the roll lands on exactly 0, so weights
        // are checked before the roll is compared.
        if (!(item.weight > 0)) continue;
        if (remaining < item.weight) return item;
        remaining -= item.weight;
        lastEligible = item;
      }
      // Only reachable through floating-point residue in the weight sum.
      if (lastEligible === undefined) {
        throw new Error("rng.weighted requires a positive total weight");
      }
      return lastEligible;
    },
    chance(p) {
      if (!Number.isFinite(p) || p < 0 || p > 1) {
        throw new Error(`rng.chance expects a probability in [0, 1], received ${p}`);
      }
      return next() < p;
    },
  };

  return rng;
}

/**
 * Each attribute category gets its own independent stream so that changing the
 * number of accessories, or the accessory pool, never shifts the colour roll.
 *
 * The transaction hash and the purpose are hashed *separately* and only then
 * combined. Hashing `${txHash}:${purpose}` in one pass would make the purpose
 * the weak tail of an FNV-1a input, so two sibling purposes differing by a
 * trailing character could seed nearly identical generators. Both halves are
 * avalanched, then packed into the 53 bits of safe integer precision so the
 * stream seed is real entropy rather than a single 32-bit word — while staying
 * a pure function of (txHash, purpose).
 */
export function streamFor(txHash: string, purpose: string): Rng {
  const material = fmix32(fnv1a(txHash));
  const salt = fmix32(fnv1a(purpose));
  // 27 diffused bits + 26 diffused bits = 53, the largest integer JavaScript
  // represents exactly. Truncation happens only after the avalanche, so no
  // structured (low-entropy) bits are dropped.
  const seed = (material >>> 5) * 0x4000000 + (salt >>> 6);
  return createRng(seed);
}
