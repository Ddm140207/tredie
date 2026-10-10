"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MotionConfig } from "motion/react";
import { ArrowRight, BarChart3, Check, ChevronDown, Coins, Receipt, Send, Sparkles, Wallet2 } from "lucide-react";
import { RarityBadge } from "@/components/ui/badge";
import { TredieImage } from "@/components/tredie/tredie-image";
import { cn, formatDate, formatUsd } from "@/lib/utils";
import { RARITY_META } from "@/config/rarity";
import { SITE, STELLAR_NETWORK_LABEL } from "@/config/site";
import type { Rarity, Species } from "@/types";
import { Faq } from "./faq";
import { Hero, type MockTredie } from "./hero";
import { Problem } from "./problem";
import { TrustStrip } from "./trust";

const COLLECTION: (MockTredie & { amount: number; note: string; date: string; recipient: string })[] = [
  { name: "Pebbles", species: "ROCK", rarity: "RARE", isGolden: false, status: "ready", amount: 25, note: "Coffee with friends", date: "2026-09-02T18:00:00.000Z", recipient: "Luis" },
  { name: "Bibi", species: "FISH", rarity: "EPIC", isGolden: false, status: "ready", amount: 75, note: "Drinks with the girls", date: "2026-09-14T19:30:00.000Z", recipient: "Gaby" },
  { name: "Zippy", species: "OTTER", rarity: "LEGENDARY", isGolden: false, status: "ready", amount: 250, note: "New headphones", date: "2026-10-01T12:00:00.000Z", recipient: "Luis" },
];

const STEPS = [
  { icon: Send, title: "Pay", body: "Send any amount on Stellar." },
  { icon: Coins, title: "Amount decides rarity", body: "The more you send, the rarer it gets." },
  { icon: Sparkles, title: "Something is born", body: "A small creature joins your collection." },
];

const BANDS = [
  { label: "Shimmer", className: "bg-rare/40" },
  { label: "Sprout", className: "bg-rare" },
  { label: "Tide", className: "bg-epic" },
  { label: "Deep", className: "bg-legendary" },
  { label: "Abyss", className: "bg-legendary" },
];

const SPECIES_ORDER: Species[] = ["ROCK", "FISH", "OTTER"];

const SPECIES_NAME: Record<Species, string> = {
  ROCK: "Rock",
  FISH: "Fish",
  OTTER: "Otter",
};

const SPECIES_ODDS: Record<
  Species,
  { rarity: Rarity; bands: { label: string; range: string; chance: string }[]; goldenNote?: string }
> = {
  ROCK: {
    rarity: "RARE",
    bands: [
      { label: "Shimmer", range: "$0.01–9.99", chance: "always" },
      { label: "Sprout", range: "$10–49.99", chance: "55%" },
    ],
  },
  FISH: {
    rarity: "EPIC",
    bands: [
      { label: "Sprout", range: "$10–49.99", chance: "45%" },
      { label: "Tide", range: "$50–199.99", chance: "always" },
      { label: "Deep", range: "$200–1,999.99", chance: "50%" },
    ],
  },
  OTTER: {
    rarity: "LEGENDARY",
    bands: [
      { label: "Deep", range: "$200–1,999.99", chance: "50%" },
      { label: "Abyss", range: "$2,000+", chance: "always" },
    ],
    goldenNote: "From $2,000 the same otter can roll golden: 1 send in 1,000.",
  },
};

const BENEFITS = [
  {
    icon: Receipt,
    title: "Payments become memories",
    body: "Every send is born as a named creature with the reason behind it. You keep the moment, not just a receipt.",
  },
  {
    icon: Sparkles,
    title: "Amount decides rarity",
    body: "Bigger sends unlock the fish, the otter, and one golden chance in a thousand — your story, quietly ranked.",
  },
  {
    icon: BarChart3,
    title: "Know where it goes",
    body: "Spending is grouped by person and ranked on its own. Open the hub and the answer is already there.",
  },
  {
    icon: Wallet2,
    title: "Private by design",
    body: "Pay from your own wallet. No Tredie account, no bank login, nothing to install.",
  },
];

const SPENDING_ROWS = [
  { label: "New headphones", total: 250, count: 1 },
  { label: "Drinks with the girls", total: 75, count: 3 },
  { label: "Coffee with friends", total: 25, count: 1 },
];

const MONTH_ROWS = [
  { label: "October", total: 250 },
  { label: "September", total: 100 },
];

const NAV_LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#how", label: "How it works" },
  { href: "#universe", label: "The universe" },
  { href: "#faq", label: "FAQ" },
];

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh">
        <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
          <nav className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 rounded-full border border-line bg-surface/85 px-4 shadow-[0_10px_34px_-14px_rgb(33_31_29/0.3)] backdrop-blur-xl sm:h-[4.25rem] sm:px-6">
            <Link href="/home" className="flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
              <Image
                src="/tredie/MAIN-LOGO-landing.png"
                alt={SITE.name}
                width={831}
                height={721}
                priority
                className="h-9 w-auto sm:h-10"
              />
              <span className="hidden text-xs font-medium tracking-[0.18em] text-ink-faint uppercase lg:inline">
                {SITE.domain}
              </span>
            </Link>

            <div className="hidden items-center gap-7 lg:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <Link
              href="/home"
              className="rounded-full bg-mocha px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Open the app
            </Link>
          </nav>
        </header>

        <main>
          <Hero />
          <TrustStrip />

          <Problem />

          {/* How it works */}
          <section id="how" className="scroll-mt-24 border-y border-line bg-surface-muted/60 py-32 md:py-44">
            <div className="mx-auto w-full max-w-6xl px-5">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-medium text-mocha">
                  How it works
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Pay. Something gets born.
                </h2>
                <p className="mt-3 text-ink-soft">
                  The payment you already make — remembered for you. Three steps, about a minute.
                </p>
              </div>

              <ol className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-3">
                {STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="relative overflow-hidden rounded-[--radius-card] border border-line bg-surface p-8 shadow-soft"
                  >
                    <span className="absolute -top-5 right-3 font-display text-[5.5rem] leading-none font-semibold text-line/70 select-none" aria-hidden>
                      0{index + 1}
                    </span>
                    <span className="grid size-11 place-items-center rounded-2xl bg-mocha-soft text-mocha">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-6 font-display text-xl font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-ink-faint">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* The universe — tap a pet to learn its rarity */}
          <section id="universe" className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 py-32 md:py-44">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium text-mocha">
                The universe
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Three species. Nothing else.
              </h2>
              <p className="mt-3 text-ink-soft">
                Rarity decides the species. Tap a pet to see exactly how rare it is — and which
                sends can end up there.
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-3xl">
              <p className="text-center text-sm text-ink-soft">
                Amount decides rarity — bigger sends unlock the fish, the otter, and one
                golden chance in a thousand.
              </p>
              <div className="mt-5 flex w-full gap-1.5" aria-hidden>
                {BANDS.map((band) => (
                  <span key={band.label} className={`h-1.5 grow rounded-full ${band.className}`} />
                ))}
              </div>
              <div className="mt-2 flex w-full gap-1.5" aria-hidden>
                {BANDS.map((band) => (
                  <span key={band.label} className="grow text-center text-[10px] text-ink-faint">
                    {band.label}
                  </span>
                ))}
              </div>
            </div>

            <SpeciesExplorer />
          </section>

          {/* The collection — tap a Tredie to read its receipt */}
          <section className="border-y border-line bg-surface-muted/60 py-32 md:py-44">
            <div className="mx-auto w-full max-w-6xl px-5">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-medium text-mocha">
                  The collection
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  A transaction became a memory
                </h2>
                <p className="mt-3 text-ink-soft">
                  Every payment is born as a creature with a name. Tap one to read the receipt it
                  came from.
                </p>
              </div>

              <MemoryExplorer />
            </div>
          </section>

          {/* Benefits + spending insights */}
          <section className="border-y border-line bg-surface-muted/60 py-32 md:py-44">
            <div className="mx-auto w-full max-w-6xl px-5">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-medium text-mocha">
                  More than a friend
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  A receipt you&apos;ll want to keep.
                </h2>
                <p className="mt-3 text-ink-soft">
                  Tredie reads the transactions you already make and turns them into two things: a
                  creature to keep, and an honest picture of where your money goes. No forms, no
                  spreadsheets — just your own history.
                </p>
              </div>

              <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
                <ul className="flex flex-col gap-4">
                  {BENEFITS.map((benefit) => (
                    <li
                      key={benefit.title}
                      className="flex gap-4 rounded-[--radius-card] border border-line bg-surface p-5 shadow-soft"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mocha-soft text-mocha">
                        <benefit.icon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-ink">{benefit.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink-faint">{benefit.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="relative">
                  <div aria-hidden className="absolute -inset-6 rounded-[3rem] bg-mocha/5 blur-2xl" />
                  <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 shadow-lift sm:p-8">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink-faint">
                          All time
                        </p>
                        <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink tabular-nums">
                          $350
                        </p>
                      </div>
                      <span className="shrink-0 text-center">
                        <span className="block rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-soft">
                          <span className="block text-[10px] text-ink-faint">This month</span>
                          <span className="block tabular-nums">$250</span>
                        </span>
                      </span>
                    </div>

                    <div className="mt-7">
                      <p className="text-sm font-medium text-ink-faint">
                        Where it goes
                      </p>
                      <div className="mt-4 flex flex-col gap-4">
                        {SPENDING_ROWS.map((row) => (
                          <div key={row.label}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-sm font-medium text-ink">{row.label}</span>
                              <span className="shrink-0 text-sm font-medium text-ink-soft tabular-nums">
                                {formatUsd(row.total)}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className="h-full rounded-full bg-mocha/70"
                                style={{ width: `${(row.total / 250) * 100}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-ink-faint">
                              {row.count} payment{row.count === 1 ? "" : "s"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-7 border-t border-line pt-6">
                      <p className="text-sm font-medium text-ink-faint">
                        Month by month
                      </p>
                      <div className="mt-4 flex flex-col gap-4">
                        {MONTH_ROWS.map((row) => (
                          <div key={row.label}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-sm font-medium text-ink">{row.label}</span>
                              <span className="shrink-0 text-sm font-medium text-ink-soft tabular-nums">
                                {formatUsd(row.total)}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className="h-full rounded-full bg-legendary/70"
                                style={{ width: `${(row.total / 250) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="absolute -right-4 top-16 hidden animate-float rounded-2xl border border-line bg-surface px-4 py-2 shadow-soft lg:block">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                      <BarChart3 className="size-3.5 text-mocha" aria-hidden />
                      Automatic, from your own payments
                    </p>
                  </div>
                </div>
              </div>

              <p className="mx-auto mt-16 max-w-2xl text-center text-sm text-ink-soft">
                The analysis is automatic: the same payment that births the creature grows the
                numbers. Nothing extra to fill in, nothing to export.
              </p>
            </div>
          </section>

          <Faq />

          {/* Final CTA */}
          <section className="relative overflow-hidden bg-ink py-36 text-paper md:py-44">
            <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-legendary/20 blur-3xl" />
            <div className="relative mx-auto w-full max-w-6xl px-5 text-center">
              <Image
                src="/tredie/MAIN-LOGO-landing.png"
                alt={SITE.name}
                width={831}
                height={721}
                className="mx-auto w-36 sm:w-44"
              />
              <p className="mt-10 font-display text-4xl font-semibold sm:text-5xl">
                Your first Tredie is waiting.
              </p>
              <p className="mx-auto mt-5 max-w-md text-paper/70">
                One real Stellar payment. A creature you keep — and the clearest view of your
                spending yet.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/create"
                  className="inline-flex h-13 items-center gap-2 rounded-full bg-paper px-9 text-base font-medium text-ink shadow-soft transition-opacity hover:opacity-90"
                >
                  Make your first Tredie
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/home"
                  className="inline-flex h-13 items-center gap-2 rounded-full border border-paper/25 px-9 text-base font-medium text-paper transition-colors hover:bg-paper/10"
                >
                  See the collection
                </Link>
              </div>
              <p className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-paper/50">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-paper/60" aria-hidden /> No account
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-paper/60" aria-hidden /> Nothing to install
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-paper/60" aria-hidden /> {STELLAR_NETWORK_LABEL}
                </span>
              </p>
            </div>

            <footer className="relative mx-auto mt-24 w-full max-w-6xl px-5">
              <div className="flex flex-col items-center justify-between gap-4 border-t border-paper/15 pt-8 sm:flex-row">
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-base font-semibold text-paper">{SITE.name}</span>
                  <span className="text-xs text-paper/40">{SITE.domain}</span>
                </div>
                <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-paper/60">
                  <Link href="/home">Collection</Link>
                  <Link href="/leaderboard">Leaderboard</Link>
                  <Link href="/create">Create a Tredie</Link>
                  <a href="#how">How it works</a>
                  <a href="#faq">FAQ</a>
                </nav>
                <p className="text-xs text-paper/40">
                  © {new Date().getFullYear()} {SITE.name} · Built on {STELLAR_NETWORK_LABEL}
                </p>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}

function SpeciesExplorer() {
  const [selected, setSelected] = useState<Species | null>(null);

  return (
    <div className="mt-16">
      <div className="grid items-start gap-4 sm:grid-cols-3">
        {SPECIES_ORDER.map((species) => {
          const active = selected === species;
          const speciesMeta = RARITY_META[SPECIES_ODDS[species].rarity];
          return (
            <div
              key={species}
              className={cn(
                "overflow-hidden rounded-[--radius-card] border bg-surface shadow-soft transition-all",
                active ? "border-line-strong" : "border-line",
              )}
              style={
                active
                  ? { boxShadow: `0 0 0 1px ${speciesMeta.accent}66, 0 18px 40px -18px ${speciesMeta.accent}99` }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={() => setSelected(active ? null : species)}
                aria-expanded={active}
                className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                <div className="relative overflow-hidden bg-paper-deep">
                  <Image
                    src={`/tredie/${SPECIES_NAME[species].toLowerCase()}.webp`}
                    alt={`The ${SPECIES_NAME[species].toLowerCase()}, the ${oddsLabel(species)} species`}
                    width={1024}
                    height={1024}
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-3 top-3">
                    <RarityBadge rarity={SPECIES_ODDS[species].rarity} />
                  </span>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="font-display text-lg font-semibold text-ink">
                    {SPECIES_NAME[species]}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                    {active ? "Tap to close" : "Tap to learn"}
                    <ChevronDown
                      className={cn("size-3.5 transition-transform duration-300", active && "rotate-180")}
                      aria-hidden
                    />
                  </span>
                </div>
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  active ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-line px-5 py-5">
                    <p className="text-xs text-ink-faint">
                      <span className="font-medium text-ink-soft">{speciesMeta.label}.</span>{" "}
                      {speciesMeta.blurb}
                    </p>
                    <p className="mt-4 text-sm font-medium text-ink-faint">
                      Where it shows up
                    </p>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {SPECIES_ODDS[species].bands.map((band) => (
                        <li
                          key={band.label}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-ink">{band.label}</p>
                            <p className="text-xs text-ink-faint">{band.range} sends</p>
                          </div>
                          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink-soft">
                            {band.chance}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {SPECIES_ODDS[species].goldenNote ? (
                      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-legendary-soft px-4 py-3 text-sm text-legendary">
                        <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <span>
                          <span className="font-semibold">Golden otter.</span>{" "}
                          {SPECIES_ODDS[species].goldenNote} A recolour of the same species — never
                          a fourth animal.
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function oddsLabel(species: Species): string {
  return RARITY_META[SPECIES_ODDS[species].rarity].label.toLowerCase();
}

function MemoryExplorer() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const item = COLLECTION[selectedIndex] as (typeof COLLECTION)[number];
  const meta = RARITY_META[item.rarity];

  return (
    <div className="relative mx-auto mt-16 max-w-4xl">
      <div aria-hidden className="absolute -inset-6 rounded-[3rem] bg-mocha/5 blur-2xl" />

      <div className="relative grid items-stretch gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-lift">
          <div className="relative bg-paper-deep">
            <TredieImage
              tredie={item}
              sizes="(max-width: 1024px) 90vw, 420px"
              className="w-full"
            />
            <div className="absolute left-4 top-4">
              <RarityBadge rarity={item.rarity} isGolden={item.isGolden} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 p-6 sm:p-7">
            <div>
              <p className="font-display text-2xl font-semibold text-ink">{item.name}</p>
              <p className="text-sm text-ink-faint">{SPECIES_NAME[item.species]} species</p>
            </div>
            <p className="font-display text-xl font-semibold text-ink tabular-nums">
              {formatUsd(item.amount)}
            </p>
          </div>
        </div>

        <div className="flex flex-col rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <p className="text-sm font-medium text-ink-faint">
            This was a payment first
          </p>
          <dl className="mt-5 flex flex-col divide-y divide-line border-t border-line">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink-faint">Amount</dt>
              <dd className="text-sm font-medium text-ink tabular-nums">{formatUsd(item.amount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink-faint">Sent to</dt>
              <dd className="text-sm font-medium text-ink">{item.recipient}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink-faint">Note</dt>
              <dd className="max-w-[60%] truncate text-right text-sm font-medium text-ink">
                {item.note}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink-faint">Sent on</dt>
              <dd className="text-sm font-medium text-ink">{formatDate(item.date)}</dd>
            </div>
          </dl>

          <div className="mt-auto pt-7">
            <p className="text-sm leading-relaxed text-ink-soft">
              …and that&apos;s how <span className="font-medium text-ink">{item.name}</span> came to
              be. <span className="font-medium text-ink" style={{ color: meta.text }}>{meta.label}</span>,
              drawn from a payment you actually want to keep.
            </p>
            <p className="mt-2 text-xs text-ink-faint">{meta.blurb}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
        {COLLECTION.map((entry, index) => {
          const active = selectedIndex === index;
          const entryMeta = RARITY_META[entry.rarity];
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-pressed={active}
              className={cn(
                "group overflow-hidden rounded-3xl border bg-surface text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
                active ? "border-line-strong shadow-lift" : "border-line hover:border-line-strong",
              )}
              style={
                active
                  ? { boxShadow: `0 0 0 1px ${entryMeta.accent}66, 0 14px 30px -16px ${entryMeta.accent}99` }
                  : undefined
              }
            >
              <div className="relative overflow-hidden bg-paper-deep">
                <TredieImage tredie={entry} sizes="(max-width: 640px) 40vw, 220px" />
                <span className="absolute left-2.5 top-2.5">
                  <RarityBadge rarity={entry.rarity} isGolden={entry.isGolden} />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 p-4">
                <p className="font-display text-base font-semibold text-ink">{entry.name}</p>
                <span className="text-sm font-medium text-ink-soft tabular-nums">
                  {formatUsd(entry.amount)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}