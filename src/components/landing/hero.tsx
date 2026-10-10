"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Rarity, Species, TredieStatus } from "@/types";

export interface MockTredie {
  name: string;
  species: Species;
  rarity: Rarity;
  isGolden: boolean;
  status: TredieStatus;
  attributes?: { accessory?: string | null } | null;
}

/** Official app banner, served straight from public/. */
const BANNER = {
  src: "/tredie/BANNER-repo.jpg",
  width: 1632,
  height: 656,
} as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-5 pt-24 pb-28 text-center md:pt-32 md:pb-36">
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl font-display text-5xl leading-[1.04] font-semibold tracking-tight text-ink sm:text-6xl"
        >
          Your transactions,
          <br />
          <span className="bg-gradient-to-b from-mocha via-mocha/75 to-mocha/35 bg-clip-text text-transparent">
            alive.
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <Image
            src={BANNER.src}
            alt="Tredie — your transactions, alive"
            width={BANNER.width}
            height={BANNER.height}
            priority
            sizes="(max-width: 1152px) calc(100vw - 40px), 1120px"
            className="h-auto w-full rounded-[2rem] border border-line shadow-lift"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/create" className={buttonVariants({ variant: "accent", size: "lg" })}>
            Make your first Tredie
            <ArrowRight className="size-4" />
          </Link>
          <Link href="#how" className={buttonVariants({ variant: "outline", size: "lg" })}>
            See how it works
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
