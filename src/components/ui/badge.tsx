import { RARITY_META } from "@/config/rarity";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types";

/** Soft surface for the badge, plus an ink colour that passes AA on it. */
const raritySurface: Record<Rarity, string> = {
  RARE: "bg-rare-soft text-rare-ink",
  EPIC: "bg-epic-soft text-epic-ink",
  LEGENDARY: "bg-legendary-soft text-legendary-ink",
};

/** The accent dot keeps the vivid rarity colour — it is decoration, not text. */
const rarityDot: Record<Rarity, string> = {
  RARE: "bg-rare",
  EPIC: "bg-epic",
  LEGENDARY: "bg-legendary",
};

export function RarityBadge({
  rarity,
  isGolden = false,
  className,
}: {
  rarity: Rarity;
  isGolden?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        raritySurface[rarity],
        isGolden && "ring-1 ring-legendary/50",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", rarityDot[rarity])} aria-hidden />
      {isGolden ? "Golden" : RARITY_META[rarity].label}
    </span>
  );
}

export function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} aria-hidden />;
}
