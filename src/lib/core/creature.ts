import { RARITY_COLORS, EXPRESSIONS, MATERIALS, NO_ACCESSORY_CHANCE, NO_SPECIAL_FEATURE_CHANCE, ACCESSORIES, SPECIAL_FEATURES, PERSONALITIES, NAMES, NAME_ONSETS, NAME_RHYMES, COLOR_BY_ID, GOLDEN_OTTER } from "@/config/vocab";
import { RARITY_META, SPECIES_BY_RARITY, findBand } from "@/config/rarity";
import { streamFor, type Rng } from "@/lib/core/rng";
import type { ColorDef, CreatureAttributeRecord, NamedDef, Rarity } from "@/types";

/**
 * The application decides every attribute of a Tredie. The image model only
 * renders what it is handed. Nothing here is delegated to a generative model.
 */

const PICK_STREAM = "rarity";

export interface BuildResult {
  rarity: Rarity;
  bandId: string;
  isGolden: boolean;
  attributes: CreatureAttributeRecord;
}

function resolveRarity(txHash: string, amountUsd: number, bandId: string) {
  const band = findBand(amountUsd);
  return band.options.length === 1
    ? (band.options[0] as { rarity: Rarity }).rarity
    : streamFor(txHash, `${PICK_STREAM}:${bandId}`).weighted(band.options).rarity;
}

function resolveGolden(txHash: string, amountUsd: number) {
  const band = findBand(amountUsd);
  if (band.goldenChance <= 0) return false;
  return streamFor(txHash, "golden").chance(band.goldenChance);
}

function pickSecondaryColor(txHash: string, primaryId: string, pool: readonly ColorDef[], rarity: Rarity) {
  // Seeded per transaction, not per colour. Deriving this stream from the
  // primary colour alone would give every creature sharing a primary colour
  // the same secondary colour, which reads as a bug in the collection.
  const rng = streamFor(txHash, `color:secondary:${rarity}:${primaryId}`);
  const candidates = pool.filter((color) => color.id !== primaryId);
  if (candidates.length === 0) return pool[0]!;
  return rng.pick(candidates);
}

function hexFor(id: string) {
  const found = COLOR_BY_ID.get(id);
  if (!found) throw new Error(`Unknown colour id: ${id}`);
  return found.hex;
}

export function buildCreature(input: { txHash: string; amountUsd: number }): BuildResult {
  const { txHash, amountUsd } = input;
  const band = findBand(amountUsd);
  const isGolden = resolveGolden(txHash, amountUsd);
  // The golden is always the Legendary otter, whatever the band rolled.
  const rarity: Rarity = isGolden ? "LEGENDARY" : resolveRarity(txHash, amountUsd, band.id);
  const species = SPECIES_BY_RARITY[rarity];

  // Golden otter: a fixed, hand-tuned variant of the Legendary pool.
  if (isGolden) {
    return {
      rarity,
      bandId: band.id,
      isGolden,
      attributes: {
        bandId: band.id,
        rarity,
        species,
        isGolden,
        primaryColor: GOLDEN_OTTER.primaryColor,
        primaryColorHex: hexFor(GOLDEN_OTTER.primaryColor),
        secondaryColor: GOLDEN_OTTER.secondaryColor,
        secondaryColorHex: hexFor(GOLDEN_OTTER.secondaryColor),
        material: GOLDEN_OTTER.material,
        expression: "Confident",
        accessory: GOLDEN_OTTER.accessory.id,
        specialFeature: "Subtle soft glow",
        personality: PERSONALITIES[0]!.prompt,
        name: pickName(txHash, "golden"),
      },
    };
  }

  const colorPool = RARITY_COLORS[rarity];
  const primary = streamFor(txHash, "color:primary").weighted(colorPool);
  const secondary = pickSecondaryColor(txHash, primary.id, colorPool, rarity);

  const material = streamFor(txHash, "material").weighted(MATERIALS[rarity]);
  const expression = streamFor(txHash, "expression").weighted(EXPRESSIONS[rarity]);

  const accessory = pickAccessory(txHash, rarity);
  const specialFeature = pickSpecialFeature(txHash, rarity);

  return {
    rarity,
    bandId: band.id,
    isGolden,
    attributes: {
      bandId: band.id,
      rarity,
      species,
      isGolden,
      primaryColor: primary.name,
      primaryColorHex: primary.hex,
      secondaryColor: secondary.name,
      secondaryColorHex: secondary.hex,
      material: material.name,
      expression: expression.name,
      accessory: accessory,
      specialFeature: specialFeature?.name ?? null,
      personality: streamFor(txHash, "personality").pick(PERSONALITIES).prompt,
      name: pickName(txHash, "name"),
    },
  };
}

/**
 * Second safety net for the name synthesiser. Everything it can build comes
 * out of the curated syllables, but the pool will grow over time and a future
 * blend could spell something the product must never show. The three species
 * words are banned outright by the spec: a name identifies the individual,
 * never the species.
 */
const NAME_BANNED_SUBSTRINGS: readonly string[] = [
  "rock", "fish", "otter",
  "sex", "fuck", "shit", "ass", "cock", "dick", "cunt", "pussy", "bitch",
  "tit", "cum", "porn", "rape", "nazi", "whore", "slut", "fag", "nigg",
  "piss", "wank", "penis", "vagina", "boob", "masturb", "suck", "crap",
];

function acceptableName(candidate: string): boolean {
  if (candidate.length < 3 || candidate.length > 9) return false;
  if (!/^[a-z]+$/.test(candidate)) return false;
  if (!/[aeiou]/.test(candidate)) return false;
  return !NAME_BANNED_SUBSTRINGS.some((banned) => candidate.includes(banned));
}

/**
 * Rule-based name synthesiser: recombines onsets and rhymes harvested from the
 * curated `NAMES` pool, rolled from the caller's seeded stream. Two shapes are
 * available — a single blend ("m" + "ochi" → "Mochi") and a compound that
 * appends a second rhyme ("z" + "ori" + "ba" → "Zoriba"). No network, no model,
 * no clock: the same stream state always yields the same name.
 *
 * Returns `null` when the inventory is degenerate or no safe blend survives
 * the filters, and the caller falls back to the static pool.
 */
function synthesizeName(rng: Rng): string | null {
  if (NAME_ONSETS.length === 0 || NAME_RHYMES.length === 0) return null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const compound = rng.chance(0.35);
    const onset = rng.pick(NAME_ONSETS);
    const first = rng.pick(NAME_RHYMES);
    let candidate = onset + first;
    if (compound) {
      const second = rng.pick(NAME_RHYMES);
      // Two identical vowels in a row read like a typo ("Mochioori").
      if (first.charAt(first.length - 1) === second.charAt(0)) continue;
      candidate += second;
    }
    if (!acceptableName(candidate)) continue;
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  return null;
}

/**
 * The name is a pure function of (txHash, purpose): creation retries and
 * re-reads always resolve to the same string, and it is persisted as a plain
 * string the moment the Tredie is created.
 */
function pickName(txHash: string, purpose: string): string {
  const rng = streamFor(txHash, `name:${purpose}`);
  const synthesised = synthesizeName(rng);
  // The fallback is drawn from the same stream the synthesiser consumed, so
  // the degenerate case is deterministic too.
  if (synthesised) return synthesised;
  if (NAMES.length > 0) return rng.pick(NAMES);
  return "Tredie"; // unreachable once validateCreatureConfig() has run at boot
}

/**
 * Returns the accessory **id**, or `null` when this rarity rolled no accessory.
 * Only one accessory is worn at a time, and only ids that have art are eligible.
 */
function pickAccessory(txHash: string, rarity: Rarity): string | null {
  const rng = streamFor(txHash, "accessory");
  if (rng.chance(NO_ACCESSORY_CHANCE[rarity])) return null;
  return rng.weighted(ACCESSORIES[rarity]).id;
}

function pickSpecialFeature(txHash: string, rarity: Rarity): NamedDef | null {
  const rng = streamFor(txHash, "feature");
  if (rng.chance(NO_SPECIAL_FEATURE_CHANCE[rarity])) return null;
  return rng.weighted(SPECIAL_FEATURES[rarity]);
}

export function speciesBlurb(species: CreatureAttributeRecord["species"]) {
  if (species === "ROCK") return "A rounded stone with a friendly face.";
  if (species === "FISH") return "A small fish with big eyes and tiny fins.";
  return "An otter. Round, clever, unreasonably charming.";
}

export { RARITY_META };