import {
  Account,
  Asset,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { z } from "zod";
import { getStellarSettings, isNativeAsset } from "@/services/stellar/config";
import type { VerifiedPayment } from "@/types";

/**
 * All Stellar access lives behind this module. The UI never talks to Horizon.
 *
 * Transaction construction happens on the server so that the payment
 * parameters are authoritative. The wallet only signs the XDR it is handed.
 */

export const publicKeySchema = z.string().regex(/^G[A-Z2-7]{55}$/, "Not a Stellar public key");

export const buildPaymentSchema = z.object({
  senderPublicKey: publicKeySchema,
  destination: publicKeySchema,
  amountUsd: z.number().finite().positive(),
  note: z.string().trim().max(120).optional().default(""),
});

export type BuildPaymentInput = z.infer<typeof buildPaymentSchema>;

/** Amount in the smallest unit, as a string. USDC has 7 decimals. */
export function toAssetAmount(amountUsd: number): string {
  const [whole = "0", fraction = ""] = String(amountUsd).split(".");
  const padded = `${fraction}0000000`.slice(0, 7);
  const normalized = whole.replace(/^0+(?=\d)/, "");
  return `${normalized}.${padded}`;
}

function fromAssetAmount(amount: string): number {
  return Number(amount);
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance?: string;
}

export interface AccountState {
  account: Account;
  trustlines: Set<string>;
}

export async function fetchAccount(publicKey: string): Promise<Account> {
  return (await fetchAccountState(publicKey)).account;
}

export async function fetchAccountState(publicKey: string): Promise<AccountState> {
  const { horizonUrl, assetCode, assetIssuer } = getStellarSettings();
  const response = await fetch(`${horizonUrl}/accounts/${publicKey}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new StellarError(
      response.status === 404
        ? "That wallet does not exist on this network yet."
        : "Stellar could not be reached. Try again in a moment.",
      response.status,
    );
  }
  const account = (await response.json()) as {
    sequence: string;
    account_id: string;
    balances?: HorizonBalance[];
  };

  const trustlines = new Set(
    (account.balances ?? [])
      .filter(
        (balance) =>
          balance.asset_type.startsWith("credit_alphanum") &&
          balance.asset_code === assetCode &&
          balance.asset_issuer === assetIssuer,
      )
      .map((balance) => `${balance.asset_code}:${balance.asset_issuer}`),
  );

  return { account: new Account(account.account_id, account.sequence), trustlines };
}

export class StellarError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "StellarError";
  }
}

export interface BuiltPayment {
  xdr: string;
  networkPassphrase: string;
  assetCode: string;
  assetIssuer: string;
  amount: string;
  sourceAccount: string;
  destination: string;
  /** True when the recipient has no account yet and one is opened inside this transaction. */
  createsAccount: boolean;
}

/**
 * Horizon 404s when an account does not exist on the network. A payment to a
 * missing account always fails, so the build step opens it first with the
 * minimum starting balance. Anything other than a clear yes/no is surfaced so
 * the client can retry instead of submitting a doomed transaction.
 */
async function recipientHasNoAccount(destination: string): Promise<boolean> {
  const { horizonUrl } = getStellarSettings();
  const response = await fetch(`${horizonUrl}/accounts/${destination}`, {
    cache: "no-store",
  });
  if (response.status === 404) return true;
  if (response.ok) {
    const account = (await response.json()) as {
      balances?: Array<{ balance?: string }>;
    };
    const nativeBalance = Number(
      account.balances?.find((balance) => balance.balance)?.balance ?? "0",
    );
    // An existing account with no spendable balance still cannot receive the
    // payment amount in a single transfer unless it is created fresh.
    return nativeBalance < 1;
  }
  throw new StellarError(
    "Could not check the recipient account on Stellar. Try again in a moment.",
    502,
  );
}

export async function buildPayment(input: BuildPaymentInput): Promise<BuiltPayment> {
  const parsed = buildPaymentSchema.parse(input);
  const settings = getStellarSettings();
  const { account: source, trustlines } = await fetchAccountState(parsed.senderPublicKey);
  const native = isNativeAsset(settings);
  const asset = native ? Asset.native() : new Asset(settings.assetCode, settings.assetIssuer);
  const amount = toAssetAmount(parsed.amountUsd);
  const hasTrustline = native || trustlines.has(`${settings.assetCode}:${settings.assetIssuer}`);

  const builder = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: settings.networkPassphrase,
  });

  const createsAccount = await recipientHasNoAccount(parsed.destination);

  if (!hasTrustline) {
    builder.addOperation(Operation.changeTrust({ asset }));
  }

  // A payment to a brand-new address fails op-level unless the account is
  // created in the same transaction. Opening it keeps "create an account, fund
  // it, try the app" walkable for any recipient the user types in.
  if (createsAccount) {
    builder.addOperation(
      Operation.createAccount({
        destination: parsed.destination,
        startingBalance: "1",
      }),
    );
  }

  builder
    .addOperation(
      Operation.payment({
        destination: parsed.destination,
        asset,
        amount,
      }),
    )
    .addMemo(Memo.text(`Tredie ${parsed.note || "a new friend"}`.slice(0, 120)))
    .setTimeout(180);

  const transaction = builder.build();

  return {
    xdr: transaction.toXDR(),
    networkPassphrase: settings.networkPassphrase,
    assetCode: settings.assetCode,
    assetIssuer: settings.assetIssuer,
    amount,
    sourceAccount: parsed.senderPublicKey,
    destination: parsed.destination,
    createsAccount,
  };
}

interface SubmitResult {
  hash: string;
  ledger?: number;
}

async function submitViaHorizon(signedXdr: string): Promise<SubmitResult | null> {
  const { horizonUrl } = getStellarSettings();
  const body = new URLSearchParams({ XDR: signedXdr });
  const response = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { hash: string; ledger: number }
    | {
        type?: string;
        title?: string;
        detail?: string;
        extras?: { result_codes?: { transaction?: string } };
      }
    | null;

  if (!payload) {
    return null;
  }
  if ("hash" in payload && typeof payload.hash === "string") {
    return { hash: payload.hash, ledger: payload.ledger };
  }

  const problem = payload as {
    title?: string;
    detail?: string;
    extras?: { result_codes?: { transaction?: string } };
  };

  if (problem.title === "Transaction Malformed") {
    return null;
  }

  const reason =
    problem.extras?.result_codes?.transaction ?? problem.detail ?? problem.title ?? "unknown error";
  throw new StellarError(`Stellar rejected the transaction: ${reason}`, response.status || 400);
}

interface RpcResponse {
  result?: {
    hash?: string;
    status?: string;
    error?: { code?: number; message?: string; data?: unknown };
  };
  error?: { message?: string };
}

async function submitViaRpc(signedXdr: string): Promise<SubmitResult> {
  const { rpcUrl, horizonUrl } = getStellarSettings();
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: { transaction: signedXdr },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as RpcResponse | null;
  const hash = payload?.result?.hash;
  const failure = payload?.result?.error ?? payload?.error;

  if (!hash) {
    throw new StellarError(
      `Stellar rejected the transaction: ${failure?.message ?? payload?.result?.status ?? "unknown error"}`,
      response.status || 400,
    );
  }

  const confirmed = await waitForTransaction(hash, horizonUrl);
  if (confirmed && !confirmed.successful) {
    throw new StellarError(
      `Stellar rejected the transaction: ${confirmed.result_code ?? "failed"}`,
      409,
    );
  }

  return { hash, ledger: confirmed?.ledger };
}

/**
 * Horizon's form-encoded POST /transactions is the canonical submission route,
 * but it is unreachable from some networks and proxies. Both routes below are
 * real submissions to stellar-core; the RPC route is only a transport fallback.
 */
export async function submitSignedTransaction(signedXdr: string): Promise<SubmitResult> {
  try {
    const viaHorizon = await submitViaHorizon(signedXdr);
    if (viaHorizon) {
      return viaHorizon;
    }
  } catch (error) {
    if (error instanceof StellarError && error.statusCode >= 400 && error.statusCode < 500) {
      throw error;
    }
  }

  return submitViaRpc(signedXdr);
}

interface HorizonTransaction {
  id: string;
  hash: string;
  successful: boolean;
  ledger: number;
  created_at: string;
  result_code?: string;
}

const POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 2500;

async function waitForTransaction(
  hash: string,
  horizonUrl: string,
): Promise<HorizonTransaction | null> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${horizonUrl}/transactions/${hash}`, { cache: "no-store" });
    if (response.ok) {
      return (await response.json()) as HorizonTransaction;
    }
    if (response.status !== 404) {
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return null;
}

interface HorizonOperation {
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
}

async function horizonGet<T>(path: string): Promise<T> {
  const { horizonUrl } = getStellarSettings();
  const response = await fetch(`${horizonUrl}${path}`, { cache: "no-store" });
  if (!response.ok) {
    // A 4xx from Horizon means the hash the client handed us cannot be found
    // or was rejected — that is a client error (404/400/429), not an upstream
    // outage. 5xx keeps its own status either way.
    throw new StellarError(
      `Stellar could not confirm this transaction (${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export interface VerifyPaymentInput {
  txHash: string;
  destination: string;
  amountUsd: number;
  sourcePublicKey: string;
}

/**
 * Server-side verification. Nothing here trusts a client supplied identifier
 * beyond using it to *look up* the transaction, and every field that ends up on a
 * Tredie comes from Stellar itself.
 */
export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment> {
  const settings = getStellarSettings();

  const transaction = await horizonGet<HorizonTransaction>(`/transactions/${input.txHash}`);
  if (!transaction.successful) {
    throw new StellarError("That transaction did not succeed on Stellar.", 409);
  }

  const operations = await horizonGet<{ _embedded: { records: HorizonOperation[] } }>(
    `/transactions/${input.txHash}/operations?limit=200`,
  );

  const expectedAmount = toAssetAmount(input.amountUsd);
  const native = isNativeAsset(settings);
  const matchesAsset = (op: HorizonOperation) =>
    native
      ? op.asset_type === "native"
      : op.asset_type?.startsWith("credit_alphanum") === true &&
        op.asset_code === settings.assetCode &&
        op.asset_issuer === settings.assetIssuer;

  const payment = operations._embedded.records.find(
    (op) =>
      op.type === "payment" &&
      op.from === input.sourcePublicKey &&
      op.to === input.destination &&
      matchesAsset(op),
  );

  if (!payment) {
    throw new StellarError(
      `No matching ${settings.assetCode} payment to that recipient was found in this transaction.`,
      409,
    );
  }

  if (fromAssetAmount(payment.amount ?? "0") + 1e-7 < fromAssetAmount(expectedAmount)) {
    throw new StellarError(
      "The confirmed amount is smaller than the amount shown on the review step.",
      409,
    );
  }

  return {
    txHash: transaction.hash,
    ledger: transaction.ledger,
    createdAt: transaction.created_at,
    successful: transaction.successful,
    amount: payment.amount ?? expectedAmount,
    assetCode: settings.assetCode,
    assetIssuer: settings.assetIssuer,
    from: payment.from ?? input.sourcePublicKey,
    to: payment.to ?? input.destination,
  };
}

/**
 * Balance a testnet wallet is topped up to. Friendbot hands a sponsor 10,000
 * XLM, so passing 9000 on keeps the whole band range, including the $2000+
 * abyss band, walkable in one payment.
 */
const DEMO_BALANCE_XLM = 9000;

export interface FundResult {
  ok: true;
  /** Native XLM balance the wallet holds once this call finishes. */
  balance: string;
  /** True when the wallet already had enough and nothing was sent. */
  alreadyFunded: boolean;
}

function formatXlm(amount: number): string {
  return String(Math.round(amount * 100) / 100);
}

/** Horizon 404 means no account yet; anything else is surfaced, never guessed. */
async function nativeBalanceOf(publicKey: string): Promise<number | null> {
  const { horizonUrl } = getStellarSettings();
  const response = await fetch(`${horizonUrl}/accounts/${publicKey}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new StellarError(
      "Stellar could not be reached. Try again in a moment.",
      502,
    );
  }
  const account = (await response.json()) as { balances?: HorizonBalance[] };
  const native = account.balances?.find((entry) => entry.asset_type === "native");
  return Number(native?.balance ?? "0");
}

/**
 * Testnet convenience: make a wallet demo-ready so the core loop can be walked
 * without a pre-funded wallet. Runs automatically whenever a wallet connects,
 * so it is idempotent — a wallet that already holds the demo balance is left
 * alone, an existing wallet that is short is topped up, and a brand new one is
 * opened. Funding always goes through a throwaway friendbot sponsor, because
 * friendbot only funds accounts that do not exist yet and a fresh account
 * cannot pay fees itself.
 */
export async function fundTestnetAccount(targetPublicKey: string): Promise<FundResult> {
  const destination = publicKeySchema.parse(targetPublicKey);
  const settings = getStellarSettings();
  if (settings.network !== "testnet") {
    throw new StellarError("Funding is only available on testnet.", 400);
  }

  const current = await nativeBalanceOf(destination);
  const topUp =
    current === null
      ? DEMO_BALANCE_XLM
      : Math.round((DEMO_BALANCE_XLM - current) * 100) / 100;
  if (current !== null && topUp <= 0) {
    return { ok: true, balance: formatXlm(current), alreadyFunded: true };
  }

  const friendbot = async (publicKey: string) => {
    const response = await fetch(
      `${settings.friendbotUrl}/?addr=${encodeURIComponent(publicKey)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new StellarError(
        response.status === 429
          ? "Testnet is handing out funds a little slowly right now. Try again in a minute."
          : "Friendbot could not fund that account.",
        response.status,
      );
    }
    await response.text();
  };

  const { Keypair } = await import("@stellar/stellar-sdk");
  const sponsor = Keypair.random();
  await friendbot(sponsor.publicKey());

  const sponsorAccount = await fetchAccount(sponsor.publicKey());
  const builder = new TransactionBuilder(sponsorAccount, {
    fee: "100",
    networkPassphrase: settings.networkPassphrase,
  });

  if (current === null) {
    builder.addOperation(
      Operation.createAccount({
        destination,
        startingBalance: formatXlm(DEMO_BALANCE_XLM),
      }),
    );
  } else {
    builder.addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount: formatXlm(topUp),
      }),
    );
  }

  const transaction = builder.setTimeout(180).build();
  transaction.sign(sponsor);
  await submitSignedTransaction(transaction.toXDR());

  return { ok: true, balance: formatXlm(DEMO_BALANCE_XLM), alreadyFunded: false };
}