import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import Database from 'better-sqlite3'

// Schema bootstrap. No migration tool by choice (ADR 0002): the first open
// creates everything, later opens are no-ops thanks to IF NOT EXISTS. Adding
// or changing a column after this point needs a manual ALTER TABLE.
// 'rejected' is not a stored status: rejecting deletes the row (ADR 0003).
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url   TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved')),
    requested_at TEXT NOT NULL,
    decided_at   TEXT,
    line_user_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
  -- One request per LINE user; multiple NULLs stay allowed for rows that
  -- predate LIFF identity.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_line_user_id
    ON users (line_user_id);
`

type GlobalWithDb = typeof globalThis & { __whDb?: Database.Database }

// The dev server hot-reloads modules without exiting the process, so a
// module-scoped connection would open a new file handle on every edit and
// leak the old one. Cache the connection on globalThis instead.
export function getDb(): Database.Database {
  const scope = globalThis as GlobalWithDb
  scope.__whDb ??= openDatabase()
  return scope.__whDb
}

function openDatabase(): Database.Database {
  // process.cwd() is the repo root because every command in this repo runs
  // from there (see AGENTS.md); running from elsewhere would silently
  // create the database in the wrong directory.
  const directory = join(process.cwd(), 'database')
  mkdirSync(directory, { recursive: true })

  const db = new Database(join(directory, 'wh.db'))
  // WAL lets admin reads run while an action writes; busy_timeout absorbs
  // the brief writer window instead of throwing SQLITE_BUSY.
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.exec(SCHEMA)
  return db
}
