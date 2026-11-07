import { mkdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import * as schema from './schema'
import { seedLines } from './seed'
import { databaseFile } from '../settings/paths'
import { updateSettings } from '../settings/store'

// The generated SQL lives in the repo, not in this file: `drizzle-kit
// generate` writes to `drizzle/` from ./schema.ts and `migrate()` below applies
// whatever has not run yet (docs/adr/0013). Changing a column means changing
// ./schema.ts and regenerating; hand-editing the database is no longer part of
// the workflow.
const MIGRATIONS_FOLDER = join(process.cwd(), 'drizzle')

export type Orm = BetterSQLite3Database<typeof schema>

// One connection and one ORM on top of it, cached together so a raw query and
// an ORM query in the same request see the same state.
type Handles = { db: Database.Database; orm: Orm }

type GlobalWithDb = typeof globalThis & {
  __whDb?: Database.Database
  __whOrm?: Orm
}

// The dev server hot-reloads modules without exiting the process, so a
// module-scoped connection would open a new file handle on every edit and
// leak the old one. Cache the connection on globalThis instead.
export function getDb(): Database.Database {
  return openOnce().db
}

// The ORM wrapper. getDb() stays public because the test harness counts rows
// and the rare raw query needs the driver directly.
export function getOrm(): Orm {
  return openOnce().orm
}

// Drops the cached connection, its file handle and the ORM built on top of it.
// The app never calls this: the test harness does, between test files, because
// each file points WH_DB_PATH at its own throwaway file and must not inherit
// the handle of the file before it (tests/unit/setup/db.ts).
export function closeDb(): void {
  const scope = globalThis as GlobalWithDb
  scope.__whDb?.close()
  delete scope.__whDb
  delete scope.__whOrm
}

function openOnce(): Handles {
  const scope = globalThis as GlobalWithDb
  let db = scope.__whDb
  let orm = scope.__whOrm
  if (!db || !orm) {
    const opened = openDatabase()
    db = opened.db
    orm = opened.orm
    scope.__whDb = db
    scope.__whOrm = orm
  }
  return { db, orm }
}

// Opens one file and gets it ready to serve: pragmas, migrations, seed. Split
// out from openDatabase() so a new path can be proved before the live
// connection is closed (see applyDatabasePath).
function openAt(file: string): Handles {
  mkdirSync(dirname(file), { recursive: true })

  const db = new Database(file)
  try {
    // WAL lets admin reads run while an action writes; busy_timeout absorbs
    // the brief writer window instead of throwing SQLITE_BUSY. Foreign keys
    // are OFF by default in SQLite, so ON DELETE CASCADE on the order-image
    // tables would silently do nothing without this pragma.
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')
    db.pragma('foreign_keys = ON')
    // mmap_size: memory-map the DB file for faster reads (256 MB).
    db.pragma('mmap_size = 268435456')
    // cache_size: in-memory page cache (64 MB, negative = KB).
    db.pragma('cache_size = -64000')
    // wal_autocheckpoint: checkpoint WAL every 1000 pages (default, explicit).
    db.pragma('wal_autocheckpoint = 1000')

    // Synchronous by design (better-sqlite3): a brand-new file ends up with
    // every table before the first query, and an up-to-date file is a no-op
    // read of the migrations table. migrate() takes the ORM, not the raw
    // driver, because it runs through the dialect.
    const orm = drizzle(db, { schema })
    migrate(orm, { migrationsFolder: MIGRATIONS_FOLDER })

    // The line catalog is seeded here, once per open, rather than on every
    // read: a write inside a read path would make the catalog uncacheable.
    seedLines(orm)
    return { db, orm }
  } catch (error) {
    // A half-open handle keeps the file locked on Windows, so a failed
    // migration would break the next test file with EPERM instead of showing
    // the real error. Close it and let the original error through.
    db.close()
    throw error
  }
}

function openDatabase(): Handles {
  // databaseFile() reads the path saved on /settings first, then WH_DB_PATH
  // (the test harness override), then database/wh.db at the repo root. It is
  // read at call time, so both a test and a save can change it before the
  // first getDb(). process.cwd() is the repo root because every command in
  // this repo runs from there (see AGENTS.md).
  return openAt(databaseFile())
}

// Switches the whole app to another SQLite file without a restart.
//
// The target is opened and migrated first, in a throwaway handle, and the live
// connection is only dropped after that succeeds: a typo in the path must not
// be able to leave the dashboard without a database. When the reopen somehow
// fails anyway, the previous path is written back and the app returns to the
// file it was serving before.
export function applyDatabasePath(requested: string): string {
  // The operator types a folder; the fixed file name lives inside it. A value
  // that already ends in 'wh.db' (older builds) is treated as its parent folder.
  const dir = resolve(requested)
  const base = basename(dir) === 'wh.db' ? dirname(dir) : dir
  const target = resolve(base, 'wh.db')

  const previous = databaseFile()
  if (target === previous) {
    updateSettings({ databasePath: base })
    return base
  }

  const probe = openAt(target)
  probe.db.close()

  updateSettings({ databasePath: base })
  closeDb()
  try {
    getDb()
  } catch (error) {
    updateSettings({ databasePath: dirname(previous) })
    closeDb()
    getDb()
    throw error
  }
  return base
}
