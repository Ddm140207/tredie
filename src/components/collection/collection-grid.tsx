"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { TredieCard } from "@/components/collection/tredie-card";
import { cn } from "@/lib/utils";
import type { Rarity, TredieRecord } from "@/types";

const FILTERS: { id: Rarity | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "RARE", label: "Rare" },
  { id: "EPIC", label: "Epic" },
  { id: "LEGENDARY", label: "Legendary" },
];

export function CollectionGrid({ tredies }: { tredies: TredieRecord[] }) {
  const [filter, setFilter] = useState<Rarity | "ALL">("ALL");

  const visible = useMemo(
    () => tredies.filter((tredie) => filter === "ALL" || tredie.rarity === filter),
    [tredies, filter],
  );

  const activeLabel = FILTERS.find((option) => option.id === filter)?.label ?? "this";

  return (
    <>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter by rarity">
        {FILTERS.map((option) => {
          const count =
            option.id === "ALL"
              ? tredies.length
              : tredies.filter((tredie) => tredie.rarity === option.id).length;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={cn(
                "min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                filter === option.id
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
              )}
            >
              {option.label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 rounded-[--radius-card] border border-line bg-surface px-6 py-14 text-center shadow-soft">
          <span className="grid size-12 place-items-center rounded-full bg-legendary-soft text-legendary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="font-display text-lg font-semibold text-ink">
            {filter === "ALL" ? "Nothing here yet" : `No ${activeLabel} friends yet`}
          </p>
          <p className="max-w-sm text-sm text-ink-soft">
            The amount you send decides which rarities can show up — try another one, or make
            something new.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tredie, index) => (
            <li
              key={tredie.id}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <TredieCard tredie={tredie} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
