import type { Species } from "@/types";

/**
 * Portrait composition.
 *
 * There is no image model. A Tredie is a fixed species asset with an optional
 * accessory drawn over its head, so every number here is a layout anchor rather
 * than a prompt.
 *
 * All coordinates are fractions of the *creature canvas* (0..1, y down) and were
 * measured from the alpha channel of the canonical art in `Assets/`, not guessed.
 * The creature canvas is 768x666 (aspect 1.153); the accessory art was authored
 * on the same 1.153 canvas, so the two share a coordinate frame.
 */

export const CREATURE_CANVAS = { width: 768, height: 666 } as const;
export const CREATURE_ASPECT = CREATURE_CANVAS.width / CREATURE_CANVAS.height;

/**
 * Extra room above the creature, as a fraction of the creature canvas height.
 * Hats are tall; without headroom they would be clipped at the top edge.
 */
export const HEADROOM = 0.42;

export interface HeadAnchor {
  /** Horizontal centre of the head, 0..1 across the creature canvas. */
  centreX: number;
  /** Top of the head, 0..1 down the creature canvas. */
  top: number;
  /** Head width, 0..1 across the creature canvas. */
  width: number;
  /** Head height, 0..1 down the creature canvas. Used to seat the accessory. */
  height: number;
}

export interface SpeciesPortrait {
  id: Species;
  art: string;
  head: HeadAnchor;
}

export const SPECIES_PORTRAIT: Record<Species, SpeciesPortrait> = {
  ROCK: {
    id: "ROCK",
    art: "/tredie/rock.webp",
    head: { centreX: 0.4988, top: 0.2067, width: 0.426, height: 0.22 },
  },
  FISH: {
    id: "FISH",
    art: "/tredie/fish.webp",
    // The fish faces up-right; the eye sits at ~(0.52, 0.46). The anchor used to
    // be pulled left by an outdated reading, which made hats float off the head.
    // It is now tuned so the accessory opening rests in the empty space just
    // above the eye.
    head: { centreX: 0.52, top: 0.385, width: 0.4, height: 0.26 },
  },
  OTTER: {
    id: "OTTER",
    art: "/tredie/otter.webp",
    head: { centreX: 0.5126, top: 0.1664, width: 0.3646, height: 0.21 },
  },
};

/** The golden otter is a pixel-aligned recolour of the otter, so it reuses its anchor. */
export const GOLDEN_ART = "/tredie/golden-otter.webp";

export function portraitArt(species: Species, isGolden: boolean): string {
  if (isGolden && species === "OTTER") return GOLDEN_ART;
  return SPECIES_PORTRAIT[species].art;
}

export function headAnchor(species: Species): HeadAnchor {
  return SPECIES_PORTRAIT[species].head;
}

export interface AccessoryPortrait {
  id: string;
  name: string;
  art: string;
  /** Tight bounding box of the accessory art, as fractions of the 1.153 canvas. */
  box: { left: number; top: number; width: number; height: number };
  /** Where the creature's head passes into the accessory, as fractions of the canvas. */
  opening: { centreX: number; y: number };
  /** Multiplier on the head width that sizes the accessory. */
  fit: number;
}

/**
 * Only the accessories that actually have art are listed. Adding more is a
 * matter of dropping a 1.153-ratio PNG/WebP into `public/tredie/accessories`
 * and adding an entry here.
 */
export const ACCESSORY_PORTRAIT: Record<string, AccessoryPortrait> = {
  "top-hat": {
    id: "top-hat",
    name: "Top hat",
    art: "/tredie/accessories/top-hat.webp",
    box: { left: 0.2266, top: 0.2309, width: 0.5508, height: 0.4955 },
    opening: { centreX: 0.5015, y: 0.7252 },
    fit: 1.5,
  },
  "grad-hat": {
    id: "grad-hat",
    name: "Grad hat",
    art: "/tredie/accessories/grad-hat.webp",
    box: { left: 0.1455, top: 0.286, width: 0.71, height: 0.5518 },
    // The tassel hangs below the brim and would be caught by a naive bottom-band
    // measurement, so the opening is pinned to the brim instead.
    opening: { centreX: 0.5, y: 0.63 },
    fit: 1.6,
  },
  "noob-hat": {
    id: "noob-hat",
    name: "Noob hat",
    art: "/tredie/accessories/noob-hat.webp",
    box: { left: 0.2412, top: 0.1644, width: 0.5234, height: 0.6599 },
    opening: { centreX: 0.5024, y: 0.8232 },
    fit: 1.35,
  },
  "french-hat": {
    id: "french-hat",
    name: "French hat",
    art: "/tredie/accessories/french-hat.webp",
    box: { left: 0.2051, top: 0.2759, width: 0.6016, height: 0.4347 },
    opening: { centreX: 0.5703, y: 0.7095 },
    fit: 1.55,
  },
};

export const ACCESSORY_IDS = Object.keys(ACCESSORY_PORTRAIT);

export function accessoryPortrait(id: string | null | undefined): AccessoryPortrait | null {
  if (!id) return null;
  return ACCESSORY_PORTRAIT[id] ?? null;
}

export interface AccessoryPlacement {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

/**
 * Where to draw the accessory, as percentages of the portrait container.
 *
 * The container is the creature canvas plus `HEADROOM` above it, so the
 * creature's own coordinates are offset and scaled before use.
 */
export function placeAccessory(
  accessory: AccessoryPortrait,
  head: HeadAnchor,
): AccessoryPlacement {
  const creatureTopPct = (HEADROOM / (1 + HEADROOM)) * 100;
  const creatureHeightPct = (1 / (1 + HEADROOM)) * 100;

  const toContainerY = (y: number) => creatureTopPct + y * creatureHeightPct;

  const widthPct = head.width * accessory.fit * 100;
  const heightPct = widthPct * (accessory.box.height / accessory.box.width);

  // Where the accessory's opening sits inside its own tight bounding box.
  const openingXInArt = (accessory.opening.centreX - accessory.box.left) / accessory.box.width;
  const openingYInArt = (accessory.opening.y - accessory.box.top) / accessory.box.height;

  // Seat the opening slightly over the top of the head so it reads as worn.
  const seatY = toContainerY(head.top) + head.height * creatureHeightPct * 0.12;

  const leftPct = head.centreX * 100 - openingXInArt * widthPct;
  const topPct = seatY - openingYInArt * heightPct;

  return { leftPct, topPct, widthPct, heightPct };
}