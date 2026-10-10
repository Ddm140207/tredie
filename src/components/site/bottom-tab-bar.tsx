"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { HUB_MODES, parseMode } from "@/components/collection/modes";
import { cn } from "@/lib/utils";

export function BottomTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));
  const rankActive = pathname === "/leaderboard";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 sm:hidden" aria-label="Primary">
      <div className="mx-auto max-w-md px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5 items-center gap-1 rounded-[2rem] border border-line bg-surface-muted/90 p-1.5 shadow-lift backdrop-blur-md">
          {HUB_MODES.map((item) => {
            const active = item.match(pathname, mode);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center gap-0.5 rounded-3xl py-2.5 transition-all duration-200 active:scale-[0.97]",
                  active
                    ? "bg-surface text-ink shadow-soft"
                    : "text-ink-faint hover:text-ink-soft",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <Link
            href="/leaderboard"
            aria-current={rankActive ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center gap-0.5 rounded-3xl py-2.5 transition-all duration-200 active:scale-[0.97]",
              rankActive
                ? "bg-surface text-ink shadow-soft"
                : "text-ink-faint hover:text-ink-soft",
            )}
          >
            <Trophy className="size-5" aria-hidden />
            <span className={cn("text-[10px]", rankActive ? "font-semibold" : "font-medium")}>
              Rank
            </span>
          </Link>

          <Link
            href="/create"
            aria-label="Create a new Tredie"
            className="flex min-h-12 flex-col items-center gap-0.5 rounded-3xl bg-ink py-2.5 text-paper shadow-soft transition-transform duration-200 active:scale-[0.97]"
          >
            <Plus className="size-5" aria-hidden />
            <span className="text-[10px] font-semibold">New</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
