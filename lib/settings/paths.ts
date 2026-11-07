// Where the app keeps its two pieces of state, resolved the same way every
// time: the value saved on /settings, else the environment override, else the
// default inside the repo. Both functions read on every call so a save applies
// to the next operation without a restart (ADR 0014).
import { basename, dirname, join, resolve } from 'node:path'

import { readSettings } from './store'

// The SQLite file. A value saved on /settings is a FOLDER now (the operator only
// types the folder); the fixed file name 'wh.db' is appended here. A saved value
// that still ends in 'wh.db' (older builds) is treated as its parent folder so
// the switch is transparent. WH_DB_PATH keeps its old meaning (full file path)
// because the test harness and .env pass a file there.
const DB_FILE_NAME = 'wh.db'

export function databaseFile(): string {
  const saved = readSettings().databasePath
  if (saved) {
    const base = basename(saved) === DB_FILE_NAME ? dirname(saved) : saved
    return resolve(base, DB_FILE_NAME)
  }

  const override = process.env.WH_DB_PATH
  return override ? resolve(override) : join(process.cwd(), 'database', DB_FILE_NAME)
}

// The base directory uploads live under. The folder name itself is appended by
// storageRoot() in lib/order-images/storage.ts, which owns that rule.
export function storageBase(): string {
  const saved = readSettings().storagePath
  if (saved) return resolve(saved)

  // The base comes from the environment, so Turbopack cannot know it at build
  // time and traces the whole project into the server output to cover any
  // path it might resolve to. This folder holds runtime uploads, never
  // imported modules, so opting this call out of tracing is safe.
  return resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PATH ?? './')
}
