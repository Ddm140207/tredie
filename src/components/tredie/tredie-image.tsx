import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TredieRecord } from "@/types";
import {
  CREATURE_ASPECT,
  HEADROOM,
  accessoryPortrait,
  headAnchor,
  placeAccessory,
  portraitArt,
} from "@/config/portraits";

type PortraitTredie = Pick<TredieRecord, "name" | "status" | "species" | "rarity" | "isGolden"> & {
  imageUrl?: string | null;
  attributes?: { accessory?: string | null } | null;
};

const CONTAINER_ASPECT = CREATURE_ASPECT / (1 + HEADROOM);
const CREATURE_TOP_PCT = (HEADROOM / (1 + HEADROOM)) * 100;
const CREATURE_HEIGHT_PCT = (1 / (1 + HEADROOM)) * 100;

/**
 * Draws a Tredie as the composition it actually is: a fixed species asset with
 * an optional accessory seated on its head. There is no image model involved,
 * so the same species + accessory always produces the same portrait.
 */
export function TredieImage({
  tredie,
  className,
  priority = false,
  sizes = "(max-width: 768px) 90vw, 420px",
}: {
  tredie: PortraitTredie;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const alt = `${tredie.name}, a ${tredie.rarity.toLowerCase()} ${tredie.species.toLowerCase()} Tredie`;

  if (tredie.status !== "ready") {
    return (
      <div
        role="img"
        aria-label={tredie.status === "failed" ? `${alt} — image unavailable` : `${alt} — taking shape`}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-3 bg-paper-deep",
          className,
        )}
      >
        <div className="relative">
          <div className="size-16 animate-pulse rounded-full bg-surface/80" />
          <div className="absolute inset-0 rounded-full border border-line-strong" />
        </div>
        <p className="px-6 text-center text-xs text-ink-faint">
          {tredie.status === "failed" ? "Still taking a little longer" : "Taking shape…"}
        </p>
      </div>
    );
  }

  const accessory = accessoryPortrait(tredie.attributes?.accessory);
  const placement = accessory ? placeAccessory(accessory, headAnchor(tredie.species)) : null;

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative w-full", className)}
      style={{ aspectRatio: CONTAINER_ASPECT, maxHeight: "100%" }}
    >
      <div
        className="absolute"
        style={{
          left: 0,
          top: `${CREATURE_TOP_PCT}%`,
          width: "100%",
          height: `${CREATURE_HEIGHT_PCT}%`,
        }}
      >
        <Image
          src={portraitArt(tredie.species, tredie.isGolden)}
          alt=""
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain"
        />
      </div>

      {accessory && placement ? (
        <div
          className="absolute"
          style={{
            left: `${placement.leftPct}%`,
            top: `${placement.topPct}%`,
            width: `${placement.widthPct}%`,
            height: `${placement.heightPct}%`,
          }}
        >
          <Image src={accessory.art} alt="" fill sizes={sizes} className="object-contain" />
        </div>
      ) : null}
    </div>
  );
}