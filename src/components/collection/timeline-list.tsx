import Link from "next/link";
import { TredieImage } from "@/components/tredie/tredie-image";
import { RarityBadge } from "@/components/ui/badge";
import { formatMonth, formatUsd } from "@/lib/utils";
import type { TredieRecord } from "@/types";

export function TimelineList({ tredies }: { tredies: TredieRecord[] }) {
  const months = new Map<string, TredieRecord[]>();
  for (const tredie of tredies) {
    const key = formatMonth(tredie.createdAt);
    const bucket = months.get(key);
    if (bucket) bucket.push(tredie);
    else months.set(key, [tredie]);
  }

  if (months.size === 0) return null;

  return (
    <div className="mt-10 flex flex-col gap-10">
      {[...months.entries()].map(([month, entries]) => (
        <section key={month}>
          <h2 className="font-display text-base font-semibold text-ink">{month}</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {entries.map((tredie) => (
              <li key={tredie.id}>
                <Link
                  href={`/tredies/${tredie.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-2xl bg-paper-deep">
                    <TredieImage tredie={tredie} sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-ink">{tredie.name}</span>
                      <RarityBadge rarity={tredie.rarity} isGolden={tredie.isGolden} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-faint">
                      {tredie.recipient ? `To ${tredie.recipient}` : tredie.note ?? "On-chain payment"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-ink-soft tabular-nums">
                      {formatUsd(tredie.amount)}
                    </p>
                    <time
                      dateTime={tredie.createdAt}
                      className="text-xs text-ink-faint"
                    >
                      {new Date(tredie.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
