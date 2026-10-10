"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, LogOut, LockKeyhole, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet, type WalletMode } from "@/components/wallet/wallet-provider";
import { truncateAddress } from "@/lib/utils";

export function WalletButton() {
  const {
    status,
    address,
    mode,
    error,
    networkLabel,
    isTestnet,
    hasFreighter,
    fundStatus,
    fundBalance,
    fundError,
    account,
    connect,
    disconnect,
    fundDemoAccount,
    logoutWallet,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unlocked = Boolean(address && account?.walletAddress === address);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options: { mode: WalletMode; title: string; detail: string; disabled?: boolean }[] = [
    {
      mode: "freighter",
      title: "Freighter",
      detail: hasFreighter
        ? isTestnet
          ? "Your extension — topped up with test XLM"
          : "Use your wallet extension"
        : "Extension not detected",
      disabled: !hasFreighter,
    },
    ...(isTestnet
      ? [
          {
            mode: "local-test" as WalletMode,
            title: "Local test signer",
            detail: "A throwaway key in this tab, funded for you",
          },
        ]
      : []),
  ];

  return (
    <div className="relative" ref={containerRef}>
      {address ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-muted"
        >
          <span className="size-2 rounded-full bg-mocha" aria-hidden />
          <span className="font-mono text-xs">{truncateAddress(address, 4)}</span>
          {mode === "local-test" ? (
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] text-ink-faint">
              test
            </span>
          ) : null}
          {!unlocked ? (
            <span className="rounded-full bg-coral-soft px-1.5 py-0.5 text-[10px] font-semibold text-coral-ink">
              locked
            </span>
          ) : null}
        </button>
      ) : (
        <Button variant="accent" size="sm" onClick={() => setOpen((value) => !value)}>
          <Wallet />
          Connect
        </Button>
      )}

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 animate-pop overflow-hidden rounded-3xl border border-line bg-surface p-2 shadow-lift">
          <p className="px-3 py-2 text-xs font-medium text-ink-faint">
            {networkLabel}
          </p>

          {address ? (
            <div className="p-1">
              <div className="rounded-2xl bg-surface-muted p-3">
                <p className="text-xs text-ink-faint">Connected address</p>
                <p className="mt-1 font-mono text-[11px] break-all text-ink-soft">{address}</p>
              </div>

              {isTestnet ? (
                <div className="mt-2 rounded-2xl bg-surface-muted p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0" aria-hidden>
                      {fundStatus === "funding" ? (
                        <Loader2 className="size-4 animate-spin text-mocha" />
                      ) : fundStatus === "funded" ? (
                        <Check className="size-4 text-mocha" />
                      ) : fundStatus === "error" ? (
                        <AlertCircle className="size-4 text-coral-ink" />
                      ) : (
                        <Sparkles className="size-4 text-ink-faint" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink-soft">
                        {fundStatus === "funding"
                          ? "Adding test XLM…"
                          : fundStatus === "funded"
                            ? fundBalance
                              ? `Ready · ${fundBalance} test XLM`
                              : "Ready to send test XLM"
                            : fundStatus === "error"
                              ? "Could not add test XLM"
                              : "Testnet wallet"}
                      </p>
                      {fundStatus === "error" && fundError ? (
                        <p className="mt-1 text-xs leading-relaxed text-coral-ink">{fundError}</p>
                      ) : null}
                      {fundStatus === "error" || fundStatus === "idle" ? (
                        <button
                          type="button"
                          onClick={() => void fundDemoAccount().catch(() => {})}
                          className="mt-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-surface-muted"
                        >
                          {fundStatus === "error" ? "Try again" : "Add test XLM"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {unlocked ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface-muted p-3">
                  <p className="text-xs text-ink-soft">
                    <span className="font-medium text-ink">
                      {account?.displayName || account?.otterTag || "Unlocked"}
                    </span>
                    <span className="block text-ink-faint">This browser has your PIN</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => void logoutWallet()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-surface-muted"
                  >
                    <LockKeyhole className="size-3" />
                    Lock
                  </button>
                </div>
              ) : (
                <div className="mt-2 rounded-2xl bg-coral-soft p-3">
                  <p className="text-xs leading-relaxed text-coral-ink">
                    Not unlocked in this browser yet — open the collection page to set
                    or enter your PIN.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-surface-muted"
              >
                <LogOut className="size-4" />
                Disconnect
              </button>
            </div>
          ) : (
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  disabled={option.disabled || status === "connecting"}
                  onClick={async () => {
                    await connect(option.mode);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-ink">{option.title}</span>
                  <span className="text-xs text-ink-faint">{option.detail}</span>
                </button>
              ))}
              {error ? <p className="px-3 py-2 text-xs text-coral-ink">{error}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}