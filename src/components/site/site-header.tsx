import Image from "next/image";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { WalletButton } from "@/components/wallet/wallet-button";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5">
        <Link
          href="/home"
          className="flex items-center rounded-lg"
          aria-label={`${SITE.name} home`}
        >
          <Image
            src="/tredie/APP-LOGO.png"
            alt={SITE.name}
            width={831}
            height={721}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            aria-label="Leaderboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
          >
            <Trophy />
            Rank
          </Link>
          <Link
            href="/create"
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "hidden sm:inline-flex")}
          >
            <Plus />
            New Tredie
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
