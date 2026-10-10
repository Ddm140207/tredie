import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite database (single process, embedded).
 *
 * Node 24's built-in `node:sqlite` driver, so there is no native dependency to
 * compile or ship. The default file lives in `data/tredie.db` next to the app;
 * Cloud Run must point `TREDIE_DB_FILE` at a writable filesystem and keep
 * `min-instances=1` (an instance-local file, not a network database).
 *
 * WAL + a busy timeout make reads cheap and concurrent writes orderly. Because
 * this is a single connection, `withTransaction` brackets its work with an
 * explicit `BEGIN IMMEDIATE` so writers never silently interleave.
 */

const globalForDb = globalThis as unknown as { tredieDatabase?: DatabaseSync };

function resolveDbPath(): string {
  return process.env.TREDIE_DB_FILE ?? path.join(process.cwd(), "data", "tredie.db");
}

function openDatabase(): DatabaseSync {
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

export function getDb(): DatabaseSync {
  globalForDb.tredieDatabase ??= openDatabase();
  return globalForDb.tredieDatabase;
}

/** A single SQLite connection scoped to one transaction. */
export interface DbClient {
  query<T>(sql: string, values?: unknown[]): Promise<T[]>;
  exec(sql: string): void;
}

export async function query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
  const statement = getDb().prepare(sql);
  return statement.all(...(values as SQLInputValue[])) as T[];
}

/**
 * Runs `handler` inside a single transaction.
 *
 * `BEGIN IMMEDIATE` takes the write lock up front, so the Tredie row, its
 * attribute row and any wallet bookkeeping land together — or not at all.
 */
export async function withTransaction<T>(
  handler: (client: DbClient) => Promise<T>,
): Promise<T> {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const client: DbClient = {
      query: <R>(sql: string, values: unknown[] = []) =>
        Promise.resolve(db.prepare(sql).all(...(values as SQLInputValue[])) as R[]),
      exec: (sql: string) => db.exec(sql),
    };
    const result = await handler(client);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}