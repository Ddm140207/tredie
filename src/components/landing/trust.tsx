import { BarChart3, ShieldCheck, Sparkles, UserX, Wallet, type LucideIcon } from "lucide-react";
import { STELLAR_NETWORK_LABEL } from "@/config/site";

/**
 * What the visitor actually gets, not just what to trust: no sign-up, their own
 * wallet signing, a record they can read back, and the collection hook.
 */
const FACTS: { icon: LucideIcon; label: string }[] = [
  { icon: UserX, label: "No account required" },
  { icon: Wallet, label: "Signed by your wallet" },
  { icon: ShieldCheck, label: `Verified live on ${STELLAR_NETWORK_LABEL}` },
  { icon: BarChart3, label: "See your spending, month by month" },
  { icon: Sparkles, label: "3 species, 1 golden in 1,000" },
];

export function TrustStrip() {
  return (
    <section aria-label="Product facts" className="border-t border-line bg-surface-muted/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6">
        {FACTS.map((fact) => (
          <span
            key={fact.label}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft"
          >
            <fact.icon className="size-4 shrink-0 text-mocha" aria-hidden />
            {fact.label}
          </span>
        ))}
      </div>
    </section>
  );
}
