import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Sparkles } from "lucide-react";
import { RarityBadge, Tag } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TredieImage } from "@/components/tredie/tredie-image";
import { getRepository } from "@/services/persistence";
import { walletCookieName, verifyWalletToken } from "@/services/wallet-session";
import { cn, explorerUrl, formatDate, formatUsd, truncateAddress } from "@/lib/utils";
import { RARITY_META } from "@/config/rarity";
import { accessoryPortrait } from "@/config/portraits";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A non-UUID id can never match a row, and Postgres would reject it outright. */
function isUuid(value: string) {
  return UUID_RE.test(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Tredie not found" };
  const tredie = await getRepository().getById(id);
  if (!tredie) return { title: "Tredie not found" };
  return { title: `${tredie.name}, a ${RARITY_META[tredie.rarity].label.toLowerCase()} Tredie` };
}

export default async function TrediePage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const tredie = await getRepository().getById(id);
  if (!tredie) notFound();

  // A Tredie is a private receipt: only an unlocked session for its owner can
  // read it here, not a bare URL.
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(walletCookieName())?.value ?? null;
  const unlockedWallet = verifyWalletToken(cookieValue);
  if (!unlockedWallet || unlockedWallet !== tredie.ownerAddress) {
    redirect("/home");
  }

  const attributes = tredie.attributes;

  const details = [
    { label: "Species", value: attributes.species.toLowerCase() },
    { label: "Colour", value: `${attributes.primaryColor} / ${attributes.secondaryColor}` },
    { label: "Material", value: attributes.material },
    { label: "Expression", value: attributes.expression },
    { label: "Accessory", value: accessoryPortrait(attributes.accessory)?.name ?? "None" },
    { label: "Special feature", value: attributes.specialFeature ?? "None" },
  ];

  const payment = [
    { label: "Amount", value: `${formatUsd(tredie.amount)} ${tredie.asset}` },
    {
      label: "To",
      value: tredie.recipient
        ? `${tredie.recipient}, ${truncateAddress(tredie.stellarAddress ?? "", 6)}`
        : truncateAddress(tredie.stellarAddress ?? "—", 8),
    },
    { label: "Note", value: tredie.note ?? "No note this time.", wrap: true },
    { label: "Date", value: formatDate(tredie.createdAt), wrap: true },
    {
      label: "Network",
      value: tredie.stellarNetwork === "testnet" ? "Stellar Testnet" : "Stellar Public",
      tag: true,
    },
    {
      label: "Transaction",
      value: truncateAddress(tredie.stellarTransactionId, 8),
      mono: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl animate-rise px-5 py-10 md:py-14">
      <Link
        href="/home"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-soft shadow-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the collection
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_1.1fr] md:gap-12">
        <div>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-line bg-surface shadow-soft">
            <TredieImage tredie={tredie} priority sizes="(max-width: 768px) 90vw, 460px" />
            {tredie.isGolden ? (
              <div className="pointer-events-none absolute inset-0 legendary-sheen animate-shimmer" />
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <RarityBadge rarity={tredie.rarity} isGolden={tredie.isGolden} />
            <Tag>{attributes.species.toLowerCase()}</Tag>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mocha-soft px-2.5 py-1 text-[11px] font-semibold text-mocha">
              <Check className="size-3" aria-hidden />
              Verified on Stellar
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {tredie.name}
          </h1>
          <p className="mt-3 font-display text-xl text-ink-soft">{tredie.personality}</p>

          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">What makes it theirs</h2>
            <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
              {details.map((detail) => (
                <div key={detail.label} className="flex flex-col gap-0.5 bg-surface p-4">
                  <dt className="kicker">{detail.label}</dt>
                  <dd className="break-words text-sm text-ink">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">The transaction</h2>
            <dl className="mt-3 flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface px-5">
              {payment.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="shrink-0 text-sm text-ink-soft">{row.label}</dt>
                  {row.tag ? (
                    <dd className="min-w-0">
                      <Tag>{row.value}</Tag>
                    </dd>
                  ) : (
                    <dd
                      className={cn(
                        "min-w-0 text-right text-sm text-ink",
                        row.wrap ? "break-words" : "truncate",
                        row.mono && "font-mono text-xs text-ink-soft",
                      )}
                    >
                      {row.value}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={explorerUrl(tredie.stellarTransactionId, tredie.stellarNetwork)}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              <ExternalLink />
              View on Stellar Explorer
            </a>
            <Link href="/create" className={buttonVariants({ variant: "accent", size: "md" })}>
              <Sparkles />
              New Tredie
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
