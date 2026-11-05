import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import Database from 'better-sqlite3'

import { seedLines } from './seed'

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

  -- Order-image form (feature /liff/forms/order-image): catalog of production
  -- lines the form dropdown offers. Only seeded when empty, so a future
  -- admin edit survives restarts.
  CREATE TABLE IF NOT EXISTS lines (
    name TEXT PRIMARY KEY
  );

  -- order_date is the Bangkok calendar date as plain 'YYYY-MM-DD' text: no
  -- timezone math anywhere downstream (storage key, unique constraint, Thai
  -- display all reuse the string). created_by stores the LINE user id or
  -- 'local-device' (ADR 0004) and deliberately has no FK to users: revoking
  -- deletes the users row (ADR 0003) and order history must survive it.
  CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    order_date   TEXT NOT NULL,
    line         TEXT NOT NULL,
    created_by   TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );
  -- Order identity = number + date + line: the same printed number can appear
  -- on more than one production line on the same day.
  --
  -- DROP first: older databases carry the two-column index under its old
  -- name, and CREATE INDEX IF NOT EXISTS would leave it in place.
  DROP INDEX IF EXISTS idx_orders_number_date;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number_date_line
    ON orders (order_number, order_date, line);
  CREATE INDEX IF NOT EXISTS idx_orders_order_number
    ON orders (order_number);
  CREATE INDEX IF NOT EXISTS idx_orders_line ON orders (line);
  -- The admin list filters by order_date range and sorts by it.
  CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders (order_date);

  -- Items self-reference for varieties (110-190 under parent 100); the
  -- database allows any depth but the form only ever creates depth 2.
  CREATE TABLE IF NOT EXISTS items (
    id             TEXT PRIMARY KEY,
    order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    parent_item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    item_number    INTEGER NOT NULL,
    created_by     TEXT NOT NULL,
    created_at     TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_items_order_number
    ON items (order_id, item_number);
  CREATE INDEX IF NOT EXISTS idx_items_parent ON items (parent_item_id);

  -- package stays NULL until someone labels the photo; filenames fall back
  -- to 'Primary' like the old chat flow did. seq restarts per item.
  CREATE TABLE IF NOT EXISTS images (
    id          TEXT PRIMARY KEY,
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,
    package     TEXT
                CHECK (package IS NULL
                       OR package IN ('Primary', 'Inner Box', 'Sleeve Box',
                                      'Tray', 'Carton')),
    file_name   TEXT,
    mime_type   TEXT,
    file_size   INTEGER,
    storage_key TEXT NOT NULL,
    created_by  TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_images_item_seq
    ON images (item_id, seq);
  CREATE INDEX IF NOT EXISTS idx_images_order ON images (order_id);
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

// Drops the cached connection and its file handle. The app never calls this:
// the test harness does, between test files, because each file points
// WH_DB_PATH at its own throwaway file and must not inherit the handle of the
// file before it (tests/unit/setup/db.ts).
export function closeDb(): void {
  const scope = globalThis as GlobalWithDb
  scope.__whDb?.close()
  delete scope.__whDb
}

function openDatabase(): Database.Database {
  // process.cwd() is the repo root because every command in this repo runs
  // from there (see AGENTS.md); running from elsewhere would silently
  // create the database in the wrong directory.
  //
  // WH_DB_PATH overrides the file so tests never open the real database
  // (tests/unit/setup/db.ts, playwright.config.ts). It is read here, at call
  // time, so a test can set it before the first getDb().
  const override = process.env.WH_DB_PATH
  const file = override ? resolve(override) : join(process.cwd(), 'database', 'wh.db')
  mkdirSync(dirname(file), { recursive: true })

  const db = new Database(file)
  // WAL lets admin reads run while an action writes; busy_timeout absorbs
  // the brief writer window instead of throwing SQLITE_BUSY. Foreign keys
  // are OFF by default in SQLite, so ON DELETE CASCADE on the order-image
  // tables would silently do nothing without this pragma.
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  // The line catalog is seeded here, once per open, rather than on every
  // read: a write inside a read path would make the catalog uncacheable.
  seedLines(db)
  return db
}
