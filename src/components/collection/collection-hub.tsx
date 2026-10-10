"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { CollectionGrid } from "@/components/collection/collection-grid";
import { TimelineList } from "@/components/collection/timeline-list";
import { SpendingView } from "@/components/collection/spending-view";
import { HUB_MODES, parseMode, type HubMode } from "@/components/collection/modes";
import { Skeleton } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TredieImage } from "@/components/tredie/tredie-image";
import { useWallet } from "@/components/wallet/wallet-provider";
import { WalletUnlock } from "@/components/wallet/wallet-unlock";
import { cn, formatMonth, formatUsd } from "@/lib/utils";
import type { TredieRecord } from "@/types";

/** Warm, per-view copy so an empty hub never reads like a dead dashboard. */
const EMPTY_COPY: Record<HubMode, { title: string; body: string }> = {
  grid: {
    title: "Your first Tredie is waiting",
    body: "One payment, about a minute, and a small friend shows up. Go big and it might just come out golden.",
  },
  timeline: {
    title: "Nothing on the timeline yet",
    body: "Every payment you make lands here, newest first, with the friend it left behind.",
  },
  spending: {
    title: "No spending to show yet",
    body: "Send your first payment and this page starts keeping score — by person and by month.",
  },
};

export function CollectionHub({ defaultMode = "grid" }: { defaultMode?: HubMode }) {
  const { address, status, account } = useWallet();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<{ key: string; tredies: TredieRecord[] } | null>(null);

  const connected = status === "connected" && Boolean(address);
  const unlocked = connected && account?.walletAddress === address;
  const queryKey = `${status}:${address ?? "all"}:${unlocked ? "open" : "locked"}`;
  const urlMode = parseMode(searchParams.get("mode"));
  const mode = urlMode ?? defaultMode;

  useEffect(() => {
    let cancelled = false;
    if (!connected || !unlocked || !address) {
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/tredies?owner=${address}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { tredies?: TredieRecord[] }) => {
        if (!cancelled) setResult({ key: queryKey, tredies: payload.tredies ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: queryKey, tredies: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [address, connected, unlocked, queryKey]);

  // Stale results are treated as still loading rather than briefly shown.
  const tredies = useMemo(() => {
    if (!result || result.key !== queryKey) return null;
    return [...result.tredies].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [result, queryKey]);

  const total = tredies?.length ?? 0;
  const sent = useMemo(() => (tredies ?? []).reduce((sum, item) => sum + item.amount, 0), [tredies]);
  const thisMonth = useMemo(() => {
    const key = formatMonth(new Date().toISOString());
    return (tredies ?? [])
      .filter((item) => formatMonth(item.createdAt) === key)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [tredies]);
  const otters = useMemo(
    () => (tredies ?? []).filter((item) => item.species === "OTTER").length,
    [tredies],
  );

  if (connected && !unlocked) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-16">
        <WalletUnlock />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mx-auto flex w-full max-w-6xl px-5 py-10 md:py-16">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-[--radius-hero] border border-line bg-surface px-6 py-16 text-center shadow-soft">
          <div className="flex flex-col items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-mocha-soft text-mocha">
              <Sparkles className="size-7" aria-hidden />
            </div>
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                Your collection is waiting
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
                Connect a wallet with the button up top, set a PIN, and your little
                transactions — with their private notes — show up right here.
              </p>
            </div>
          </div>
          <Link
            href="/create"
            className={cn(buttonVariants({ variant: "accent", size: "md" }), "mt-2")}
          >
            <Plus />
            Make your first Tredie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-16">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Your little transactions
            </h1>
            <p className="mt-2 max-w-md text-ink-soft">
              {tredies === null
                ? "Waking up your collection…"
                : "Payments you made, and the friends they left behind."}
            </p>
          </div>

          <Link
            href="/create"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "hidden sm:inline-flex")}
          >
            <Plus />
            New Tredie
          </Link>
        </div>

        {tredies !== null ? (
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[--radius-hero] border border-line bg-line shadow-soft sm:grid-cols-4">
            <Stat label="Sent" value={formatUsd(sent)} />
            <Stat label="This month" value={formatUsd(thisMonth)} />
            <Stat label="Creatures" value={String(total)} />
            <Stat
              label="Otters"
              value={String(otters)}
              accent
              hint={otters > 0 && <Sparkles className="size-3 text-legendary" aria-hidden />}
            />
          </dl>
        ) : (
          <div className="mt-8 grid h-28 grid-cols-4 gap-px overflow-hidden rounded-[--radius-hero] border border-line bg-line shadow-soft">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-surface p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2.5 h-6 w-20" />
              </div>
            ))}
          </div>
        )}

        <nav
          className="mt-8 inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted p-1 shadow-soft"
          aria-label="Collection views"
        >
          {HUB_MODES.map((item) => {
            const active = item.match(pathname, urlMode);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface text-ink shadow-soft"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {tredies === null ? (
        <div role="status" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading your collection…</span>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState mode={mode} />
      ) : (
        <div className={cn(mode === "grid" ? "" : "mx-auto mt-6 max-w-3xl")}>
          {mode === "grid" ? (
            <CollectionGrid tredies={tredies} />
          ) : mode === "timeline" ? (
            <TimelineList tredies={tredies} />
          ) : (
            <SpendingView tredies={tredies} />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <dt className="text-xs font-medium text-ink-faint">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 font-display text-xl font-semibold tracking-tight text-ink tabular-nums",
          accent && "text-legendary-ink",
        )}
      >
        {value} {hint}
      </dd>
    </div>
  );
}

/** The golden otter winks at you until you have one of your own. */
function EmptyState({ mode }: { mode: HubMode }) {
  const copy = EMPTY_COPY[mode];
  return (
    <div className="mt-12 flex flex-col items-center gap-5 rounded-[--radius-hero] border border-line bg-surface px-6 py-16 text-center shadow-soft">
      <div className="relative size-44 animate-float">
        <TredieImage
          tredie={{
            name: "Midas",
            species: "OTTER",
            rarity: "LEGENDARY",
            isGolden: true,
            status: "ready",
          }}
          sizes="176px"
        />
        <div className="pointer-events-none absolute inset-0 legendary-sheen animate-shimmer" />
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">{copy.title}</p>
        <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{copy.body}</p>
      </div>
      <Link href="/create" className={buttonVariants({ variant: "accent", size: "md" })}>
        <Plus />
        New Tredie
      </Link>
    </div>
  );
}

export function HubFallback() {
  return (
    <div role="status" className="mx-auto w-full max-w-6xl px-5 py-10 md:py-16">
      <span className="sr-only">Loading your collection…</span>
      <Skeleton className="h-7 w-48 rounded-full" />
      <Skeleton className="mt-4 h-12 w-80 max-w-full" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[--radius-hero] border border-line bg-line shadow-soft sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-surface p-4 sm:p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2.5 h-6 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-8 h-10 w-72 max-w-full rounded-full" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full" />
        ))}
      </div>
    </div>
  );
}
