import { COLORS, EXPRESSIONS, MATERIALS, ACCESSORIES, SPECIAL_FEATURES } from "@/config/vocab";
import { COLOR_BY_ID } from "@/config/vocab";
import type { CreatureAttributeRecord } from "@/types";

/**
 * Deterministic prompt construction.
 *
 * The generation model is never asked to invent anything. It receives the exact
 * attribute list the application already selected, plus one fixed master style
 * block. Attribute order is fixed so the same creature always produces the same
 * prompt.
 */

export const MASTER_VISUAL_STYLE = [
  "ultra clean modern 3D character design",
  "soft rounded geometry",
  "cute but sophisticated",
  "minimal facial features",
  "friendly expressive face",
  "polished high quality materials",
  "subtle studio lighting",
  "soft ambient shadows",
  "premium consumer product aesthetic",
  "simple clean silhouette",
  "beautiful proportions",
  "highly polished but not photorealistic",
  "modern collectible character aesthetic",
  "consistent camera distance and consistent visual scale",
  "designed by a single studio, part of one coherent character universe",
].join(", ");

export const COMPOSITION_RULES = [
  "square 1:1 canvas",
  "exactly one creature, nothing else",
  "full body, nothing cropped",
  "front three-quarter view",
  "creature centred in frame",
  "creature occupies approximately 65 to 75 percent of the canvas",
  "large clean negative space around the creature",
  "simple warm neutral background",
  "very subtle soft ground shadow beneath the creature",
].join(", ");

export const NEGATIVE_PROMPT = [
  "no environment",
  "no scenery",
  "no humans",
  "no hands",
  "no additional creatures",
  "no text",
  "no typography",
  "no logos",
  "no watermark",
  "no user interface",
  "no cryptocurrency symbols",
  "no coins",
  "no charts",
  "no financial graphics",
  "no copyrighted characters",
  "no hybrid species",
  "no fantasy creatures",
  "no wings",
  "no dramatic body distortion",
  "no photorealism",
  "no cluttered background",
  "no harsh shadows",
  "no lens flare",
  "no busy patterns",
].join(", ");

const SPECIES_BRIEF: Record<CreatureAttributeRecord["species"], string> = {
  ROCK:
    "a small cute collectible rock: rounded smooth stone shape, small friendly face, simple compact silhouette, tiny arms and feet, unmistakably a rock",
  FISH:
    "a small cute collectible fish: rounded simplified body, large expressive eyes, small fins, clean recognizable silhouette, unmistakably a fish",
  OTTER:
    "a small cute collectible otter: rounded body, small paws, large expressive eyes, soft simplified facial features, unmistakably a living otter",
};

const RARITY_BRIEF: Record<CreatureAttributeRecord["rarity"], string> = {
  RARE:
    "rare tier: minimal colour count, simple expression, at most one subtle accessory, clean simple silhouette, charming and collectible",
  EPIC:
    "epic tier: more visual personality, distinctive colours, expressive face, one or two accessories, subtle premium visual effects",
  LEGENDARY:
    "legendary tier: premium materials, sophisticated colour combination, exceptional accessories, more expressive personality, subtle visual effects, immediately readable as the highest rarity",
};

const GOLDEN_BRIEF =
  "golden legendary variant: made from polished solid gold, highly polished surface, warm golden reflections, soft studio lighting, elegant premium appearance, subtle reflective highlights, extremely clean silhouette, still clearly a cute living otter, never a trophy, statue, coin, piece of jewelry or cryptocurrency logo";

function findPrompt(list: readonly { name: string; prompt: string }[], name: string | null) {
  if (!name) return null;
  return list.find((entry) => entry.name === name)?.prompt ?? null;
}

function colorPrompt(name: string, hex: string) {
  void COLOR_BY_ID.get(name);
  return `${name} (${hex})`;
}

export interface BuiltPrompt {
  prompt: string;
  negativePrompt: string;
}

export function buildCreaturePrompt(attributes: CreatureAttributeRecord): BuiltPrompt {
  const material = findPrompt(MATERIALS[attributes.rarity], attributes.material);
  const expression = findPrompt(EXPRESSIONS[attributes.rarity], attributes.expression);

  // Accessory may hold "Tiny crown" or "Tiny crown and Simple necklace".
  const accessoryParts = attributes.accessory
    ? attributes.accessory.split(" and ").map((part) => findPrompt(ACCESSORIES[attributes.rarity], part))
    : [];
  const accessoryPrompt = accessoryParts.filter((part): part is string => Boolean(part));

  const specialFeature = findPrompt(SPECIAL_FEATURES[attributes.rarity], attributes.specialFeature);

  const attributeLines = [
    `Creature: ${SPECIES_BRIEF[attributes.species]}`,
    `Tier: ${RARITY_BRIEF[attributes.rarity]}`,
    `Primary colour: ${colorPrompt(attributes.primaryColor, attributes.primaryColorHex)}`,
    `Secondary colour: ${colorPrompt(attributes.secondaryColor, attributes.secondaryColorHex)}`,
    `Material: ${material ?? attributes.material}`,
    `Expression: ${expression ?? attributes.expression}`,
    `Accessory: ${accessoryPrompt.length > 0 ? accessoryPrompt.join(" plus ") : "none"}`,
    `Special feature: ${specialFeature ?? "none"}`,
  ];

  if (attributes.isGolden) {
    attributeLines.push(`Golden variant: ${GOLDEN_BRIEF}`);
  }

  const prompt = [
    "Render this exact collectible creature. Do not invent, replace or add any attribute.",
    "",
    ...attributeLines,
    "",
    `Style: ${MASTER_VISUAL_STYLE}.`,
    `Composition: ${COMPOSITION_RULES}.`,
  ].join("\n");

  return { prompt, negativePrompt: NEGATIVE_PROMPT };
}

export const REFERENCE_PALETTE = COLORS;