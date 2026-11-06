// Runtime settings the operator can change from /settings.
//
// `.env` stays the deployment default; this file is the layer above it,
// because the app writes it itself (ADR 0014). It lives at a fixed path and
// not next to the database, because the database path is one of the values it
// holds: a settings file inside the database would move with it.
//
// Reads are deliberately uncached. storageRoot() runs on every upload and on
// every file lookup, and a cached value would keep using the old folder after
// a save. The file is a few hundred bytes, so the read costs nothing next to
// the SQLite work around it.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export type StoredSettings = {
  databasePath?: string
  storagePath?: string
}

// A broken file must not break uploads: warn once per process and fall back
// to the environment, which is what the app used before the first save.
let warnedAboutBrokenFile = false

// WH_SETTINGS_PATH exists so the test harness can point this at its own
// throwaway file. Without it the suite would read the operator's real
// settings and could open the real database.
export function settingsFile(): string {
  const override = process.env.WH_SETTINGS_PATH
  return override ? resolve(override) : join(process.cwd(), 'config', 'settings.json')
}

export function readSettings(): StoredSettings {
  let raw: string
  try {
    raw = readFileSync(settingsFile(), 'utf8')
  } catch {
    // No file yet is the normal state before the first save.
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const record = parsed as Record<string, unknown>
    return {
      databasePath:
        typeof record.databasePath === 'string' ? record.databasePath : undefined,
      storagePath:
        typeof record.storagePath === 'string' ? record.storagePath : undefined,
    }
  } catch (error) {
    if (!warnedAboutBrokenFile) {
      warnedAboutBrokenFile = true
      console.warn('[settings] ignoring an unreadable settings file', error)
    }
    return {}
  }
}

// Writes the whole file through a temporary name and a rename, so a crash
// halfway leaves the previous settings intact instead of a truncated file.
export function updateSettings(patch: StoredSettings): StoredSettings {
  const file = settingsFile()
  const next = { ...readSettings(), ...patch }
  mkdirSync(dirname(file), { recursive: true })
  const temp = `${file}.tmp`
  writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  renameSync(temp, file)
  return next
}
