import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "./db.ts";

/**
 * Minimal forward-only migration runner.
 *
 * Applied filenames are recorded in `schema_migrations`. SQLite has no advisory
 * locks, so each file runs inside a `BEGIN IMMEDIATE` transaction — the write
 * lock serialises concurrent migrators (Cloud Run should predrive one anyway).
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

export async function runMigrations(): Promise<string[]> {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const rows = db.prepare("SELECT filename FROM schema_migrations").all() as {
    filename: string;
  }[];
  const done = new Set(rows.map((row) => row.filename));
  const applied: string[] = [];

  for (const file of files) {
    if (done.has(file)) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (filename) VALUES (?)").run(file);
      db.exec("COMMIT");
      applied.push(file);
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }

  db.close();
  return applied;
}