import Link from "next/link";
import { RarityBadge } from "@/components/ui/badge";
import { TredieImage } from "@/components/tredie/tredie-image";
import { formatDate, formatUsd } from "@/lib/utils";
import type { TredieRecord } from "@/types";

export function TredieCard({ tredie }: { tredie: TredieRecord }) {
  return (
    <Link
      href={`/tredies/${tredie.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[--radius-card] border border-line bg-surface shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:border-line-strong hover:shadow-lift focus-visible:-translate-y-1 active:translate-y-0 active:scale-[0.99]"
    >
      <div className="relative aspect-square overflow-hidden bg-paper-deep">
        <TredieImage
          tredie={tredie}
          priority={false}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3">
          <RarityBadge rarity={tredie.rarity} isGolden={tredie.isGolden} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">{tredie.name}</h3>
          <span className="text-sm font-medium text-ink-soft tabular-nums">
            {formatUsd(tredie.amount)}
          </span>
        </div>

        {tredie.note ? (
          <p className="line-clamp-2 text-sm text-ink-faint">{tredie.note}</p>
        ) : tredie.recipient ? (
          <p className="text-sm text-ink-faint">To {tredie.recipient}</p>
        ) : null}

        <time
          dateTime={tredie.createdAt}
          className="mt-auto pt-1 text-xs text-ink-faint"
        >
          {formatDate(tredie.createdAt)}
        </time>
      </div>
    </Link>
  );
}
