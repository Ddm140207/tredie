import "server-only";
import { buildCreature } from "@/lib/core/creature";
import { portraitArt } from "@/config/portraits";
import { validateCreatureConfig } from "@/config/vocab";
import { getRepository } from "@/services/persistence";
import type { TredieRecord, VerifiedPayment } from "@/types";

/**
 * Orchestrates the two independent halves of the product:
 *
 *   1. the transfer (verified on Stellar) and the Tredie record
 *   2. the portrait, which is composed from fixed assets and can be rebuilt
 *      forever without ever moving money
 *
 * Because attributes are derived from the transaction hash and the portrait only
 * reads the stored record, a rebuild always reproduces the same creature.
 */

// Configuration invariants are checked once when this server module loads, so
// an accessory without art or an out-of-range probability is a boot failure
// rather than a creature that renders wrong much later. This module is
// server-only, so the check can never be pulled into a client bundle.
validateCreatureConfig();

export interface CreateFromPaymentInput {
  payment: VerifiedPayment;
  /** Human label for the recipient, e.g. "Luis". */
  recipientName: string | null;
  note: string | null;
  ownerAddress: string;
  network: string;
}

/**
 * Single-flight per transaction hash, in process.
 *
 * Two simultaneous submits for the same confirmed payment must not both pass
 * the "does it already exist" check. This serialises them locally; across
 * processes the database's UNIQUE(stellar_transaction_hash) constraint is the
 * authority, and a violation is converted into the same "return the existing
 * row" path below. The map entry is dropped once the task settles, so it never
 * grows past the number of concurrently creating transactions.
 */
const pendingCreates = new Map<string, Promise<unknown>>();

function withTxHashLock<T>(txHash: string, task: () => Promise<T>): Promise<T> {
  const previous = pendingCreates.get(txHash) ?? Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.then(() => undefined, () => undefined);
  pendingCreates.set(txHash, settled);
  return run.finally(() => {
    if (pendingCreates.get(txHash) === settled) pendingCreates.delete(txHash);
  });
}

/**
 * Pulls the driver-level fields (SQLSTATE, constraint name, detail) out of a
 * persistence failure so it can be logged and surfaced meaningfully. Postgres
 * puts them on the error object; other drivers simply leave them undefined.
 */
function persistenceDetails(error: unknown) {
  const source = (
    typeof error === "object" && error !== null ? error : {}
  ) as { code?: unknown; constraint?: unknown; detail?: unknown };
  return {
    code: typeof source.code === "string" ? source.code : undefined,
    constraint: typeof source.constraint === "string" ? source.constraint : undefined,
    detail: typeof source.detail === "string" ? source.detail : undefined,
    message: error instanceof Error ? error.message : String(error),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const details = persistenceDetails(error);
  return (
    details.code === "23505" ||
    (details.message.includes("duplicate key") && details.message.includes("unique constraint"))
  );
}

export async function createTredieFromPayment(input: CreateFromPaymentInput) {
  const repository = getRepository();
  const txHash = input.payment.txHash;

  // Everything below runs under the per-hash lock: the existence check and the
  // insert are one critical section, so a concurrent retry of the same payment
  // waits here and then reuses the row instead of racing it. Verification has
  // already happened on the caller's side; nothing below can move money.
  return withTxHashLock(txHash, async () => {
    // Idempotent by transaction hash: a retried submission never creates a
    // second Tredie for the same payment.
    const existing = await repository.getByTxHash(txHash);
    if (existing) return { tredie: existing, created: false };

    const { attributes, rarity } = buildCreature({
      txHash,
      amountUsd: Number(input.payment.amount),
    });

    try {
      const tredie = await repository.create({
        ownerAddress: input.ownerAddress,
        stellarTransactionId: txHash,
        stellarNetwork: input.network,
        stellarLedger: input.payment.ledger,
        stellarPayer: input.payment.from,
        stellarAddress: input.payment.to,
        recipient: input.recipientName,
        note: input.note,
        amount: Number(input.payment.amount),
        asset: input.payment.assetCode,
        attributes,
      });
      return { tredie, created: true, rarity };
    } catch (error) {
      // Lost a race against another process: the UNIQUE constraint fired, so a
      // row for this hash now exists. Return it as a normal "already created"
      // result (HTTP 200) instead of leaking a raw 500 to the client.
      if (isUniqueViolation(error)) {
        const winner = await repository.getByTxHash(txHash);
        if (winner) {
          console.warn("[tredie] duplicate create suppressed for", txHash, "->", winner.id);
          return { tredie: winner, created: false };
        }
      }

      // Keep the driver's result code visible in the logs (constraint name and
      // detail included) while giving the client a short, honest message.
      const details = persistenceDetails(error);
      console.error("[tredie] create failed for", txHash, details);
      throw new Error(`Could not save your Tredie (${details.code ?? "persistence error"}).`, {
        cause: error,
      });
    }
  });
}

/**
 * Resolves the Tredie's portrait. There is no image model: the portrait is a
 * fixed species asset plus an optional accessory, so this is deterministic and
 * cannot fail. Safe to call repeatedly — a ready Tredie is returned untouched.
 */
export async function generateImageFor(tredieId: string): Promise<TredieRecord> {
  const repository = getRepository();
  const tredie = await repository.getById(tredieId);
  if (!tredie) throw new Error(`Tredie not found: ${tredieId}`);
  if (tredie.status === "ready" && tredie.imageUrl) return tredie;

  return repository.update(tredieId, {
    imageUrl: portraitArt(tredie.species, tredie.isGolden),
    imageProvider: "portrait",
    status: "ready",
    errorMessage: null,
  });
}
