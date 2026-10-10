"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { RarityBadge, Tag } from "@/components/ui/badge";
import { useWallet, type FundStatus } from "@/components/wallet/wallet-provider";
import { WalletUnlock } from "@/components/wallet/wallet-unlock";
import { BirthStep, RevealStep, VerifiedStep } from "@/components/create/birth-reveal";
import { RARITY_CONFIG, isAmountAllowed, previewBand, RARITY_META } from "@/config/rarity";
import { ASSET_CODE } from "@/config/site";
import { cn, formatUsd, sleep, truncateAddress } from "@/lib/utils";
import type { TredieRecord } from "@/types";

type Step = "form" | "review" | "paying" | "verify" | "confirmed" | "birth" | "reveal";
/** Which chip in the progress row is lit up. */
type FlowStage = "details" | "review" | "pay";
/** How far the payment itself has got: wallet approval, then network send. */
type PayStage = "sign" | "submit";

const AMOUNT_PRESETS = [5, 25, 75, 250, 1200, 2500];
const PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;
const POLL_INTERVAL_MS = 1200;
const MAX_POLL_ATTEMPTS = 90;

interface BuiltPayment {
  xdr: string;
  networkPassphrase: string;
  assetCode: string;
}

export function CreateFlow() {
  const wallet = useWallet();

  const [step, setStep] = useState<Step>("form");
  const [payStage, setPayStage] = useState<PayStage>("sign");
  const [amount, setAmount] = useState("25");
  const [destination, setDestination] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [tredie, setTredie] = useState<TredieRecord | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const amountUsd = Number(amount);
  const amountValid = isAmountAllowed(amountUsd);
  const destinationValid = PUBLIC_KEY_PATTERN.test(destination.trim());
  const preview = useMemo(
    () => (amountValid ? previewBand(amountUsd) : null),
    [amountUsd, amountValid],
  );
  const walletLabel = wallet.mode === "local-test" ? "the local test signer" : "Freighter";

  // Polls until the image is ready. Bounded so a stalled generation surfaces the
  // retry affordance instead of polling forever.
  const pollForTredie = useCallback(async (id: string) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const response = await fetch(`/api/tredies/${id}`, { cache: "no-store" });
        const payload = (await response.json()) as { tredie?: TredieRecord };
        if (!response.ok || !payload.tredie) throw new Error("Could not read your Tredie.");
        setTredie(payload.tredie);
        if (payload.tredie.status === "generating") continue;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
      }
      setStep("reveal");
      return;
    }
    setStep("reveal");
  }, []);

  // Verification only — never builds or signs anything, so retrying can never
  // charge twice. It reuses the transaction hash that is already confirmed.
  const finalize = useCallback(
    async (hash: string) => {
      if (!wallet.address) return;
      const createResponse = await fetch("/api/tredies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: hash,
          amountUsd,
          recipientName: recipientName || undefined,
          destination: destination.trim(),
          note: note || undefined,
          ownerPublicKey: wallet.address,
        }),
      });
      const created = (await createResponse.json()) as { tredie?: TredieRecord; error?: string };
      if (!createResponse.ok || !created.tredie) {
        throw new Error(created.error ?? "Stellar confirmed it, but we could not verify it.");
      }
      setTredie(created.tredie);
      setStep("birth");
      pollForTredie(created.tredie.id);
    },
    [wallet.address, amountUsd, recipientName, destination, note, pollForTredie],
  );

  const pay = useCallback(async () => {
    if (!wallet.address) return;
    setStep("paying");
    setPayStage("sign");
    setError(null);

    let submittedHash: string | null = null;

    try {
      // Testnet tops the wallet up on connect; wait for it so the build step
      // never fails on an account that is still being funded.
      await wallet.ensureFunded();

      const buildResponse = await fetch("/api/stellar/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderPublicKey: wallet.address,
          destination: destination.trim(),
          amountUsd,
          note,
        }),
      });
      const payment = (await buildResponse.json()) as BuiltPayment & { error?: string };
      if (!buildResponse.ok) throw new Error(payment.error ?? "Could not build the payment.");

      const signedXdr = await wallet.signTransaction(payment.xdr, payment.networkPassphrase);
      setPayStage("submit");

      const submitResponse = await fetch("/api/stellar/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXdr }),
      });
      const submission = (await submitResponse.json()) as { hash?: string; error?: string };
      if (!submitResponse.ok || !submission.hash) {
        throw new Error(submission.error ?? "Your transaction didn't go through.");
      }

      submittedHash = submission.hash;
      setTxHash(submission.hash);
      setStep("confirmed");
      await new Promise((resolve) => setTimeout(resolve, 1700));

      await finalize(submission.hash);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your transaction didn't go through.");
      // Once the network has the payment we never rebuild it — offer the
      // verification-only path instead of a button that could pay again.
      if (submittedHash) setStep("verify");
      else setStep("review");
    }
  }, [wallet, destination, amountUsd, note, finalize]);

  const finishNow = useCallback(async () => {
    if (!txHash) return;
    setFinishing(true);
    setError(null);
    try {
      await finalize(txHash);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Still taking a little longer.");
    } finally {
      setFinishing(false);
    }
  }, [txHash, finalize]);

  const retryGeneration = useCallback(async () => {
    if (!tredie) return;
    setRetrying(true);
    setError(null);
    try {
      const response = await fetch(`/api/tredies/${tredie.id}/generate`, { method: "POST" });
      const payload = (await response.json()) as { tredie?: TredieRecord; error?: string };
      if (!response.ok || !payload.tredie) {
        throw new Error(payload.error ?? "Still taking a little longer.");
      }
      setTredie(payload.tredie);
      if (payload.tredie.status === "generating") pollForTredie(payload.tredie.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Still taking a little longer.");
    } finally {
      setRetrying(false);
    }
  }, [tredie, pollForTredie]);

  // A Tredie carries a private note, so creation is gated behind the same PIN
  // as the collection: the browser must have unlocked the signing wallet.
  if (wallet.address && wallet.account?.walletAddress !== wallet.address) {
    return (
      <div>
        <WalletUnlock />
        <p className="mt-5 text-center text-xs text-ink-soft">
          Your wallet signs the payment. The PIN only unlocks this browser&apos;s
          view of your little receipts.
        </p>
      </div>
    );
  }

  let stage: FlowStage | null = null;
  let content: React.ReactNode = null;

  if (step === "confirmed") {
    content = <VerifiedStep amount={amountUsd} asset={ASSET_CODE} />;
  } else if (step === "birth") {
    content = <BirthStep />;
  } else if (step === "reveal" && tredie) {
    content = (
      <RevealStep
        tredie={tredie}
        onRetry={retryGeneration}
        retrying={retrying}
        error={error}
      />
    );
  } else if (step === "paying") {
    stage = "pay";
    content = <PayingState stage={payStage} walletLabel={walletLabel} fundStatus={wallet.fundStatus} />;
  } else if (step === "verify") {
    stage = "pay";
    content = (
      <div
        role="status"
        className="flex flex-col items-center gap-5 rounded-[--radius-card] border border-line bg-surface p-6 text-center shadow-soft sm:p-8"
      >
        <span className="grid size-14 place-items-center rounded-full bg-mocha-soft text-mocha">
          <Check className="size-7" aria-hidden />
        </span>
        <div>
          <p className="font-display text-xl font-semibold text-ink">
            Payment confirmed — just catching up
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
            Your {formatUsd(amountUsd)} {ASSET_CODE} made it to Stellar. We only need to verify it
            before your Tredie is born — you will not be charged again.
          </p>
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button variant="accent" size="lg" onClick={finishNow} disabled={finishing}>
          {finishing ? "Finishing up…" : "Finish up"}
        </Button>
      </div>
    );
  } else if (step === "review") {
    stage = "review";
    content = (
      <div className="flex flex-col gap-5">
        <Card>
          <CardBody className="flex flex-col gap-5">
            <div>
              <p className="kicker">You are sending</p>
              <p className="mt-1 font-display text-4xl font-semibold text-ink">
                {formatUsd(amountUsd)}{" "}
                <span className="text-2xl text-ink-faint">{ASSET_CODE}</span>
              </p>
            </div>

            <dl className="flex flex-col divide-y divide-line border-t border-line">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-ink-soft">To</dt>
                <dd className="text-sm text-ink">
                  {recipientName ? `${recipientName}, ` : ""}
                  <span className="font-mono text-xs">{truncateAddress(destination, 6)}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-ink-soft">Note</dt>
                <dd className="max-w-[60%] truncate text-sm text-ink">{note || "None"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-ink-soft">This can become</dt>
                <dd className="flex flex-wrap justify-end gap-1.5">
                  {preview?.allowed.map((entry) => (
                    <RarityBadge key={entry.rarity} rarity={entry.rarity} />
                  ))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-ink-soft">Network</dt>
                <dd>
                  <Tag>{wallet.networkLabel}</Tag>
                </dd>
              </div>
            </dl>

            {error ? (
              <ErrorNote>
                {error}
                <span className="mt-1 block text-xs font-medium">
                  Nothing was charged — fix it and try again.
                </span>
              </ErrorNote>
            ) : null}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-3">
          <Button variant="accent" size="lg" onClick={pay} disabled={retrying}>
            Pay with Stellar
          </Button>
          <Button variant="ghost" onClick={() => setStep("form")}>
            Back
          </Button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-6">
        <Card>
          <CardBody className="flex flex-col gap-6">
            <Field
              label="Amount"
              htmlFor="amount"
              hint={`${ASSET_CODE}, ${RARITY_CONFIG.minTransferUsd.toFixed(2)} min`}
            >
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden>
                    $
                  </span>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="pl-8 text-lg font-medium"
                    placeholder="25.00"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      aria-pressed={amountUsd === preset}
                      className={cn(
                        "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        amountUsd === preset
                          ? "border-ink bg-ink text-paper"
                          : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted",
                      )}
                    >
                      {formatUsd(preset)}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            {amount && !amountValid ? (
              <ErrorNote>
                Enter an amount between {formatUsd(RARITY_CONFIG.minTransferUsd)} and{" "}
                {formatUsd(RARITY_CONFIG.maxTransferUsd)}.
              </ErrorNote>
            ) : null}

            {preview ? (
              <div className="rounded-2xl border border-line bg-surface-muted px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="kicker">{preview.band.label} band</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {preview.allowed.map((entry) => (
                      <span key={entry.rarity} className="font-medium text-ink">
                        {RARITY_META[entry.rarity].label}
                        <span className="ml-1 text-ink-faint">
                          {Math.round(entry.probability * 100)}%
                        </span>
                      </span>
                    ))}
                  </p>
                </div>
                {preview.goldenOtterChance > 0 ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-legendary-soft px-2.5 py-1 text-[11px] font-semibold text-legendary-ink">
                    Golden otter, {preview.goldenOtterChance * 100}% chance
                  </p>
                ) : null}
              </div>
            ) : null}

            <Field
              label="Recipient"
              htmlFor="destination"
              hint="Stellar address"
            >
              <div className="flex flex-col gap-2">
                <Input
                  id="destination"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="G…"
                  className="font-mono text-sm"
                  spellCheck={false}
                />
                {wallet.address ? (
                  <button
                    type="button"
                    onClick={() => setDestination(wallet.address ?? "")}
                    className="min-h-9 self-start rounded-lg px-1 text-left text-xs font-medium text-mocha hover:underline"
                  >
                    Use my own address
                  </button>
                ) : null}
                {destination && !destinationValid ? (
                  <p className="text-xs text-coral-ink">
                    That does not look like a Stellar address.
                  </p>
                ) : null}
                {destinationValid ? (
                  <p className="text-xs text-ink-soft">
                    Testnet: if this address has no account yet, we open it for you in the same
                    payment (+1 XLM reserve).
                  </p>
                ) : null}
              </div>
            </Field>

            <Field label="Who is it for?" htmlFor="recipientName" hint="optional">
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Luis"
                maxLength={80}
              />
            </Field>

            <Field label="Note" htmlFor="note" hint="optional">
              <Textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Dinner with Luis"
                maxLength={120}
              />
            </Field>
          </CardBody>
        </Card>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        {!wallet.address ? (
          <ErrorNote>
            Connect a wallet first. The transaction is signed by your wallet, never by Tredie.
          </ErrorNote>
        ) : null}

        <Button
          variant="accent"
          size="lg"
          disabled={!wallet.address || !amountValid || !destinationValid}
          onClick={() => {
            setError(null);
            setStep("review");
          }}
        >
          Continue
        </Button>

        <p className="text-center text-xs text-ink-soft">
          {txHash ? "Previous payment reused." : "Rarity is decided by the amount you send."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {stage ? <FlowSteps current={stage} /> : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const FLOW_STEPS: { id: FlowStage; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "pay", label: "Pay" },
];

/** The guided bit: a small progress row so each step knows where it is. */
function FlowSteps({ current }: { current: FlowStage }) {
  const activeIndex = FLOW_STEPS.findIndex((item) => item.id === current);
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2" aria-label="Create a Tredie progress">
      {FLOW_STEPS.map((item, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "todo";
        return (
          <li
            key={item.id}
            aria-current={state === "active" ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              state === "active" && "border-line-strong bg-surface text-ink shadow-soft",
              state === "done" && "border-line bg-surface text-ink-soft",
              state === "todo" && "border-line bg-surface/60 text-ink-soft",
            )}
          >
            <span
              className={cn(
                "grid size-4 place-items-center rounded-full text-[10px] font-semibold",
                state === "active" && "bg-ink text-paper",
                state === "done" && "bg-mocha-soft text-mocha",
                state === "todo" && "bg-surface-muted text-ink-soft",
              )}
              aria-hidden
            >
              {state === "done" ? <Check className="size-3" /> : index + 1}
            </span>
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

/** Paying is two confident checkpoints, not a spinner in the dark. */
function PayingState({
  stage,
  walletLabel,
  fundStatus,
}: {
  stage: PayStage;
  walletLabel: string;
  fundStatus: FundStatus;
}) {
  const funding = fundStatus === "funding";
  const rows: { id: string; title: string; detail: string; state: string }[] = [
    ...(fundStatus !== "idle"
      ? [
          {
            id: "fund",
            title: fundStatus === "funded" ? "Test XLM ready" : "Adding test XLM",
            detail: "Testnet only — your wallet is topped up automatically.",
            state: fundStatus === "funded" ? "done" : "active",
          },
        ]
      : []),
    {
      id: "sign",
      title: `Approve in ${walletLabel}`,
      detail: "Your wallet signs it — Tredie never holds your keys.",
      state: funding ? "idle" : stage === "sign" ? "active" : "done",
    },
    {
      id: "submit",
      title: "Send it on Stellar",
      detail: "Already approved — we take it from here.",
      state: stage === "submit" ? "active" : "idle",
    },
  ];

  return (
    <div role="status" className="flex flex-col gap-5 py-2">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-mocha" aria-hidden />
        <p className="font-display text-lg font-semibold text-ink">
          {funding
            ? "Getting your wallet ready"
            : stage === "sign"
              ? "Waiting for your wallet"
              : "Sending on Stellar"}
        </p>
      </div>

      <ol className="flex flex-col gap-4 rounded-3xl border border-line bg-surface-muted p-4 sm:p-5">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                row.state === "done" && "bg-mocha-soft text-mocha",
                row.state === "active" && "bg-surface text-mocha shadow-soft",
                row.state === "idle" && "border border-line bg-surface",
              )}
              aria-hidden
            >
              {row.state === "done" ? (
                <Check className="size-3" />
              ) : row.state === "active" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
            </span>
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  row.state === "idle" ? "text-ink-soft" : "text-ink",
                )}
              >
                {row.title}
              </p>
              <p className="text-xs text-ink-soft">{row.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-center text-xs text-ink-soft">
        Under a minute — we will verify it before anything is born.
      </p>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral-soft p-3 text-sm text-coral-ink"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
