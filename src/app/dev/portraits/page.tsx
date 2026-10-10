import { notFound } from "next/navigation";
import { TredieImage } from "@/components/tredie/tredie-image";
import { RARITY_META } from "@/config/rarity";
import {
  ACCESSORY_IDS,
  ACCESSORY_PORTRAIT,
  SPECIES_PORTRAIT,
  headAnchor,
  placeAccessory,
} from "@/config/portraits";
import type { Rarity, Species } from "@/types";

/**
 * Layout QA sheet for the layered portrait.
 *
 * The portrait is composed from fixed assets and measured anchors, so the only
 * way to confirm it reads correctly is to look at every species x accessory
 * combination at once. Dev only.
 */

const SPECIES: Species[] = ["ROCK", "FISH", "OTTER"];
const RARITY_FOR: Record<Species, Rarity> = {
  ROCK: "RARE",
  FISH: "EPIC",
  OTTER: "LEGENDARY",
};

function Portrait({
  species,
  accessory,
  isGolden = false,
}: {
  species: Species;
  accessory: string | null;
  isGolden?: boolean;
}) {
  const placement = accessory
    ? placeAccessory(ACCESSORY_PORTRAIT[accessory]!, headAnchor(species))
    : null;

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-line bg-paper-deep p-2">
        <TredieImage
          sizes="220px"
          tredie={{
            name: "Preview",
            status: "ready",
            species,
            rarity: RARITY_FOR[species],
            isGolden,
            attributes: { accessory },
          }}
        />
      </div>
      <p className="mt-1 text-[10px] leading-tight text-ink-faint">
        {isGolden ? "GOLDEN" : species}
        {accessory ? ` + ${accessory}` : " (bare)"}
      </p>
      {placement ? (
        <p className="text-[10px] leading-tight text-ink-faint">
          L{placement.leftPct.toFixed(1)} T{placement.topPct.toFixed(1)} W
          {placement.widthPct.toFixed(1)} H{placement.heightPct.toFixed(1)}
        </p>
      ) : null}
    </div>
  );
}

export default function PortraitPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink">Portrait layout sheet</h1>
      <p className="mt-2 text-sm text-ink-faint">
        Dev only. Every species with every accessory, plus the golden otter. Tune{" "}
        <code>fit</code>, <code>HEADROOM</code> and the head anchors in{" "}
        <code>src/config/portraits.ts</code> until each hat sits right.
      </p>

      {SPECIES.map((species) => (
        <section key={species} className="mt-10">
<h2 className="mb-3 text-sm font-medium text-ink-faint">
            {species}, {RARITY_META[RARITY_FOR[species]].label}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            <Portrait species={species} accessory={null} />
            {ACCESSORY_IDS.map((id) => (
              <Portrait key={id} species={species} accessory={id} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-legendary">
          Golden otter, the 0.10% outcome
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <Portrait species="OTTER" accessory={null} isGolden />
          {ACCESSORY_IDS.map((id) => (
            <Portrait key={id} species="OTTER" accessory={id} isGolden />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-ink-faint">
          Reference
        </h2>
        <ul className="text-xs text-ink-faint">
          {SPECIES.map((species) => {
            const head = headAnchor(species);
            return (
              <li key={species}>
                {species}: art {SPECIES_PORTRAIT[species].art} · head centreX{" "}
                {(head.centreX * 100).toFixed(1)}% top {(head.top * 100).toFixed(1)}% width{" "}
                {(head.width * 100).toFixed(1)}%
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}