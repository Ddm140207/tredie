"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/badge";
import { TredieImage } from "@/components/tredie/tredie-image";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn, formatUsd, truncateAddress } from "@/lib/utils";
import type { LeaderboardEntry, Rarity, Species } from "@/types";

const PODIUM_ORDER = [1, 0, 2];

/**
 * The hall of fame: a pure rarity score (golden beats everything, then otter,
 * fish, rock) ranked up to 50. Names are the owner's chosen leaderboard name
 * or a derived "Otter #XXXX" — addresses are truncated, notes never shown.
 */
export function Leaderboard() {
  const { address, account } = useWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          entries?: LeaderboardEntry[];
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !payload.entries) throw new Error(payload.error ?? "Board is shy.");
        setEntries(payload.entries);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Board is shy.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <BoardNote>{error}</BoardNote>;
  }

  if (!entries) {
    return <BoardSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <BoardNote>
        No wallets have Tredies yet. Send one and this board gets its first name.
      </BoardNote>
    );
  }

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-16">
      <header className="text-center">
        <p className="kicker">Hall of fame</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Rarest friends in the tide pool
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Ranked by rarity, not by money. A golden otter is worth more than any
          pile of rocks.
        </p>
      </header>

      <div className="mx-auto mt-12 grid max-w-2xl items-end gap-4 sm:grid-cols-3">
        {PODIUM_ORDER.map((index) => {
          const entry = podium[index];
          if (!entry) return null;
          const isYou = address === entry.walletAddress;
          return (
            <div
              key={entry.walletAddress}
              className={cn(
                "overflow-hidden rounded-[--radius-card] border border-line bg-surface shadow-soft",
                index === 0 && "sm:order-2",
                index === 1 && "sm:order-1",
                index === 2 && "sm:order-3",
              )}
            >
              <div className={cn("relative", index === 0 ? "h-44" : "h-36")}>
                <TredieImage
                  tredie={entry.topTredie ?? fallbackTredie(entry)}
                  priority={index === 0}
                  sizes={`(max-width: 640px) 40vw, ${index === 0 ? 300 : 240}px`}
                  className="h-full w-full"
                />
                {entry.golden > 0 ? <div className="legendary-sheen pointer-events-none absolute inset-0 animate-shimmer" /> : null}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-ink">
                    {entry.displayName ?? entry.otterTag}
                  </p>
                  <p className="truncate font-mono text-[11px] text-ink-faint">
                    {truncateAddress(entry.walletAddress, 4)}
                  </p>
                </div>
                <span
                  className={cn(
                    "grid shrink-0 size-8 place-items-center rounded-full text-xs font-semibold",
                    index === 0 && "bg-legendary-soft text-legendary-ink",
                    index === 1 && "bg-surface-muted text-ink-soft",
                    index === 2 && "bg-mocha-soft text-mocha",
                  )}
                >
                  {entry.rank}
                </span>
              </div>
              {isYou ? <RankChip /> : null}
            </div>
          );
        })}
      </div>

      <ol className="mx-auto mt-10 max-w-3xl" aria-label="Leaderboard">
        {rest.map((entry) => {
          const isYou = address === entry.walletAddress && account?.walletAddress === address;
          return <Row key={entry.walletAddress} entry={entry} isYou={isYou} />;
        })}
      </ol>
    </div>
  );
}

function Row({ entry, isYou }: { entry: LeaderboardEntry; isYou: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-3xl border bg-surface px-4 py-3 shadow-soft",
        isYou ? "border-legendary/40 bg-legendary-soft/40" : "border-line",
      )}
    >
      <span className="w-8 shrink-0 text-right font-display text-lg font-semibold tabular-nums text-ink-faint">
        {entry.rank}
      </span>

      <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-paper-deep">
        <TredieImage
          tredie={entry.topTredie ?? fallbackTredie(entry)}
          sizes="56px"
          className="h-full w-full"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-sm font-semibold text-ink">
            {entry.displayName ?? entry.otterTag}
          </p>
          {isYou ? <RankChip /> : null}
        </div>
        <p className="truncate font-mono text-[11px] text-ink-faint">
          {truncateAddress(entry.walletAddress, 4)}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <CountPill label="R" value={entry.rare} />
        <CountPill label="E" value={entry.epic} />
        <CountPill label="L" value={entry.legendary} />
        {entry.golden > 0 ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-legendary-soft px-2 py-0.5 text-[10px] font-semibold text-legendary-ink"
            title={`${entry.golden} golden`}
          >
            <Sparkles className="size-3" aria-hidden />
            {entry.golden}
          </span>
        ) : null}
      </div>

      <p className="shrink-0 text-sm font-medium text-ink-soft tabular-nums">
        {formatUsd(entry.totalSent)}
      </p>
    </li>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-ink-soft">
      {label} {value}
    </span>
  );
}

function RankChip() {
  return (
    <span className="rounded-full bg-legendary-soft px-2 py-0.5 text-[10px] font-semibold text-legendary-ink">
      You
    </span>
  );
}

/** Guard against a vanished record: render the tier's species placeholder. */
function fallbackTredie(entry: LeaderboardEntry) {
  const species: Species = entry.score >= 1000 ? "OTTER" : entry.score >= 10 ? "FISH" : "ROCK";
  const rarity: Rarity = entry.score >= 1000 ? "LEGENDARY" : entry.score >= 10 ? "EPIC" : "RARE";
  return {
    name: entry.displayName ?? entry.otterTag,
    species,
    rarity,
    isGolden: false,
    status: "ready" as const,
  };
}

function BoardNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-16">
      <p className="mx-auto mt-12 max-w-md rounded-[--radius-card] border border-line bg-surface p-8 text-center text-sm text-ink-soft shadow-soft">
        {children}
      </p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-16">
      <div className="text-center">
        <Skeleton className="mx-auto h-4 w-28 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-10 w-72 max-w-full" />
        <Skeleton className="mx-auto mt-3 h-4 w-64" />
      </div>
      <div className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-[--radius-card]" />
        ))}
      </div>
    </div>
  );
}