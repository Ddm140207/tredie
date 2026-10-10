import type { CreatureAttributeRecord, LeaderboardEntry, TredieRecord } from "@/types";

export interface CreateTredieInput {
  ownerAddress: string;
  stellarTransactionId: string;
  stellarNetwork: string;
  stellarLedger: number | null;
  stellarPayer: string | null;
  stellarAddress: string | null;
  recipient: string | null;
  note: string | null;
  amount: number;
  asset: string;
  attributes: CreatureAttributeRecord;
}

export type UpdateTredieInput = Partial<
  Pick<
    TredieRecord,
    "imageUrl" | "imageProvider" | "status" | "errorMessage" | "name" | "personality"
  >
>;

/** Full persisted wallet account row, including the PIN material. */
export interface WalletAccountRow {
  walletAddress: string;
  displayName: string | null;
  pinHash: string;
  pinSalt: string;
  network: string;
  createdAt: string;
  lastUnlockedAt: string | null;
}

export interface CreateWalletAccountInput {
  walletAddress: string;
  displayName: string | null;
  pinHash: string;
  pinSalt: string;
  network: string;
}

export interface TredieRepository {
  create(input: CreateTredieInput): Promise<TredieRecord>;
  getById(id: string): Promise<TredieRecord | null>;
  getByTxHash(txHash: string): Promise<TredieRecord | null>;
  listByOwner(ownerAddress: string): Promise<TredieRecord[]>;
  update(id: string, patch: UpdateTredieInput): Promise<TredieRecord>;
  countByOwner(ownerAddress: string): Promise<number>;

  getWalletAccount(walletAddress: string): Promise<WalletAccountRow | null>;
  createWalletAccount(input: CreateWalletAccountInput): Promise<WalletAccountRow>;
  touchWalletUnlock(walletAddress: string): Promise<void>;
  countPinAttempts(walletAddress: string, sinceMs: number): Promise<number>;
  recordPinAttempt(walletAddress: string, attemptedAtMs: number): Promise<void>;
  clearPinAttempts(walletAddress: string): Promise<void>;

  getLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
  getBestTredie(walletAddress: string): Promise<TredieRecord | null>;
}