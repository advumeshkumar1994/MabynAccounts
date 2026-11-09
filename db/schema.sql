PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
) STRICT;

-- Reserved for future account, invoice and payment workflows.
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('customer', 'vendor'))
) STRICT;

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  reference TEXT NOT NULL UNIQUE,
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'void'))
) STRICT;

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  provider_reference TEXT UNIQUE
) STRICT;
