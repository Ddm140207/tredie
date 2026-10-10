"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Is this a crypto thing?",
    a: "It's the opposite: a payments app that feels human. It happens to live on the Stellar network, so every creature is verifiably real. You never have to touch an address or a hash.",
  },
  {
    q: "Do I need an account or a wallet?",
    a: "Just the Freighter browser wallet — a couple of clicks to install in the demo. No Tredie account, no bank login, nothing else to set up.",
  },
  {
    q: "Is my money safe?",
    a: "You always pay from your own wallet and sign every transaction yourself. Tredie never holds, moves, or touches the funds. The receipt is verified on-chain before a creature is born.",
  },
  {
    q: "Do I have to spend real money?",
    a: "The demo runs on Stellar Testnet — play money the faucet tops up for free. Try it as many times as you like, with zero risk.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes — it's a web app, so it works in the browser on any device. The collection reads best on the go.",
  },
  {
    q: "What about payments I already made?",
    a: "Tredie comes alive from each new send. From the moment you start, every payment becomes a creature — nothing is imported or invented.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-32 md:py-44">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-mocha">Good to know</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Questions, answered.
        </h2>
        <p className="mt-3 text-ink-soft">
          The short version: it&apos;s free, it&apos;s on testnet, and nothing is invented.
        </p>
      </div>

      <div className="mx-auto mt-16 flex max-w-3xl flex-col gap-3">
        {FAQS.map((item, index) => {
          const active = open === index;
          return (
            <div
              key={item.q}
              className={cn(
                "overflow-hidden rounded-[--radius-card] border bg-surface shadow-soft transition-all",
                active ? "border-line-strong" : "border-line",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(active ? -1 : index)}
                aria-expanded={active}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-display text-base font-semibold text-ink sm:text-lg">
                  {item.q}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-faint transition-transform duration-300",
                    active && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  active ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-sm leading-relaxed text-ink-soft">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}