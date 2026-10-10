import type { CreatureAttributeRecord } from "@/types";

/**
 * Deterministic vector renderer.
 *
 * This is the fallback image provider. It renders the same attributes the image
 * model would have been handed, as a flat vector study, so the product can be
 * run end to end without an image generation API key. Tredies created with it
 * are always labelled as a preview render, never as an AI generation.
 */

const CANVAS = 1024;
const BOX = 640;
const OFFSET = (CANVAS - BOX) / 2;

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function shade(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean;
  const num = Number.parseInt(value, 16);
  const r = clampByte(((num >> 16) & 0xff) * (1 + amount));
  const g = clampByte(((num >> 8) & 0xff) * (1 + amount));
  const b = clampByte((num & 0xff) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function materialStops(a: CreatureAttributeRecord) {
  const base = a.primaryColorHex;
  if (a.isGolden) return { base, light: "#F7DFA4", darker: "#A8761F", mid: "#E8C063" };
  if (a.rarity === "LEGENDARY") return { base, light: shade(base, 0.38), darker: shade(base, -0.3), mid: shade(base, 0.14) };
  if (a.rarity === "EPIC") return { base, light: shade(base, 0.22), darker: shade(base, -0.18), mid: shade(base, 0.08) };
  return { base, light: shade(base, 0.16), darker: shade(base, -0.14), mid: shade(base, 0.06) };
}

interface Face {
  eyes: string;
  mouth: string;
  blush: boolean;
  tilt: number;
}

function faceFor(expression: string): Face {
  const eye = (cx: number, cy: number, rx = 20, ry = 24, id: string) =>
    `<g id="${id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2F2A26"/><circle cx="${cx + rx * 0.32}" cy="${cy - ry * 0.38}" r="${ry * 0.26}" fill="#FFFFFF" opacity="0.9"/></g>`;

  const lidEye = (cx: number, cy: number, id: string) =>
    `<path id="${id}" d="M ${cx - 20} ${cy} q 20 -14 40 0" stroke="#2F2A26" stroke-width="7" stroke-linecap="round" fill="none"/>`;

  const closedEye = (cx: number, cy: number, id: string) =>
    `<path id="${id}" d="M ${cx - 19} ${cy} q 19 15 38 0" stroke="#2F2A26" stroke-width="7" stroke-linecap="round" fill="none"/>`;

  const smile = (cx: number, cy: number, w = 20) =>
    `<path d="M ${cx - w} ${cy} q ${w} ${w * 0.85} ${w * 2} 0" stroke="#2F2A26" stroke-width="7" stroke-linecap="round" fill="none"/>`;

  const openSmile = (cx: number, cy: number, w = 22) =>
    `<path d="M ${cx - w} ${cy} q ${w} 6 ${w} 0 q 0 ${w * 1.5} ${-w} ${w * 1.5} q ${-w} 0 ${-w} ${-w * 1.5} q 0 -6 ${w} 0 z" fill="#4A332F"/>`;

  switch (expression) {
    case "Sleepy":
      return { eyes: closedEye(268, 356, "eye-l") + closedEye(372, 356, "eye-r"), mouth: smile(320, 396, 13), blush: true, tilt: -3 };
    case "Serene":
      return { eyes: closedEye(268, 352, "eye-l") + closedEye(372, 352, "eye-r"), mouth: smile(320, 392, 14), blush: true, tilt: 0 };
    case "Wise":
      return { eyes: lidEye(268, 352, "eye-l") + lidEye(372, 352, "eye-r"), mouth: smile(320, 396, 17), blush: false, tilt: 0 };
    case "Shy":
      return { eyes: eye(272, 358, 17, 20, "eye-l") + eye(376, 358, 17, 20, "eye-r"), mouth: smile(324, 400, 12), blush: true, tilt: 4 };
    case "Grumpy":
      return {
        eyes: eye(268, 360, 18, 19, "eye-l") + eye(372, 360, 18, 19, "eye-r"),
        mouth: `<path d="M 300 404 q 20 -12 40 0" stroke="#2F2A26" stroke-width="7" stroke-linecap="round" fill="none"/>` +
          `<path d="M 246 330 l 40 -8" stroke="#2F2A26" stroke-width="8" stroke-linecap="round"/>` +
          `<path d="M 394 322 l -40 -8" stroke="#2F2A26" stroke-width="8" stroke-linecap="round"/>`,
        blush: false,
        tilt: 0,
      };
    case "Playful":
      return {
        eyes: eye(266, 356, 19, 23, "eye-l") + closedEye(374, 352, "eye-r"),
        mouth: openSmile(320, 392, 22),
        blush: true,
        tilt: -5,
      };
    case "Excited":
      return { eyes: eye(266, 352, 23, 27, "eye-l") + eye(374, 352, 23, 27, "eye-r"), mouth: openSmile(320, 394, 24), blush: true, tilt: 0 };
    case "Cheerful":
      return { eyes: eye(266, 354, 20, 24, "eye-l") + eye(374, 354, 20, 24, "eye-r"), mouth: openSmile(320, 390, 26), blush: true, tilt: 3 };
    case "Confident":
      return { eyes: lidEye(266, 356, "eye-l") + lidEye(374, 356, "eye-r"), mouth: smile(320, 396, 18), blush: false, tilt: 0 };
    case "Dazzled":
      return {
        eyes:
          `<path d="M 266 334 l 7 17 l 17 7 l -17 7 l -7 17 l -7 -17 l -17 -7 l 17 -7 z" fill="#C39A3E"/>` +
          `<path d="M 374 334 l 7 17 l 17 7 l -17 7 l -7 17 l -7 -17 l -17 -7 l 17 -7 z" fill="#C39A3E"/>`,
        mouth: openSmile(320, 392, 24),
        blush: true,
        tilt: 0,
      };
    case "Gracious":
      return { eyes: eye(268, 356, 19, 22, "eye-l") + eye(372, 356, 19, 22, "eye-r"), mouth: smile(320, 396, 19), blush: false, tilt: 0 };
    case "Curious":
      return { eyes: eye(266, 352, 22, 26, "eye-l") + eye(374, 352, 22, 26, "eye-r"), mouth: `<ellipse cx="320" cy="398" rx="11" ry="9" fill="#4A332F"/>`, blush: true, tilt: -6 };
    case "Calm":
      return { eyes: eye(268, 356, 20, 24, "eye-l") + eye(372, 356, 20, 24, "eye-r"), mouth: smile(320, 398, 15), blush: false, tilt: 0 };
    default:
      return { eyes: eye(268, 356, 20, 24, "eye-l") + eye(372, 356, 20, 24, "eye-r"), mouth: smile(320, 398, 16), blush: false, tilt: 0 };
  }
}

function bodyShape(a: CreatureAttributeRecord, fill: string) {
  if (a.species === "ROCK") {
    return `
      <g fill="${fill}">
        <ellipse cx="320" cy="330" rx="228" ry="196"/>
        <ellipse cx="232" cy="196" rx="96" ry="70"/>
        <ellipse cx="392" cy="176" rx="104" ry="76"/>
        <ellipse cx="452" cy="286" rx="92" ry="76"/>
        <ellipse cx="196" cy="330" rx="82" ry="86"/>
        <ellipse cx="320" cy="512" rx="150" ry="44" opacity="0.35"/>
        <ellipse cx="150" cy="400" rx="58" ry="70"/>
        <ellipse cx="490" cy="400" rx="58" ry="70"/>
        <ellipse cx="238" cy="512" rx="62" ry="38"/>
        <ellipse cx="402" cy="512" rx="62" ry="38"/>
      </g>`;
  }

  if (a.species === "FISH") {
    return `
      <g fill="${fill}">
        <ellipse cx="300" cy="330" rx="196" ry="156"/>
        <path d="M 470 330 q 92 -74 128 0 q -36 74 -128 0 z"/>
        <path d="M 250 190 q 54 -78 128 -46 q -46 26 -70 66 z"/>
        <path d="M 214 372 q -86 34 -78 92 q 58 6 96 -46 z"/>
        <ellipse cx="196" cy="418" rx="52" ry="34" transform="rotate(-18 196 418)"/>
      </g>`;
  }

  return `
    <g fill="${fill}">
      <ellipse cx="320" cy="400" rx="168" ry="196"/>
      <ellipse cx="320" cy="268" rx="152" ry="132"/>
      <ellipse cx="212" cy="176" rx="44" ry="44"/>
      <ellipse cx="428" cy="176" rx="44" ry="44"/>
      <ellipse cx="320" cy="404" rx="112" ry="140" opacity="0.35"/>
      <ellipse cx="164" cy="376" rx="52" ry="72" transform="rotate(14 164 376)"/>
      <ellipse cx="476" cy="376" rx="52" ry="72" transform="rotate(-14 476 376)"/>
      <ellipse cx="252" cy="568" rx="62" ry="44"/>
      <ellipse cx="388" cy="568" rx="62" ry="44"/>
    </g>`;
}

function faceAnchor(a: CreatureAttributeRecord) {
  if (a.species === "FISH") return { x: 224, y: -6 };
  if (a.species === "OTTER") return { x: 0, y: -22 };
  return { x: 0, y: 0 };
}

function accessorySvg(accessory: string | null, a: CreatureAttributeRecord) {
  if (!accessory) return "";
  const y = a.species === "OTTER" ? 150 : a.species === "FISH" ? 156 : 158;
  const tint = shade(a.primaryColorHex, a.isGolden ? 0.5 : -0.15);
  const metal = a.isGolden ? "#F2D98A" : "#C8CCD1";

  const shapes: Record<string, string> = {
    "tiny-scarf": `<g><rect x="222" y="${y + 34}" width="196" height="40" rx="20" fill="${shade(a.secondaryColorHex, -0.05)}"/><path d="M 392 ${y + 52} q 44 22 22 66 l -34 -12 q 16 -32 -6 -46 z" fill="${shade(a.secondaryColorHex, -0.12)}"/></g>`,
    "tiny-hat": `<g><rect x="262" y="${y - 34}" width="116" height="46" rx="16" fill="${tint}"/><ellipse cx="320" cy="${y + 12}" rx="96" ry="18" fill="${shade(tint, -0.14)}"/></g>`,
    "small-bow": `<g transform="translate(320 ${y + 4})"><path d="M 0 0 l -46 -22 v 44 z" fill="${shade(a.secondaryColorHex, -0.08)}"/><path d="M 0 0 l 46 -22 v 44 z" fill="${shade(a.secondaryColorHex, -0.08)}"/><circle cx="0" cy="0" r="13" fill="${shade(a.secondaryColorHex, -0.2)}"/></g>`,
    "small-flower": `<g transform="translate(398 ${y - 6})">${[0, 72, 144, 216, 288].map((deg) => `<ellipse cx="0" cy="-20" rx="13" ry="18" fill="#F4BFC8" transform="rotate(${deg})"/>`).join("")}<circle cx="0" cy="0" r="11" fill="#F3E7D3"/></g>`,
    "round-glasses": `<g fill="none" stroke="${metal}" stroke-width="7"><circle cx="266" cy="356" r="38"/><circle cx="374" cy="356" r="38"/><path d="M 304 356 h 32"/><path d="M 228 350 l -40 -10"/><path d="M 412 350 l 40 -10"/></g>`,
    headphones: `<g><path d="M 218 350 a 102 102 0 0 1 204 0" fill="none" stroke="${metal}" stroke-width="18" stroke-linecap="round"/><rect x="188" y="342" width="42" height="76" rx="20" fill="${tint}"/><rect x="410" y="342" width="42" height="76" rx="20" fill="${tint}"/></g>`,
    "tiny-crown": `<g><path d="M 244 ${y + 16} l 12 -66 l 42 32 l 22 -46 l 22 46 l 42 -32 l 12 66 z" fill="#E6C458"/><path d="M 244 ${y + 16} h 152 l 6 20 h -164 z" fill="#C9A63C"/><circle cx="256" cy="${y - 50}" r="8" fill="#F3E7D3"/><circle cx="320" cy="${y - 64}" r="8" fill="#F3E7D3"/><circle cx="384" cy="${y - 50}" r="8" fill="#F3E7D3"/></g>`,
    "simple-necklace": `<g><path d="M 236 432 q 84 66 168 0" fill="none" stroke="${metal}" stroke-width="7"/><circle cx="320" cy="452" r="16" fill="${a.isGolden ? "#F2D98A" : shade(a.secondaryColorHex, 0.1)}"/></g>`,
    "mini-satchel": `<g><rect x="392" y="452" width="112" height="88" rx="22" fill="${shade(a.secondaryColorHex, -0.14)}"/><path d="M 400 470 q 48 -44 96 0" fill="none" stroke="${shade(a.secondaryColorHex, -0.3)}" stroke-width="8"/></g>`,
    "small-backpack": `<g><rect x="228" y="392" width="184" height="150" rx="42" fill="${shade(a.secondaryColorHex, -0.16)}" opacity="0.9"/><rect x="272" y="446" width="96" height="60" rx="18" fill="${shade(a.secondaryColorHex, -0.28)}"/></g>`,
  };

  return shapes[accessory] ?? "";
}

function featureSvg(feature: string | null, a: CreatureAttributeRecord) {
  if (!feature) return "";
  const blushColor = shade(a.secondaryColorHex, 0.18);

  const shapes: Record<string, string> = {
    freckles: `<g fill="${shade(a.secondaryColorHex, -0.1)}" opacity="0.75"><circle cx="228" cy="392" r="7"/><circle cx="248" cy="404" r="6"/><circle cx="414" cy="392" r="7"/><circle cx="394" cy="404" r="6"/></g>`,
    "small-marking": `<g transform="translate(320 250)"><path d="M 0 -22 l 7 16 l 17 7 l -17 7 l -7 16 l -7 -16 l -17 -7 l 17 -7 z" fill="${blushColor}" opacity="0.9"/></g>`,
    "soft-speckles": `<g fill="${blushColor}" opacity="0.55"><circle cx="252" cy="272" r="8"/><circle cx="392" cy="262" r="6"/><circle cx="210" cy="330" r="6"/><circle cx="428" cy="336" r="7"/><circle cx="320" cy="222" r="5"/></g>`,
    "swirl-marking": `<g transform="translate(320 246)" fill="none" stroke="${blushColor}" stroke-width="9" stroke-linecap="round"><path d="M 0 0 m -6 0 a 6 6 0 1 1 12 0 a 12 12 0 1 1 -24 0 a 20 20 0 1 1 40 0"/></g>`,
    "gentle-two-tone-belly": `<g><ellipse cx="320" cy="${a.species === "ROCK" ? 400 : 430}" rx="96" ry="104" fill="${a.secondaryColorHex}" opacity="0.85"/></g>`,
    "glimmer-patch": `<g><ellipse cx="320" cy="300" rx="150" ry="120" fill="url(#shimmer)"/></g>`,
    "subtle-shimmer": `<g><ellipse cx="320" cy="320" rx="200" ry="180" fill="url(#shimmer)" opacity="0.7"/></g>`,
    "iridescent-shimmer": `<g><ellipse cx="320" cy="310" rx="212" ry="190" fill="url(#shimmer)"/></g>`,
    "polished-sheen-band": `<g><ellipse cx="320" cy="272" rx="120" ry="42" fill="#FFFFFF" opacity="0.42" transform="rotate(-18 320 272)"/></g>`,
    "halo-glint": `<g><path d="M 320 24 l 10 34 l 34 10 l -34 10 l -10 34 l -10 -34 l -34 -10 l 34 -10 z" fill="#F2D98A" opacity="0.9"/></g>`,
    "subtle-soft-glow": `<g><ellipse cx="320" cy="330" rx="250" ry="240" fill="url(#glow)" opacity="0.75"/></g>`,
  };

  return shapes[feature] ?? "";
}

export function renderCreatureSvg(a: CreatureAttributeRecord): string {
  const stops = materialStops(a);
  const face = faceFor(a.expression);
  const anchor = faceAnchor(a);
  const legendGlow =
    a.rarity === "LEGENDARY"
      ? `<ellipse cx="512" cy="500" rx="330" ry="330" fill="url(#glow)" opacity="${a.isGolden ? 0.95 : 0.5}"/>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}" role="img" aria-label="${a.name}, a ${a.rarity.toLowerCase()} ${a.species.toLowerCase()}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF4E8"/>
      <stop offset="1" stop-color="#F1E5D4"/>
    </linearGradient>
    <radialGradient id="body" cx="0.34" cy="0.26" r="0.82">
      <stop offset="0" stop-color="${stops.light}"/>
      <stop offset="0.45" stop-color="${stops.mid}"/>
      <stop offset="1" stop-color="${stops.darker}"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"/>
      <stop offset="0.5" stop-color="#E7D6F5" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#FFF0C9" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${a.isGolden ? "#F6D89A" : "#D8C79A"}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#F6D89A" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <clipPath id="bodyClip"><rect x="0" y="0" width="${BOX}" height="${BOX}"/></clipPath>
  </defs>

  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#bg)"/>
  ${legendGlow}
  <ellipse cx="512" cy="856" rx="212" ry="34" fill="#6B5B47" opacity="0.16" filter="url(#soft)"/>

  <g transform="translate(${OFFSET} ${OFFSET})">
    ${bodyShape(a, "url(#body)")}
    <g clip-path="url(#bodyClip)">
      <ellipse cx="320" cy="300" rx="240" ry="200" fill="url(#sheen)" opacity="${a.rarity === "RARE" ? 0.5 : 0.72}"/>
      ${featureSvg(a.specialFeature, a)}
    </g>
    <g transform="translate(${anchor.x} ${anchor.y}) rotate(${face.tilt} 320 330)">
      ${face.eyes}
      ${face.mouth}
      ${face.blush ? `<g fill="${shade(a.secondaryColorHex, 0.1)}" opacity="0.5"><ellipse cx="222" cy="384" rx="26" ry="15"/><ellipse cx="418" cy="384" rx="26" ry="15"/></g>` : ""}
    </g>
    ${accessorySvg(a.accessory, a)}
  </g>
</svg>`;

  return svg.replace(/\n\s*/g, " ");
}