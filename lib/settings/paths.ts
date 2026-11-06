// Where the app keeps its two pieces of state, resolved the same way every
// time: the value saved on /settings, else the environment override, else the
// default inside the repo. Both functions read on every call so a save applies
// to the next operation without a restart (ADR 0014).
import { join, resolve } from 'node:path'

import { readSettings } from './store'

// The SQLite file. WH_DB_PATH stays the test harness's override; a value saved
// on /settings wins over it because that is the operator's latest choice.
export function databaseFile(): string {
  const saved = readSettings().databasePath
  if (saved) return resolve(saved)

  const override = process.env.WH_DB_PATH
  return override ? resolve(override) : join(process.cwd(), 'database', 'wh.db')
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
