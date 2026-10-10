import { ACCESSORY_PORTRAIT } from "@/config/portraits";
import { RARITY_CONFIG, RARITY_ORDER } from "@/config/rarity";
import type { ColorDef, MaterialDef, NamedDef, Rarity } from "@/types";

/**
 * Curated attribute vocabulary. Every entry carries the exact wording that goes
 * into the generation prompt, so the prompt never has to reword a value.
 */

/** The sixteen colours named in the product spec. */
export const COLORS: readonly ColorDef[] = [
  { id: "warm-cream", name: "Warm cream", hex: "#F3E7D3" },
  { id: "soft-beige", name: "Soft beige", hex: "#E3D3B8" },
  { id: "brown", name: "Brown", hex: "#8A5A3B" },
  { id: "coral", name: "Coral", hex: "#F08A6B" },
  { id: "soft-pink", name: "Soft pink", hex: "#F4BFC8" },
  { id: "sky-blue", name: "Sky blue", hex: "#8FC3E8" },
  { id: "lavender", name: "Lavender", hex: "#BBA7E0" },
  { id: "mint", name: "Mint", hex: "#A6DCC0" },
  { id: "sage", name: "Sage", hex: "#9BB694" },
  { id: "warm-gray", name: "Warm gray", hex: "#C3B7A8" },
  { id: "charcoal", name: "Charcoal", hex: "#3C3833" },
  { id: "white", name: "White", hex: "#FAF7F1" },
  { id: "pearl", name: "Pearl", hex: "#EDE6DC" },
  { id: "deep-blue", name: "Deep blue", hex: "#31507F" },
  { id: "silver", name: "Silver", hex: "#C4C9CE" },
  { id: "gold", name: "Gold", hex: "#D8A73F" },
] as const;

export const COLOR_BY_ID = new Map(COLORS.map((color) => [color.id, color]));

/** Higher weight = more common inside its rarity pool. */
type Weighted<T> = T & { weight: number };

const colour = (id: string, weight: number): Weighted<ColorDef> => {
  const found = COLOR_BY_ID.get(id);
  if (!found) throw new Error(`Unknown colour id: ${id}`);
  return { ...found, weight };
};

export const RARITY_COLORS: Record<Rarity, readonly Weighted<ColorDef>[]> = {
  // Muted and simple. "Rare colours" in the spec means the quiet end.
  RARE: [
    colour("warm-cream", 3),
    colour("soft-beige", 3),
    colour("warm-gray", 3),
    colour("sage", 2),
    colour("soft-pink", 2),
    colour("sky-blue", 2),
    colour("pearl", 2),
    colour("white", 2),
    colour("brown", 1),
  ],
  EPIC: [
    colour("mint", 3),
    colour("lavender", 3),
    colour("coral", 3),
    colour("sky-blue", 2),
    colour("soft-pink", 2),
    colour("silver", 2),
    colour("sage", 2),
    colour("pearl", 1),
    colour("deep-blue", 1),
    colour("soft-beige", 1),
  ],
  LEGENDARY: [
    colour("mint", 2),
    colour("lavender", 2),
    colour("coral", 2),
    colour("silver", 2),
    colour("deep-blue", 2),
    colour("pearl", 2),
    colour("charcoal", 1),
    colour("gold", 1),
    colour("white", 1),
  ],
};

export const MATERIALS: Record<Rarity, readonly Weighted<MaterialDef>[]> = {
  RARE: [
    { id: "stone", name: "Stone", weight: 3, finish: "matte", baseHex: "#B9B2A6", highlightHex: "#D8D2C6", prompt: "matte natural stone, dry soft surface" },
    { id: "matte", name: "Matte", weight: 3, finish: "matte", baseHex: "#C6C0B6", highlightHex: "#E4DFD6", prompt: "smooth matte finish with no shine" },
    { id: "soft-ceramic", name: "Soft ceramic", weight: 2, finish: "ceramic", baseHex: "#EFE3D2", highlightHex: "#FBF4EA", prompt: "soft glazed ceramic, gentle satin sheen" },
    { id: "polished-stone", name: "Polished stone", weight: 2, finish: "glossy", baseHex: "#A9A399", highlightHex: "#DCD8D0", prompt: "polished stone with a gentle surface glow" },
  ],
  EPIC: [
    { id: "pearl", name: "Pearl", weight: 3, finish: "glossy", baseHex: "#F0E7DC", highlightHex: "#FFFDF9", prompt: "pearl finish with a soft inner glow" },
    { id: "glossy", name: "Glossy", weight: 3, finish: "glossy", baseHex: "#BFD8E8", highlightHex: "#F0FAFF", prompt: "high gloss lacquer, crisp soft reflections" },
    { id: "iridescent", name: "Iridescent", weight: 2, finish: "iridescent", baseHex: "#C9BCE8", highlightHex: "#F4E9FF", prompt: "soft iridescence, pale colour shift across the surface" },
    { id: "soft-metallic", name: "Soft metallic", weight: 2, finish: "metallic", baseHex: "#B9BEC4", highlightHex: "#EEF1F4", prompt: "brushed soft metal, muted reflections" },
    { id: "premium-ceramic", name: "Premium ceramic", weight: 1, finish: "ceramic", baseHex: "#F5EDE1", highlightHex: "#FFFFFF", prompt: "premium ceramic glaze, immaculate soft highlight" },
  ],
  LEGENDARY: [
    { id: "polished-metal", name: "Polished metal", weight: 3, finish: "metallic", baseHex: "#C0C6CC", highlightHex: "#F4F7FA", prompt: "highly polished metal with elegant studio reflections" },
    { id: "pearl", name: "Pearl", weight: 3, finish: "glossy", baseHex: "#F1E9DE", highlightHex: "#FFFFFF", prompt: "deep pearl finish with a warm inner light" },
    { id: "iridescent-luxury", name: "Iridescent luxury material", weight: 2, finish: "iridescent", baseHex: "#CDBFEA", highlightHex: "#F7EDFF", prompt: "luxury iridescent material, refined subtle colour shift" },
    { id: "silver", name: "Silver", weight: 2, finish: "metallic", baseHex: "#C9CED3", highlightHex: "#FAFCFE", prompt: "brilliant silver with soft warm reflections" },
    { id: "gold", name: "Gold", weight: 1, finish: "metallic", baseHex: "#D8A73F", highlightHex: "#F5DA92", prompt: "warm gold, softly polished with golden reflections" },
  ],
};

export const EXPRESSIONS: Record<Rarity, readonly Weighted<NamedDef>[]> = {
  RARE: [
    { id: "calm", name: "Calm", weight: 3, prompt: "calm and content, small relaxed smile" },
    { id: "curious", name: "Curious", weight: 3, prompt: "curious, head slightly tilted, wide interested eyes" },
    { id: "sleepy", name: "Sleepy", weight: 2, prompt: "sleepy, heavy eyelids, tiny yawn" },
    { id: "shy", name: "Shy", weight: 2, prompt: "shy, looking slightly away, soft blush" },
  ],
  EPIC: [
    { id: "playful", name: "Playful", weight: 3, prompt: "playful and cheeky, one bright open smile" },
    { id: "excited", name: "Excited", weight: 3, prompt: "excited, sparkling wide eyes, open smile" },
    { id: "grumpy", name: "Grumpy", weight: 2, prompt: "grumpy in a funny way, tiny frown" },
    { id: "cheerful", name: "Cheerful", weight: 2, prompt: "cheerful, bouncing posture, big friendly grin" },
    { id: "curious", name: "Curious", weight: 2, prompt: "curious, wide eyes, half smile" },
  ],
  LEGENDARY: [
    { id: "confident", name: "Confident", weight: 3, prompt: "confident and self-assured, calm assured smile" },
    { id: "wise", name: "Wise", weight: 2, prompt: "wise and gentle, soft knowing smile, kind eyes" },
    { id: "serene", name: "Serene", weight: 2, prompt: "serene, half closed peaceful eyes, tiny serene smile" },
    { id: "dazzled", name: "Dazzled", weight: 2, prompt: "dazzled, starry bright eyes, delighted open smile" },
    { id: "gracious", name: "Gracious", weight: 1, prompt: "gracious and elegant, poised warm smile" },
  ],
};

/**
 * Only accessories that have real art are selectable, because the portrait is
 * composed from the asset rather than generated. The ids must match the keys in
 * `ACCESSORY_PORTRAIT` in `src/config/portraits.ts`.
 */
export const ACCESSORIES: Record<Rarity, readonly Weighted<NamedDef>[]> = {
  RARE: [
    { id: "noob-hat", name: "Noob hat", weight: 3, prompt: "a blocky pixel hat" },
    { id: "french-hat", name: "French hat", weight: 2, prompt: "a soft tilted beret" },
  ],
  EPIC: [
    { id: "top-hat", name: "Top hat", weight: 3, prompt: "a tall black top hat" },
    { id: "grad-hat", name: "Grad hat", weight: 2, prompt: "a graduation cap with a tassel" },
    { id: "french-hat", name: "French hat", weight: 2, prompt: "a soft tilted beret" },
  ],
  LEGENDARY: [
    { id: "top-hat", name: "Top hat", weight: 3, prompt: "a tall black top hat" },
    { id: "grad-hat", name: "Grad hat", weight: 3, prompt: "a graduation cap with a tassel" },
    { id: "french-hat", name: "French hat", weight: 2, prompt: "a soft tilted beret" },
    { id: "noob-hat", name: "Noob hat", weight: 1, prompt: "a blocky pixel hat" },
  ],
};

/** `null` weight on the band means "this rarity can roll no accessory at all". */
export const NO_ACCESSORY_CHANCE: Record<Rarity, number> = {
  RARE: 0.35,
  EPIC: 0.1,
  LEGENDARY: 0,
};

export const MAX_ACCESSORIES: Record<Rarity, number> = {
  RARE: 1,
  EPIC: 1,
  LEGENDARY: 1,
};

export const SPECIAL_FEATURES: Record<Rarity, readonly Weighted<NamedDef>[]> = {
  RARE: [
    { id: "freckles", name: "Soft freckles", weight: 3, prompt: "a few tiny freckles" },
    { id: "small-marking", name: "Small star shaped marking", weight: 2, prompt: "a small star shaped marking" },
    { id: "speckles", name: "Soft speckles", weight: 2, prompt: "a few soft speckles" },
    { id: "swirl-marking", name: "Small swirl marking", weight: 1, prompt: "a small swirl marking" },
  ],
  EPIC: [
    { id: "glimmer-patch", name: "Glimmer patch", weight: 3, prompt: "a subtle shimmering patch" },
    { id: "two-tone-belly", name: "Gentle two tone belly", weight: 3, prompt: "a gentle two tone belly in the secondary colour" },
    { id: "soft-shimmer", name: "Subtle shimmer", weight: 2, prompt: "a subtle shimmer across the surface" },
    { id: "freckles", name: "Soft freckles", weight: 2, prompt: "a scattering of tiny freckles" },
    { id: "swirl-marking", name: "Small swirl marking", weight: 1, prompt: "a small swirl marking" },
  ],
  LEGENDARY: [
    { id: "halo-glint", name: "Halo glint", weight: 2, prompt: "a faint soft glint around the silhouette" },
    { id: "luxury-shimmer", name: "Iridescent shimmer", weight: 3, prompt: "a refined iridescent shimmer" },
    { id: "two-tone-belly", name: "Gentle two tone belly", weight: 2, prompt: "a gentle two tone belly in the secondary colour" },
    { id: "sheen-band", name: "Polished sheen band", weight: 2, prompt: "a polished band of reflected light" },
    { id: "soft-shimmer", name: "Subtle shimmer", weight: 2, prompt: "a subtle shimmer across the surface" },
  ],
};

export const NO_SPECIAL_FEATURE_CHANCE: Record<Rarity, number> = {
  RARE: 0.5,
  EPIC: 0.25,
  LEGENDARY: 0.15,
};

export const PERSONALITIES: readonly NamedDef[] = [
  { id: "explorer", name: "explorer", prompt: "Curious little explorer." },
  { id: "chaotic", name: "chaotic", prompt: "Quiet but secretly chaotic." },
  { id: "snacks", name: "snacks", prompt: "Always looking for snacks." },
  { id: "confident", name: "confident", prompt: "Very confident for something this small." },
  { id: "cozy", name: "cozy", prompt: "Calm, cozy and slightly mysterious." },
  { id: "friendly", name: "friendly", prompt: "Has never met a stranger." },
  { id: "gentle", name: "gentle", prompt: "Soft spoken and very gentle." },
  { id: "early", name: "early", prompt: "Awake before anyone else." },
  { id: "collector", name: "collector", prompt: "Collects pebbles nobody asked about." },
  { id: "dreamer", name: "dreamer", prompt: "Daydreams about very large waves." },
  { id: "sunny", name: "sunny", prompt: "Believes every day is a good day." },
  { id: "quiet", name: "quiet", prompt: "Quiet, until snack o'clock." },
  { id: "brave", name: "brave", prompt: "Fearlessly small." },
  { id: "singer", name: "singer", prompt: "Hums constantly, never in tune." },
  { id: "sweet", name: "sweet", prompt: "Sweet to the very last crumb." },
  { id: "restless", name: "restless", prompt: "Restless until the next wave." },
];

/**
 * Names identify the individual, never the species.
 * No numbers, no long names, no corporate names, no "Rock"/"Fish"/"Otter".
 */
export const NAMES: readonly string[] = [
  "Mochi", "Zippy", "Nori", "Miso", "Pip", "Kumo", "Bibi", "Nunu", "Momo", "Toki",
  "Yuzu", "Suki", "Dango", "Pebble", "Ami", "Kiki", "Rumi", "Hana", "Tako", "Coco",
  "Lumi", "Fika", "Sora", "Poki", "Nami", "Boba", "Tama", "Mugi", "Aki", "Chai",
];

/**
 * Splits a pool name into its leading consonant onset and the vowel-led rhyme
 * that follows it ("Mochi" → `m` / `ochi`, "Ami" → `` / `ami`).
 *
 * The deterministic name synthesiser recombines onsets and rhymes harvested
 * *only* from `NAMES`, which is what makes generated names safe by
 * construction: there is no free-form text anywhere in the pipeline, just
 * curated syllables rearranged by a seeded roll.
 */
function splitSyllable(name: string): { onset: string; rhyme: string } {
  const match = /^([^aeiou]*)([aeiou].*)$/i.exec(name.toLowerCase());
  return { onset: match?.[1] ?? "", rhyme: match?.[2] ?? "" };
}

const SPLIT_NAMES = NAMES.map(splitSyllable);

/** Frequency-weighted onsets (a repeated onset means a more common shape). */
export const NAME_ONSETS: readonly string[] = SPLIT_NAMES.map((part) => part.onset);
export const NAME_RHYMES: readonly string[] = SPLIT_NAMES.map((part) => part.rhyme);

export const GOLDEN_OTTER = {
  primaryColor: "gold",
  secondaryColor: "warm-cream",
  material: "Polished solid gold",
  accessory: { id: "top-hat", name: "Top hat", prompt: "a tall black top hat" } as NamedDef,
} as const;

/**
 * Asserts every invariant the rest of the app assumes about this vocabulary,
 * so a broken configuration is a loud boot failure instead of a creature that
 * renders wrong much later:
 *
 *   - "the accessory has art or it does not exist": every selectable id must
 *     be present in `ACCESSORY_PORTRAIT`, and a rarity must never list the
 *     same id twice (which would silently double its weight).
 *   - probabilities stay probabilities, pools stay non-empty, and weights
 *     stay positive — `rng.weighted`/`rng.chance` would otherwise throw at
 *     request time with no hint about which config entry is at fault.
 *   - the name synthesiser's syllable inventory is well formed, so it can
 *     never assemble a name out of malformed parts.
 *
 * Called exactly once, at server start, from `src/services/tredies.ts`. It is
 * never imported (let alone executed) by client code.
 */
export function validateCreatureConfig(): void {
  const problems: string[] = [];

  const requireNonEmpty = (label: string, items: readonly unknown[]) => {
    if (items.length === 0) problems.push(`${label} must not be empty`);
  };
  const requireProbability = (label: string, value: number) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      problems.push(`${label} must be a probability in [0, 1], received ${value}`);
    }
  };
  const requireWeights = <T extends { id: string; weight: number }>(
    label: string,
    items: readonly T[],
  ) => {
    for (const item of items) {
      if (!Number.isFinite(item.weight) || item.weight <= 0) {
        problems.push(`${label} entry "${item.id}" must have a positive finite weight`);
      }
    }
  };

  for (const rarity of RARITY_ORDER) {
    requireNonEmpty(`RARITY_COLORS.${rarity}`, RARITY_COLORS[rarity]);
    requireWeights(`RARITY_COLORS.${rarity}`, RARITY_COLORS[rarity]);
    requireNonEmpty(`MATERIALS.${rarity}`, MATERIALS[rarity]);
    requireWeights(`MATERIALS.${rarity}`, MATERIALS[rarity]);
    requireNonEmpty(`EXPRESSIONS.${rarity}`, EXPRESSIONS[rarity]);
    requireWeights(`EXPRESSIONS.${rarity}`, EXPRESSIONS[rarity]);
    requireNonEmpty(`SPECIAL_FEATURES.${rarity}`, SPECIAL_FEATURES[rarity]);
    requireWeights(`SPECIAL_FEATURES.${rarity}`, SPECIAL_FEATURES[rarity]);
    requireNonEmpty(`ACCESSORIES.${rarity}`, ACCESSORIES[rarity]);
    requireWeights(`ACCESSORIES.${rarity}`, ACCESSORIES[rarity]);

    const seenAccessoryIds = new Set<string>();
    for (const accessory of ACCESSORIES[rarity]) {
      if (!ACCESSORY_PORTRAIT[accessory.id]) {
        problems.push(
          `ACCESSORIES.${rarity} lists "${accessory.id}" but ACCESSORY_PORTRAIT has no art for it`,
        );
      }
      if (seenAccessoryIds.has(accessory.id)) {
        problems.push(`ACCESSORIES.${rarity} lists "${accessory.id}" more than once`);
      }
      seenAccessoryIds.add(accessory.id);
    }

    if (MAX_ACCESSORIES[rarity] !== 1) {
      problems.push(`MAX_ACCESSORIES.${rarity} must be 1 — a Tredie wears at most one accessory`);
    }
    requireProbability(`NO_ACCESSORY_CHANCE.${rarity}`, NO_ACCESSORY_CHANCE[rarity]);
    requireProbability(
      `NO_SPECIAL_FEATURE_CHANCE.${rarity}`,
      NO_SPECIAL_FEATURE_CHANCE[rarity],
    );
  }

  for (const band of RARITY_CONFIG.bands) {
    if (band.options.length === 0) {
      problems.push(`Rarity band "${band.id}" must offer at least one rarity`);
    }
    for (const option of band.options) {
      if (!RARITY_ORDER.includes(option.rarity)) {
        problems.push(`Rarity band "${band.id}" offers unknown rarity "${option.rarity}"`);
      }
      if (!Number.isFinite(option.weight) || option.weight <= 0) {
        problems.push(`Rarity band "${band.id}" entry "${option.rarity}" needs a positive weight`);
      }
    }
    requireProbability(`Rarity band "${band.id}" goldenChance`, band.goldenChance);
  }

  requireNonEmpty("NAMES", NAMES);
  requireNonEmpty("PERSONALITIES", PERSONALITIES);
  const seenNames = new Set<string>();
  for (const name of NAMES) {
    if (!/^[A-Za-z]{1,10}$/.test(name)) {
      problems.push(`NAMES entry "${name}" must be 1-10 letters — no numbers, spaces or symbols`);
    }
    const key = name.toLowerCase();
    if (seenNames.has(key)) problems.push(`NAMES lists "${name}" more than once`);
    seenNames.add(key);
  }

  requireNonEmpty("NAME_ONSETS", NAME_ONSETS);
  requireNonEmpty("NAME_RHYMES", NAME_RHYMES);
  for (const onset of NAME_ONSETS) {
    if (!/^[a-z]*$/.test(onset) || /[aeiou]/.test(onset)) {
      problems.push(`Name onset "${onset}" must contain lowercase consonants only`);
    }
  }
  for (const rhyme of NAME_RHYMES) {
    if (!/^[aeiou][a-z]*$/.test(rhyme)) {
      problems.push(`Name rhyme "${rhyme}" must start with a vowel`);
    }
  }

  if (!COLOR_BY_ID.has(GOLDEN_OTTER.primaryColor)) {
    problems.push(`GOLDEN_OTTER.primaryColor "${GOLDEN_OTTER.primaryColor}" is not in COLORS`);
  }
  if (!COLOR_BY_ID.has(GOLDEN_OTTER.secondaryColor)) {
    problems.push(`GOLDEN_OTTER.secondaryColor "${GOLDEN_OTTER.secondaryColor}" is not in COLORS`);
  }
  if (!ACCESSORY_PORTRAIT[GOLDEN_OTTER.accessory.id]) {
    problems.push(
      `GOLDEN_OTTER accessory "${GOLDEN_OTTER.accessory.id}" has no art in ACCESSORY_PORTRAIT`,
    );
  }

  if (problems.length > 0) {
    throw new Error(`Invalid creature configuration:\n- ${problems.join("\n- ")}`);
  }
}