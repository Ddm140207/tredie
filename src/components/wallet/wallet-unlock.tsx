"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useWallet } from "@/components/wallet/wallet-provider";
import { otterTag, truncateAddress } from "@/lib/utils";

const PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;
const PIN_PATTERN = /^\d{4}$/;

type CheckState = "idle" | "registered" | "new";

/**
 * The whole-app PIN gate. The wallet is the account: this card either sets a
 * first PIN for the connected wallet or asks for the existing one, then the
 * server issues a signed, HttpOnly session cookie. Honest footer included —
 * this is a product lock, not a security boundary.
 */
export function WalletUnlock({ onUnlocked }: { onUnlocked?: () => void }) {
  const { address, account, registerWallet, unlockWallet } = useWallet();

  const [useOtherAddress, setUseOtherAddress] = useState(false);
  const [typedAddress, setTypedAddress] = useState("");
  const [status, setStatus] = useState<{
    state: CheckState;
    error: string | null;
    checkedFor: string;
  }>({ state: "idle", error: null, checkedFor: "" });
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(
    () => (useOtherAddress ? typedAddress.trim() : address ?? ""),
    [useOtherAddress, typedAddress, address],
  );
  const targetValid = PUBLIC_KEY_PATTERN.test(target);
  const alreadyUnlocked = Boolean(account && account.walletAddress === target);

  useEffect(() => {
    if (!targetValid || alreadyUnlocked) return;
    let cancelled = false;
    fetch(`/api/wallet/status?publicKey=${encodeURIComponent(target)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { registered?: boolean };
        if (!cancelled) {
          setStatus({
            state: payload.registered ? "registered" : "new",
            error: null,
            checkedFor: target,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ state: "idle", error: "Could not look up this wallet. Try again.", checkedFor: target });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [target, targetValid, alreadyUnlocked]);

  const resolved = status.checkedFor === target;
  const check: CheckState = alreadyUnlocked ? "registered" : resolved ? status.state : "idle";
  const checkError = resolved ? status.error : null;
  const checking = targetValid && !alreadyUnlocked && check === "idle" && !checkError;

  const pinValid = PIN_PATTERN.test(pin);
  const confirmValid = pin === pinConfirm;
  const canSubmit =
    alreadyUnlocked ||
    (targetValid &&
      pinValid &&
      (check === "registered" || (check === "new" && confirmValid)));

  async function submit() {
    if (alreadyUnlocked) {
      onUnlocked?.();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (check === "registered") {
        await unlockWallet(target, pin);
      } else {
        await registerWallet(target, pin, displayName.trim() || undefined);
      }
      onUnlocked?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardBody className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mocha-soft text-mocha">
            <LockKeyhole className="size-6" aria-hidden />
          </span>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-ink">
              {alreadyUnlocked
                ? "Already unlocked"
                : check === "new"
                  ? "Give this wallet a PIN"
                  : checking
                    ? "Checking this wallet…"
                    : "Unlock this wallet"}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Your collection is private. A four-digit PIN unlocks it in this
              browser — the transaction itself still runs on your wallet.
            </p>
          </div>
        </div>

        {address && !useOtherAddress ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface-muted px-4 py-3">
            <span className="font-mono text-xs text-ink-soft">{truncateAddress(address, 8)}</span>
            <button
              type="button"
              onClick={() => setUseOtherAddress(true)}
              className="text-xs font-medium text-mocha hover:underline"
            >
              Use a different wallet
            </button>
          </div>
        ) : (
          <Field label="Wallet address" htmlFor="unlock-address">
            <Input
              id="unlock-address"
              value={typedAddress}
              onChange={(event) => setTypedAddress(event.target.value)}
              placeholder="G…"
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            {address ? (
              <button
                type="button"
                onClick={() => setUseOtherAddress(false)}
                className="min-h-9 self-start rounded-lg px-1 text-left text-xs font-medium text-mocha hover:underline"
              >
                Back to my connected wallet
              </button>
            ) : null}
          </Field>
        )}

        {!targetValid ? (
          <p className="flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral-soft p-3 text-sm text-coral-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>That does not look like a Stellar address.</span>
          </p>
        ) : null}

        {check === "new" ? (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-muted p-4">
              <Field label="New PIN" htmlFor="unlock-pin" hint="4 digits">
                <Input
                  id="unlock-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="····"
                  className="font-mono text-center tracking-[0.5em]"
                />
              </Field>
              <Field label="Confirm PIN" htmlFor="unlock-pin-confirm">
                <Input
                  id="unlock-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pinConfirm}
                  onChange={(event) =>
                    setPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="····"
                  className="font-mono text-center tracking-[0.5em]"
                />
              </Field>
              <Field
                label="Leaderboard name"
                htmlFor="unlock-display-name"
                hint="optional"
              >
                <Input
                  id="unlock-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={otterTag(target)}
                  maxLength={32}
                />
                <p className="text-xs text-ink-faint">
                  Public, only on the leaderboard. Blank uses {otterTag(target)}.
                </p>
              </Field>
            </div>
          </>
        ) : check === "registered" && !alreadyUnlocked ? (
          <Field label="PIN" htmlFor="unlock-pin" hint="4 digits">
            <Input
              id="unlock-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="····"
              className="text-center font-mono tracking-[0.5em]"
            />
          </Field>
        ) : null}

        {checking ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="size-4 animate-spin text-mocha" aria-hidden />
            Checking…
          </p>
        ) : null}

        {checkError ? (
          <p className="flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral-soft p-3 text-sm text-coral-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{checkError}</span>
          </p>
        ) : null}

        {!pinValid || (check === "new" && !confirmValid) ? (
          <p className="text-xs text-ink-soft">
            {check === "new" && pin && !confirmValid
              ? "PINs don't match yet."
              : "Four digits — typed fast at a counter is fine, easy to guess is not."}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral-soft p-3 text-sm text-coral-ink"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        ) : null}

        <Button variant="accent" size="lg" onClick={() => void submit()} disabled={!canSubmit || busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {check === "new" ? "Setting your PIN…" : "Unlocking…"}
            </>
          ) : alreadyUnlocked ? (
            "Open my collection"
          ) : check === "new" ? (
            "Set PIN & unlock"
          ) : (
            "Unlock"
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-ink-faint">
          A product lock — your wallet signs transactions, and the PIN keeps this
          browser&apos;s view of your collection to you. Testnet, so losing it is no
          great tragedy.
        </p>
      </CardBody>
    </Card>
  );
}