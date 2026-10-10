"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { IS_TESTNET, STELLAR_NETWORK_LABEL } from "@/config/site";
import type { WalletAccountRecord } from "@/types";

/**
 * Wallet access.
 *
 * Two real signers, no fake ones:
 *
 *  - `freighter`  the browser extension wallet
 *  - `local-test` a keypair generated in this browser tab, used only on testnet
 *
 * The local signer exists so the whole product loop can be demonstrated without
 * the extension installed. It still produces a genuine Stellar transaction that
 * is confirmed on testnet and verified on the server, and its secret key never
 * leaves the browser or reaches the server.
 *
 * On testnet every wallet is funded automatically right after it connects, so
 * the demo never dies on "this account does not exist". The server call behind
 * it is idempotent, so re-connecting an already funded wallet costs one lookup
 * and sends nothing.
 */

export type WalletMode = "freighter" | "local-test";
export type WalletStatus = "idle" | "connecting" | "connected" | "error";
/** How the automatic testnet top-up is going. Stays `idle` on public network. */
export type FundStatus = "idle" | "funding" | "funded" | "error";

interface FreighterTransaction {
  signedTx: string;
  signature: string;
}

interface FreighterApi {
  isConnected(): Promise<boolean>;
  connect(): Promise<void>;
  getPublicKey(): Promise<string>;
  signTransaction(
    xdr: string,
    options?: { networkPassphrase?: string },
  ): Promise<FreighterTransaction>;
}

declare global {
  interface Window {
    freighter?: FreighterApi;
  }
}

const LOCAL_KEY_STORAGE = "tredie.localTestSigner";

/** The secret never leaves this tab and is only read on demand. */
function readLocalSecret() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(LOCAL_KEY_STORAGE);
}

function subscribeToNothing() {
  return () => {};
}

interface WalletContextValue {
  status: WalletStatus;
  address: string | null;
  mode: WalletMode | null;
  error: string | null;
  networkLabel: string;
  isTestnet: boolean;
  hasFreighter: boolean;
  fundStatus: FundStatus;
  /** Native XLM balance reported by the last successful funding call. */
  fundBalance: string | null;
  fundError: string | null;
  /** The wallet unlocked in this browser (from the signed cookie), if any. */
  account: WalletAccountRecord | null;
  /** False until the first `/api/wallet/me` round-trip finishes. */
  accountReady: boolean;
  connect: (mode: WalletMode) => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
  fundDemoAccount: () => Promise<void>;
  /** Resolves once the connected wallet holds test XLM. No-op on public network. */
  ensureFunded: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  unlockWallet: (publicKey: string, pin: string) => Promise<void>;
  registerWallet: (publicKey: string, pin: string, displayName?: string) => Promise<void>;
  logoutWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [mode, setMode] = useState<WalletMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fundStatus, setFundStatus] = useState<FundStatus>("idle");
  const [fundBalance, setFundBalance] = useState<string | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);
  const [account, setAccount] = useState<WalletAccountRecord | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  /** One funding call per address at a time, so a double click sends nothing twice. */
  const fundAttempt = useRef<{ publicKey: string; promise: Promise<void> } | null>(null);

  const hasFreighter = useSyncExternalStore(
    subscribeToNothing,
    () => Boolean(window.freighter),
    () => false,
  );

  const disconnect = useCallback(() => {
    setAddress(null);
    setMode(null);
    setStatus("idle");
    setFundStatus("idle");
    setFundBalance(null);
    setFundError(null);
    setAccount(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(LOCAL_KEY_STORAGE);
    }
  }, []);

  /** Refreshes which wallet, if any, this browser has unlocked. */
  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet/me", { cache: "no-store" });
      const payload = (await response.json()) as {
        account?: WalletAccountRecord | null;
      };
      setAccount(payload.account ?? null);
    } catch {
      setAccount(null);
    } finally {
      setAccountReady(true);
    }
  }, []);

  const accountCall = useCallback(
    async (path: string, options: RequestInit) => {
      const response = await fetch(path, options);
      const payload = (await response.json()) as {
        account?: WalletAccountRecord | null;
        error?: string;
      };
      if (!response.ok || !payload.account) {
        throw new Error(payload.error ?? "That did not work. Try again.");
      }
      setAccount(payload.account);
      setAccountReady(true);
    },
    [],
  );

  const unlockWallet = useCallback(
    (publicKey: string, pin: string) =>
      accountCall("/api/wallet/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, pin }),
      }),
    [accountCall],
  );

  const registerWallet = useCallback(
    (publicKey: string, pin: string, displayName?: string) =>
      accountCall("/api/wallet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, pin, displayName }),
      }),
    [accountCall],
  );

  const logoutWallet = useCallback(async () => {
    try {
      await fetch("/api/wallet/logout", { method: "POST" });
    } catch {
      // The cookie is gone client-side regardless; ignore.
    }
    setAccount(null);
  }, []);

  const fundAccount = useCallback((publicKey: string): Promise<void> => {
    const inFlight = fundAttempt.current;
    if (inFlight && inFlight.publicKey === publicKey) return inFlight.promise;

    const promise = (async () => {
      setFundStatus("funding");
      setFundError(null);
      try {
        const response = await fetch("/api/stellar/fund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey }),
        });
        const payload = (await response.json()) as { error?: string; balance?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not fund that account.");
        setFundBalance(payload.balance ?? null);
        setFundStatus("funded");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Could not fund that account.";
        setFundError(message);
        setFundStatus("error");
        throw new Error(message);
      } finally {
        if (fundAttempt.current?.publicKey === publicKey) fundAttempt.current = null;
      }
    })();

    fundAttempt.current = { publicKey, promise };
    return promise;
  }, []);

  const connect = useCallback(
    async (requested: WalletMode) => {
      setStatus("connecting");
      setError(null);

      try {
        if (requested === "local-test") {
          if (!IS_TESTNET) {
            throw new Error("The local test signer is only available on testnet.");
          }
          const { Keypair } = await import("@stellar/stellar-sdk");
          const secret = readLocalSecret() ?? Keypair.random().secret();
          window.sessionStorage.setItem(LOCAL_KEY_STORAGE, secret);
          const publicKey = Keypair.fromSecret(secret).publicKey();
          setAddress(publicKey);
          setMode("local-test");
          setStatus("connected");
          void refreshAccount();
          void fundAccount(publicKey).catch(() => {});
          return;
        }

        if (!window.freighter) {
          throw new Error(
            "Freighter is not installed. Install the extension, or use the local test signer.",
          );
        }

        await window.freighter.connect();
        const publicKey = await window.freighter.getPublicKey();
        setAddress(publicKey);
        setMode("freighter");
        setStatus("connected");
        void refreshAccount();
        if (IS_TESTNET) void fundAccount(publicKey).catch(() => {});
      } catch (caught) {
        setStatus("error");
        setAddress(null);
        setMode(null);
        setError(
          caught instanceof Error ? caught.message : "Could not connect that wallet.",
        );
      }
    },
    [fundAccount, refreshAccount],
  );

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase: string) => {
      if (mode === "freighter") {
        if (!window.freighter) throw new Error("Freighter is not available.");
        const { signedTx } = await window.freighter.signTransaction(xdr, {
          networkPassphrase,
        });
        return signedTx;
      }

      if (mode === "local-test") {
        if (!IS_TESTNET) throw new Error("The local test signer is testnet only.");
        const secret = readLocalSecret();
        if (!secret) throw new Error("The local test signer is not ready.");
        const { Keypair, TransactionBuilder } = await import("@stellar/stellar-sdk");
        const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase);
        transaction.sign(Keypair.fromSecret(secret));
        return transaction.toXDR();
      }

      throw new Error("Connect a wallet first.");
    },
    [mode],
  );

  /** Manual retry affordance; the automatic run on connect uses the same path. */
  const fundDemoAccount = useCallback(async () => {
    if (!IS_TESTNET) {
      throw new Error("Test funding is only available on testnet.");
    }
    if (!address) {
      throw new Error("Connect a wallet first.");
    }
    await fundAccount(address);
  }, [address, fundAccount]);

  const ensureFunded = useCallback(async () => {
    if (!IS_TESTNET || !address) return;
    if (fundStatus === "funded") return;
    await fundAccount(address);
  }, [address, fundStatus, fundAccount]);

  // Restore the unlocked wallet (if the cookie survived) right after mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { account?: WalletAccountRecord | null }) => {
        if (!cancelled) setAccount(payload.account ?? null);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      })
      .finally(() => {
        if (!cancelled) setAccountReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      address,
      mode,
      error,
      networkLabel: STELLAR_NETWORK_LABEL,
      isTestnet: IS_TESTNET,
      hasFreighter,
      fundStatus,
      fundBalance,
      fundError,
      account,
      accountReady,
      connect,
      disconnect,
      signTransaction,
      fundDemoAccount,
      ensureFunded,
      refreshAccount,
      unlockWallet,
      registerWallet,
      logoutWallet,
    }),
    [
      status,
      address,
      mode,
      error,
      hasFreighter,
      fundStatus,
      fundBalance,
      fundError,
      account,
      accountReady,
      connect,
      disconnect,
      signTransaction,
      fundDemoAccount,
      ensureFunded,
      refreshAccount,
      unlockWallet,
      registerWallet,
      logoutWallet,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <WalletProvider>.");
  return context;
}