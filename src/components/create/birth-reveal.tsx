"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { RarityBadge } from "@/components/ui/badge";
import { TredieImage } from "@/components/tredie/tredie-image";
import { formatDate, formatUsd, truncateAddress } from "@/lib/utils";
import type { TredieRecord } from "@/types";

const WAITING_MESSAGES = [
  "Your Tredie is taking shape…",
  "Adding a little personality…",
  "Choosing colours that feel right…",
  "Almost ready…",
];

const SPRING = { type: "spring" as const, stiffness: 220, damping: 22 };

export function VerifiedStep({ amount, asset }: { amount: number; asset: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-10 text-center"
    >
      <span className="relative grid size-16 place-items-center rounded-full bg-mocha-soft text-mocha">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-mocha/40"
          animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING}
          className="relative"
        >
          <Check className="size-8" aria-hidden />
        </motion.span>
      </span>
      <div>
        <p className="font-display text-2xl font-semibold text-ink">Transaction confirmed</p>
        <p className="mt-1 text-ink-soft">
          Verified on Stellar, {formatUsd(amount)} {asset}
        </p>
      </div>
    </motion.div>
  );
}

export function BirthStep() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((index) => (index + 1) % WAITING_MESSAGES.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div role="status" className="flex flex-col items-center gap-8 py-14 text-center">
      <div className="relative grid size-40 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-mocha/10"
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-6 rounded-full bg-mocha/15"
          animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <motion.span
          className="grid size-20 place-items-center rounded-full bg-surface text-mocha shadow-soft"
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="size-8" aria-hidden />
        </motion.span>
      </div>

      <div>
        <p className="font-display text-xl font-semibold text-ink">
          Something is being born
        </p>
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-ink-soft"
        >
          {WAITING_MESSAGES[messageIndex]}
        </motion.p>
      </div>
    </div>
  );
}

export function RevealStep({
  tredie,
  onRetry,
  retrying,
  error,
}: {
  tredie: TredieRecord;
  onRetry?: () => void;
  retrying?: boolean;
  error?: string | null;
}) {
  const stats = [
    { label: "Rarity", value: <RarityBadge rarity={tredie.rarity} isGolden={tredie.isGolden} /> },
    { label: "Amount", value: `${formatUsd(tredie.amount)} ${tredie.asset}` },
    { label: "Note", value: tredie.note ?? "No note this time." },
    { label: "Date", value: formatDate(tredie.createdAt) },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.82, filter: "blur(14px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ ...SPRING, delay: 0.08 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-line bg-surface shadow-lift"
        >
          <TredieImage tredie={tredie} priority sizes="(max-width: 768px) 90vw, 384px" />
          {tredie.isGolden ? (
            <div className="pointer-events-none absolute inset-0 legendary-sheen animate-shimmer" />
          ) : null}
        </motion.div>

        {/* The golden otter gets a wink of sparkle — nothing more. */}
        {tredie.isGolden ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <motion.span
              className="absolute -left-3 top-10 text-legendary"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6], y: [0, -8, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: 0.7, ease: "easeInOut" }}
            >
              <Sparkles className="size-5" />
            </motion.span>
            <motion.span
              className="absolute -right-2 bottom-20 text-legendary"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6], y: [0, -8, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: 1.5, ease: "easeInOut" }}
            >
              <Sparkles className="size-4" />
            </motion.span>
          </div>
        ) : null}

        {tredie.status === "failed" ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-coral/25 bg-coral-soft p-4 text-center"
          >
            <p className="text-sm font-medium text-coral-ink">
              {error ?? tredie.errorMessage ?? "Your Tredie is taking a little longer."}
            </p>
            <p className="mt-1 text-xs text-coral-ink">
              Retrying reuses the same confirmed payment. You will not be charged again.
            </p>
            {onRetry ? (
              <Button className="mt-3" variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
                {retrying ? "Retrying…" : "Retry"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="kicker"
        >
          Your new Tredie
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.24 }}
          className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink"
        >
          {tredie.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.36 }}
          className="mt-2 text-ink-soft"
        >
          {tredie.personality}
        </motion.p>
      </div>

      <dl className="grid w-full max-w-sm grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.07 }}
            className="flex flex-col gap-1 bg-surface p-4"
          >
            <dt className="kicker">{stat.label}</dt>
            <dd className="break-words text-sm text-ink">{stat.value}</dd>
          </motion.div>
        ))}
      </dl>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col items-center gap-4"
      >
        <p className="inline-flex items-center gap-1.5 rounded-full bg-mocha-soft px-3 py-1.5 text-xs font-medium text-mocha">
          <Check className="size-3.5" aria-hidden />
          Verified on Stellar, {truncateAddress(tredie.stellarTransactionId, 6)}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/tredies/${tredie.id}`} className={buttonVariants({ variant: "accent", size: "lg" })}>
            Meet {tredie.name}
          </Link>
          <Link href="/create" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Another one
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
