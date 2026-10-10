-- Tredie initial schema (SQLite)
--
-- Applied by `npm run db:migrate`, which tracks filenames in schema_migrations.
-- Every Tredie is anchored to a real Stellar transaction; the unique constraint
-- on stellar_transaction_hash is what makes "never charge twice" enforceable at
-- the database level.
--
-- SQLite stores booleans as INTEGER 0/1 and true timestamps as ISO TEXT.

CREATE TABLE IF NOT EXISTS owners (
  wallet_address  TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tredies (
  id                      TEXT PRIMARY KEY,
  owner_address           TEXT NOT NULL REFERENCES owners(wallet_address),
  name                    TEXT NOT NULL,
  species                 TEXT NOT NULL CHECK (species IN ('ROCK', 'FISH', 'OTTER')),
  rarity                  TEXT NOT NULL CHECK (rarity IN ('RARE', 'EPIC', 'LEGENDARY')),
  is_golden               INTEGER NOT NULL DEFAULT 0,
  personality             TEXT NOT NULL,
  image_url               TEXT,
  image_provider          TEXT,
  amount                  REAL NOT NULL,
  asset                   TEXT NOT NULL,
  recipient               TEXT,
  note                    TEXT,
  stellar_transaction_hash TEXT NOT NULL UNIQUE,
  stellar_network         TEXT NOT NULL,
  stellar_ledger          INTEGER,
  stellar_payer           TEXT,
  stellar_address         TEXT,
  status                  TEXT NOT NULL DEFAULT 'generating'
                            CHECK (status IN ('generating', 'ready', 'failed')),
  error_message           TEXT,
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS tredies_owner_created_idx
  ON tredies (owner_address, created_at DESC);

CREATE INDEX IF NOT EXISTS tredies_created_idx
  ON tredies (created_at DESC);

-- One Tredie, one attribute set. The app picks every attribute before the
-- image is rendered, so this row is written in the same transaction as the
-- Tredie and never changes afterwards.
CREATE TABLE IF NOT EXISTS creature_attributes (
  id                     TEXT PRIMARY KEY,
  tredie_id              TEXT NOT NULL UNIQUE REFERENCES tredies(id) ON DELETE CASCADE,
  band_id                TEXT NOT NULL,
  rarity                 TEXT NOT NULL CHECK (rarity IN ('RARE', 'EPIC', 'LEGENDARY')),
  species                TEXT NOT NULL CHECK (species IN ('ROCK', 'FISH', 'OTTER')),
  is_golden              INTEGER NOT NULL DEFAULT 0,
  primary_color          TEXT NOT NULL,
  primary_color_hex      TEXT NOT NULL,
  secondary_color        TEXT NOT NULL,
  secondary_color_hex    TEXT NOT NULL,
  material               TEXT NOT NULL,
  expression             TEXT NOT NULL,
  accessory              TEXT,
  special_feature        TEXT,
  personality            TEXT NOT NULL,
  name                   TEXT NOT NULL
);

-- Wallet PIN accounts: the wallet is the account. The PIN is never stored in
-- the clear; pin_hash + pin_salt are scrypt materials chosen at registration.
CREATE TABLE IF NOT EXISTS wallet_accounts (
  wallet_address   TEXT PRIMARY KEY,
  display_name     TEXT,
  pin_hash         TEXT NOT NULL,
  pin_salt         TEXT NOT NULL,
  network          TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_unlocked_at TEXT
);

-- Server-side PIN attempt limiter (5 tries / 15 minutes per wallet). Blunt,
-- offline-safe, and it works across tabs and page refreshes.
CREATE TABLE IF NOT EXISTS pin_attempts (
  wallet_address   TEXT NOT NULL REFERENCES wallet_accounts(wallet_address) ON DELETE CASCADE,
  attempted_at_ms  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS pin_attempts_wallet_idx
  ON pin_attempts (wallet_address, attempted_at_ms);