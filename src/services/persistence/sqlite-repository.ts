import { randomUUID } from "node:crypto";
import type { CreatureAttributeRecord, LeaderboardEntry, TredieRecord } from "@/types";
import { query, withTransaction } from "@/lib/db";
import { otterTag } from "@/lib/utils";
import type {
  CreateTredieInput,
  CreateWalletAccountInput,
  TredieRepository,
  UpdateTredieInput,
  WalletAccountRow,
} from "./repository";

interface CreatureAttributeRow {
  band_id: string;
  rarity: string;
  species: string;
  is_golden: number;
  primary_color: string;
  primary_color_hex: string;
  secondary_color: string;
  secondary_color_hex: string;
  material: string;
  expression: string;
  accessory: string | null;
  special_feature: string | null;
  personality: string;
  name: string;
}

type TredieRow = CreatureAttributeRow & {
  id: string;
  owner_address: string;
  tredie_name: string;
  tredie_species: string;
  tredie_rarity: string;
  tredie_is_golden: number;
  tredie_personality: string;
  image_url: string | null;
  image_provider: string | null;
  amount: number;
  asset: string;
  recipient: string | null;
  note: string | null;
  stellar_transaction_hash: string;
  stellar_network: string;
  stellar_ledger: number | null;
  stellar_payer: string | null;
  stellar_address: string | null;
  status: string;
  error_message: string | null;
  created_at: string | null;
};

const TREDIE_COLUMNS = `
  t.id, t.owner_address, t.name AS tredie_name, t.species AS tredie_species,
  t.rarity AS tredie_rarity, t.is_golden AS tredie_is_golden,
  t.personality AS tredie_personality, t.image_url, t.image_provider,
  t.amount, t.asset, t.recipient, t.note, t.stellar_transaction_hash,
  t.stellar_network, t.stellar_ledger, t.stellar_payer, t.stellar_address,
  t.status, t.error_message, t.created_at,
  a.band_id, a.rarity, a.species, a.is_golden, a.primary_color,
  a.primary_color_hex, a.secondary_color, a.secondary_color_hex,
  a.material, a.expression, a.accessory, a.special_feature,
  a.personality, a.name
`;

const TREDIE_FROM = `
  FROM tredies t
  JOIN creature_attributes a ON a.tredie_id = t.id
`;

/** Rarity tier weight used everywhere: golden > otter > fish > rock. */
const TIER_EXPR = `
  CASE
    WHEN t.is_golden = 1 THEN 100000
    WHEN t.rarity = 'LEGENDARY' THEN 1000
    WHEN t.rarity = 'EPIC' THEN 10
    ELSE 1
  END
`;

function mapAttributes(row: CreatureAttributeRow): CreatureAttributeRecord {
  return {
    bandId: row.band_id,
    rarity: row.rarity as CreatureAttributeRecord["rarity"],
    species: row.species as CreatureAttributeRecord["species"],
    isGolden: Boolean(row.is_golden),
    primaryColor: row.primary_color,
    primaryColorHex: row.primary_color_hex,
    secondaryColor: row.secondary_color,
    secondaryColorHex: row.secondary_color_hex,
    material: row.material,
    expression: row.expression,
    accessory: row.accessory,
    specialFeature: row.special_feature,
    personality: row.personality,
    name: row.name,
  };
}

function mapTredie(row: TredieRow): TredieRecord {
  return {
    id: row.id,
    ownerAddress: row.owner_address,
    name: row.tredie_name,
    species: row.tredie_species as TredieRecord["species"],
    rarity: row.tredie_rarity as TredieRecord["rarity"],
    isGolden: Boolean(row.tredie_is_golden),
    personality: row.tredie_personality,
    imageUrl: row.image_url,
    imageProvider: row.image_provider,
    amount: Number(row.amount),
    asset: row.asset,
    recipient: row.recipient,
    note: row.note,
    stellarTransactionId: row.stellar_transaction_hash,
    stellarNetwork: row.stellar_network,
    stellarLedger: row.stellar_ledger === null ? null : Number(row.stellar_ledger),
    stellarPayer: row.stellar_payer,
    stellarAddress: row.stellar_address,
    status: row.status as TredieRecord["status"],
    errorMessage: row.error_message,
    createdAt: String(row.created_at ?? ""),
    attributes: mapAttributes(row),
  };
}

export class SqliteRepository implements TredieRepository {
  async create(input: CreateTredieInput): Promise<TredieRecord> {
    const id = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO owners (wallet_address) VALUES (?)
         ON CONFLICT (wallet_address) DO NOTHING`,
        [input.ownerAddress],
      );

      const tredieId = randomUUID();

      await client.query(
        `INSERT INTO tredies (
           id, owner_address, name, species, rarity, is_golden, personality,
           image_url, image_provider, amount, asset, recipient, note,
           stellar_transaction_hash, stellar_network, stellar_ledger,
           stellar_payer, stellar_address, status, created_at
         ) VALUES (?,?,?,?,?,?,?,NULL,NULL,?,?,?,?,?,?,?,?,?,'generating',?)`,
        [
          tredieId,
          input.ownerAddress,
          input.attributes.name,
          input.attributes.species,
          input.attributes.rarity,
          input.attributes.isGolden ? 1 : 0,
          input.attributes.personality,
          input.amount,
          input.asset,
          input.recipient,
          input.note,
          input.stellarTransactionId,
          input.stellarNetwork,
          input.stellarLedger,
          input.stellarPayer,
          input.stellarAddress,
          new Date().toISOString(),
        ],
      );

      await client.query(
        `INSERT INTO creature_attributes (
           id, tredie_id, band_id, rarity, species, is_golden,
           primary_color, primary_color_hex, secondary_color, secondary_color_hex,
           material, expression, accessory, special_feature, personality, name
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          tredieId,
          input.attributes.bandId,
          input.attributes.rarity,
          input.attributes.species,
          input.attributes.isGolden ? 1 : 0,
          input.attributes.primaryColor,
          input.attributes.primaryColorHex,
          input.attributes.secondaryColor,
          input.attributes.secondaryColorHex,
          input.attributes.material,
          input.attributes.expression,
          input.attributes.accessory,
          input.attributes.specialFeature,
          input.attributes.personality,
          input.attributes.name,
        ],
      );

      return tredieId;
    });

    const created = await this.getById(id);
    if (!created) throw new Error("Tredie disappeared right after creation.");
    return created;
  }

  async getById(id: string): Promise<TredieRecord | null> {
    const rows = await query<TredieRow>(
      `SELECT ${TREDIE_COLUMNS} ${TREDIE_FROM} WHERE t.id = ?`,
      [id],
    );
    return rows[0] ? mapTredie(rows[0]) : null;
  }

  async getByTxHash(txHash: string): Promise<TredieRecord | null> {
    const rows = await query<TredieRow>(
      `SELECT ${TREDIE_COLUMNS} ${TREDIE_FROM} WHERE t.stellar_transaction_hash = ?`,
      [txHash],
    );
    return rows[0] ? mapTredie(rows[0]) : null;
  }

  async listByOwner(ownerAddress: string): Promise<TredieRecord[]> {
    const rows = await query<TredieRow>(
      `SELECT ${TREDIE_COLUMNS} ${TREDIE_FROM}
       WHERE t.owner_address = ?
       ORDER BY t.created_at DESC`,
      [ownerAddress],
    );
    return rows.map(mapTredie);
  }

  async update(id: string, patch: UpdateTredieInput): Promise<TredieRecord> {
    const assignments: string[] = [];
    const values: unknown[] = [];

    const push = (column: string, value: unknown) => {
      values.push(value);
      assignments.push(`${column} = ?`);
    };

    if (patch.imageUrl !== undefined) push("image_url", patch.imageUrl);
    if (patch.imageProvider !== undefined) push("image_provider", patch.imageProvider);
    if (patch.status !== undefined) push("status", patch.status);
    if (patch.errorMessage !== undefined) push("error_message", patch.errorMessage);
    if (patch.name !== undefined) push("name", patch.name);
    if (patch.personality !== undefined) push("personality", patch.personality);

    if (assignments.length > 0) {
      push("updated_at", new Date().toISOString());
      values.push(id);
      await query(
        `UPDATE tredies SET ${assignments.join(", ")} WHERE id = ?`,
        values,
      );
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Tredie not found: ${id}`);
    return updated;
  }

  async countByOwner(ownerAddress: string): Promise<number> {
    const rows = await query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM tredies WHERE owner_address = ?",
      [ownerAddress],
    );
    return Number(rows[0]?.count ?? 0);
  }

  // ── wallet PIN accounts ───────────────────────────────────────────────

  async getWalletAccount(walletAddress: string): Promise<WalletAccountRow | null> {
    const rows = await query<WalletAccountRow>(
      `SELECT wallet_address AS walletAddress,
              display_name AS displayName,
              pin_hash AS pinHash,
              pin_salt AS pinSalt,
              network AS network,
              created_at AS createdAt,
              last_unlocked_at AS lastUnlockedAt
       FROM wallet_accounts WHERE wallet_address = ?`,
      [walletAddress],
    );
    return rows[0] ?? null;
  }

  async createWalletAccount(
    input: CreateWalletAccountInput,
  ): Promise<WalletAccountRow> {
    await query(
      `INSERT INTO wallet_accounts (wallet_address, display_name, pin_hash, pin_salt, network)
       VALUES (?,?,?,?,?)`,
      [input.walletAddress, input.displayName, input.pinHash, input.pinSalt, input.network],
    );
    const created = await this.getWalletAccount(input.walletAddress);
    if (!created) throw new Error("Wallet account did not persist.");
    return created;
  }

  async touchWalletUnlock(walletAddress: string): Promise<void> {
    await query(
      `UPDATE wallet_accounts SET last_unlocked_at = ? WHERE wallet_address = ?`,
      [new Date().toISOString(), walletAddress],
    );
  }

  async countPinAttempts(walletAddress: string, sinceMs: number): Promise<number> {
    await query(
      `DELETE FROM pin_attempts WHERE wallet_address = ? AND attempted_at_ms < ?`,
      [walletAddress, sinceMs],
    );
    const rows = await query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM pin_attempts WHERE wallet_address = ?`,
      [walletAddress],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async recordPinAttempt(walletAddress: string, attemptedAtMs: number): Promise<void> {
    await query(
      `INSERT INTO pin_attempts (wallet_address, attempted_at_ms) VALUES (?,?)`,
      [walletAddress, attemptedAtMs],
    );
  }

  async clearPinAttempts(walletAddress: string): Promise<void> {
    await query(`DELETE FROM pin_attempts WHERE wallet_address = ?`, [walletAddress]);
  }

  // ── leaderboard ──────────────────────────────────────────────────────

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const rows = await query<{
      wallet_address: string;
      display_name: string | null;
      score: number;
      total: number;
      golden: number;
      legendary: number;
      epic: number;
      rare: number;
      total_sent: number;
    }>(
      `SELECT t.owner_address AS wallet_address,
              w.display_name AS display_name,
              MAX(${TIER_EXPR}) AS score,
              COUNT(t.id) AS total,
              SUM(CASE WHEN t.is_golden = 1 THEN 1 ELSE 0 END) AS golden,
              SUM(CASE WHEN t.rarity = 'LEGENDARY' AND t.is_golden = 0 THEN 1 ELSE 0 END) AS legendary,
              SUM(CASE WHEN t.rarity = 'EPIC' THEN 1 ELSE 0 END) AS epic,
              SUM(CASE WHEN t.rarity = 'RARE' THEN 1 ELSE 0 END) AS rare,
              SUM(t.amount) AS total_sent
       FROM tredies t
       LEFT JOIN wallet_accounts w ON w.wallet_address = t.owner_address
       GROUP BY t.owner_address
       ORDER BY score DESC, total_sent DESC, MIN(t.created_at) ASC
       LIMIT ?`,
      [limit],
    );

    return Promise.all(
      rows.map((row, index) =>
        this.getBestTredie(row.wallet_address).then((topTredie) => ({
          walletAddress: row.wallet_address,
          displayName: row.display_name,
          otterTag: otterTag(row.wallet_address),
          score: Number(row.score),
          total: Number(row.total),
          golden: Number(row.golden),
          legendary: Number(row.legendary),
          epic: Number(row.epic),
          rare: Number(row.rare),
          totalSent: Number(row.total_sent),
          topTredie,
          rank: index + 1,
        })),
      ),
    );
  }

  async getBestTredie(walletAddress: string): Promise<TredieRecord | null> {
    const rows = await query<TredieRow>(
      `SELECT ${TREDIE_COLUMNS} ${TREDIE_FROM}
       WHERE t.owner_address = ?
       ORDER BY (${TIER_EXPR}) DESC, t.created_at ASC
       LIMIT 1`,
      [walletAddress],
    );
    return rows[0] ? mapTredie(rows[0]) : null;
  }
}