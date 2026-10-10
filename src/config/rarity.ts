import type { Rarity, Species } from "@/types";

/**
 * Single source of truth for "how much did they send" -> "what rarity".
 *
 * Everything the application needs to change the economy lives in this file.
 * No application logic hardcodes a threshold, a weight, or a species.
 */

export interface RarityOption {
  rarity: Rarity;
  weight: number;
}

export interface AmountBand {
  id: string;
  /** Inclusive lower bound in USD. */
  minUsd: number;
  /** Inclusive upper bound in USD, `null` means unbounded. */
  maxUsd: number | null;
  /** Human label for the band, used in the create flow. */
  label: string;
  options: RarityOption[];
  /**
   * Absolute probability that a transfer in this band produces the golden
   * otter, independent of the rarity roll. 0 disables the golden variant for
   * the band.
   */
  goldenChance: number;
}

/** Below this amount the golden otter can never appear, however lucky the roll. */
export const GOLDEN_MIN_USD = 2000;
/** The single most improbable outcome in the product: a $2000+ transfer still only rolls golden 1 time in 1000. */
export const GOLDEN_CHANCE = 0.001;

export const RARITY_ORDER: readonly Rarity[] = ["RARE", "EPIC", "LEGENDARY"];

export const SPECIES_BY_RARITY: Record<Rarity, Species> = {
  RARE: "ROCK",
  EPIC: "FISH",
  LEGENDARY: "OTTER",
};

export const RARITY_META: Record<
  Rarity,
  { label: string; blurb: string; accent: string; soft: string; text: string; order: number }
> = {
  RARE: {
    label: "Rare",
    blurb: "A quiet little rock. Simple, solid, yours.",
    accent: "#7C93B8",
    soft: "#EAF0F8",
    text: "#3F5578",
    order: 1,
  },
  EPIC: {
    label: "Epic",
    blurb: "A bright little fish with a lot to say.",
    accent: "#8E7BC4",
    soft: "#F0ECFA",
    text: "#56408C",
    order: 2,
  },
  LEGENDARY: {
    label: "Legendary",
    blurb: "An otter. The rarest friend in the whole tide pool.",
    accent: "#C39A3E",
    soft: "#FBF2DC",
    text: "#8A6612",
    order: 3,
  },
};

export interface RarityConfig {
  /** Smallest transfer the app will accept. */
  minTransferUsd: number;
  /** Largest transfer the app will accept. */
  maxTransferUsd: number;
  /** How many decimal places a transfer may have. USDC has 7, 2 keeps it human. */
  decimals: number;
  bands: AmountBand[];
}

export const RARITY_CONFIG: RarityConfig = {
  minTransferUsd: 0.01,
  maxTransferUsd: 100_000,
  decimals: 2,
  bands: [
    {
      id: "shimmer",
      minUsd: 0.01,
      maxUsd: 9.99,
      label: "Shimmer",
      options: [{ rarity: "RARE", weight: 1 }],
      goldenChance: 0,
    },
    {
      id: "sprout",
      minUsd: 10,
      maxUsd: 49.99,
      label: "Sprout",
      options: [
        { rarity: "RARE", weight: 0.55 },
        { rarity: "EPIC", weight: 0.45 },
      ],
      goldenChance: 0,
    },
    {
      id: "tide",
      minUsd: 50,
      maxUsd: 199.99,
      label: "Tide",
      options: [{ rarity: "EPIC", weight: 1 }],
      goldenChance: 0,
    },
    {
      id: "deep",
      minUsd: 200,
      maxUsd: 1999.99,
      label: "Deep",
      options: [
        { rarity: "EPIC", weight: 0.5 },
        { rarity: "LEGENDARY", weight: 0.5 },
      ],
      goldenChance: 0,
    },
    {
      id: "abyss",
      minUsd: GOLDEN_MIN_USD,
      maxUsd: null,
      label: "Abyss",
      options: [{ rarity: "LEGENDARY", weight: 1 }],
      goldenChance: GOLDEN_CHANCE,
    },
  ],
};

export function findBand(amountUsd: number): AmountBand {
  for (const band of RARITY_CONFIG.bands) {
    const withinMin = amountUsd >= band.minUsd;
    const withinMax = band.maxUsd === null ? true : amountUsd <= band.maxUsd;
    if (withinMin && withinMax) return band;
  }
  // Below the minimum is still a valid "tiny" transfer.
  return RARITY_CONFIG.bands[0] as AmountBand;
}

export function isAmountAllowed(amountUsd: number) {
  return (
    Number.isFinite(amountUsd) &&
    amountUsd >= RARITY_CONFIG.minTransferUsd &&
    amountUsd <= RARITY_CONFIG.maxTransferUsd
  );
}

export function bandProbability(band: AmountBand, rarity: Rarity) {
  const total = band.options.reduce((sum, option) => sum + option.weight, 0);
  const match = band.options.find((option) => option.rarity === rarity);
  if (!match || total <= 0) return 0;
  return match.weight / total;
}

export function allowedRaritiesFor(amountUsd: number): Rarity[] {
  return findBand(amountUsd).options.map((option) => option.rarity);
}

export interface BandPreview {
  band: AmountBand;
  allowed: { rarity: Rarity; probability: number }[];
  goldenOtterChance: number;
  next: { band: AmountBand; amountUsd: number; unlocks: Rarity[] } | null;
}

export function previewBand(amountUsd: number): BandPreview {
  const band = findBand(amountUsd);
  const allowed = band.options.map((option) => ({
    rarity: option.rarity,
    probability: bandProbability(band, option.rarity),
  }));

  let next: BandPreview["next"] = null;
  for (const candidate of RARITY_CONFIG.bands) {
    if (candidate.minUsd > amountUsd) {
      const unlocks = new Set<Rarity>();
      const current = new Set(allowed.map((entry) => entry.rarity));
      for (const option of candidate.options) {
        if (!current.has(option.rarity)) unlocks.add(option.rarity);
      }
      next = { band: candidate, amountUsd: candidate.minUsd, unlocks: [...unlocks] };
      break;
    }
  }

  const goldenOtterChance = band.goldenChance;

  return { band, allowed, goldenOtterChance, next };
}

/** Absolute chance that a transfer of this size produces the golden otter. */
export function goldenChanceFor(amountUsd: number): number {
  return findBand(amountUsd).goldenChance;
}