export type Rarity = "RARE" | "EPIC" | "LEGENDARY";

export type Species = "ROCK" | "FISH" | "OTTER";

export type TredieStatus = "generating" | "ready" | "failed";

export interface ColorDef {
  id: string;
  name: string;
  hex: string;
}

export interface NamedDef {
  id: string;
  name: string;
  prompt: string;
}

export interface MaterialDef extends NamedDef {
  weight: number;
  finish: "matte" | "glossy" | "metallic" | "iridescent" | "ceramic";
  baseHex: string;
  highlightHex: string;
}

export interface CreatureAttributeRecord {
  bandId: string;
  rarity: Rarity;
  species: Species;
  isGolden: boolean;
  primaryColor: string;
  primaryColorHex: string;
  secondaryColor: string;
  secondaryColorHex: string;
  material: string;
  expression: string;
  accessory: string | null;
  specialFeature: string | null;
  personality: string;
  name: string;
}

export interface TredieRecord {
  id: string;
  ownerAddress: string;
  name: string;
  species: Species;
  rarity: Rarity;
  isGolden: boolean;
  personality: string;
  imageUrl: string | null;
  imageProvider: string | null;
  amount: number;
  asset: string;
  recipient: string | null;
  note: string | null;
  stellarTransactionId: string;
  stellarNetwork: string;
  stellarLedger: number | null;
  stellarPayer: string | null;
  stellarAddress: string | null;
  status: TredieStatus;
  errorMessage: string | null;
  createdAt: string;
  attributes: CreatureAttributeRecord;
}

export interface VerifiedPayment {
  txHash: string;
  ledger: number;
  createdAt: string;
  successful: boolean;
  amount: string;
  assetCode: string;
  assetIssuer: string;
  from: string;
  to: string;
}

export interface BirthPayload {
  rarity: Rarity;
  species: Species;
  isGolden: boolean;
  bandId: string;
  allowedRarities: Rarity[];
}

/** The public shape of a wallet PIN account. Never carries PIN material. */
export interface WalletAccountRecord {
  walletAddress: string;
  displayName: string | null;
  /** `Otter #XXXX` fallback, derived from the address's last characters. */
  otterTag: string;
  createdAt: string;
  lastUnlockedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  /** Full public key — the UI truncates; never rendered whole. */
  walletAddress: string;
  displayName: string | null;
  otterTag: string;
  score: number;
  total: number;
  golden: number;
  legendary: number;
  epic: number;
  rare: number;
  totalSent: number;
  topTredie: TredieRecord | null;
}