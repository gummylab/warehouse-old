// Filesystem layout for order-image uploads, ported from eu-shipment's
// lib/storage.ts (read-only reference). STORAGE_PATH from .env (or the path
// saved on /settings) is the base dir (e.g. D:\ or ./); the app folder name is
// appended here so this app never shares files with another one pointed at the
// same base.
//
// Inside the app folder every photo exists in three forms:
//
//   order-images/originals/<date>/<order>/<line>/<item>/<seq>-<package>.<ext>
//   order-images/web/<date>/<order>/<line>/<item>/<seq>-<package>.webp
//   order-images/thumb/<date>/<order>/<line>/<item>/<seq>-<package>.webp
//
// The database stores the key without any of those prefixes; the kind folder
// is a storage detail. That keeps a backup to `originals/` enough to restore
// every photo, with the derivatives rebuildable from it.
import { mkdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'

import { storageBase } from '../settings/paths'

const APP_FOLDER = 'order-images'

// The two derivative sizes. `original` is not in this list: it is the file the
// upload arrived as, not something this module generates.
export type ImageSize = 'web' | 'thumb'
export const DERIVATIVE_SIZES: readonly ImageSize[] = ['web', 'thumb']

// Resolved per call rather than once at module load: the test harness points
// STORAGE_PATH at a throwaway directory before the first write
// (tests/unit/setup/db.ts), and a value saved on /settings has to apply to the
// next write without a restart.
export function storageRoot(): string {
  const base = storageBase()
  // Compare the folder itself, not a string suffix: a base such as
  // "backup-order-images" must not be mistaken for the root already.
  return path.basename(base) === APP_FOLDER
    ? base
    : path.join(base, APP_FOLDER)
}

// The uploaded file. `key` is the relative storage key from the database
// (date/order/line/item/file), never a path under the root.
export function originalPath(key: string): string {
  return path.join(storageRoot(), 'originals', path.normalize(key))
}

// A derivative keeps the key's folders and file name, changes the extension to
// webp, and moves under its size folder.
export function derivativeKey(key: string, size: ImageSize): string {
  return `${size}/${key.replace(/\.[^./\\]+$/, '.webp')}`
}

export function derivativePath(key: string, size: ImageSize): string {
  return path.join(storageRoot(), path.normalize(derivativeKey(key, size)))
}

// Called before writing a new file; mkdir recursive also creates the root and
// the kind folders, so no separate boot-time hook is needed.
export function ensureDirForFile(absoluteFilePath: string): void {
  mkdirSync(path.dirname(absoluteFilePath), { recursive: true })
}

// Remove one stored file, ignoring "already gone": callers delete the row
// first and treat leftover files as harmless orphans, never as errors.
export function removeStoredFile(absoluteFilePath: string): void {
  try {
    unlinkSync(absoluteFilePath)
  } catch {
    // Best effort — a missing file must not fail the database delete.
  }
}

// Removes the original and every derivative. Callers delete the row first, so
// a missed derivative would outlive the row that names it.
export function removeStoredFiles(key: string): void {
  removeStoredFile(originalPath(key))
  for (const size of DERIVATIVE_SIZES) {
    removeStoredFile(derivativePath(key, size))
  }
}

// Storage-key segments must not contain path separators or Windows-forbidden
// characters; user-supplied order numbers and line names flow through here.
export function sanitize(segment: string): string {
  const cleaned = segment
    .replace(/[\\/:*?"<>|]/g, '')
    // Control characters (including NUL) are invalid in a path segment and
    // make the filesystem calls throw, so they go before anything else.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return normalizeSegment(cleaned)
}

// Two shapes of segment are still unsafe after the character filter, and
// both are path instructions rather than names:
//   - '.' and '..' mean "this folder" and "the parent folder". A key
//     segment like that lets a photo land outside its date folder, and two
//     such orders overwrite each other.
//   - an empty segment collapses away when the path is normalized, which
//     drops a level of the key just as effectively.
// They are replaced with an obviously-safe stand-in. The stand-in is
// injective ('.' and '..' stay distinct, and a segment that filtered away
// to nothing stays distinct from both), so two different inputs never share
// one folder. The key is stored in the database and read back verbatim, so
// the replacement only affects the folder name, never the lookup.
function normalizeSegment(segment: string): string {
  if (segment.length === 0) return '_empty'
  if (/^\.+$/.test(segment)) return `_dots_${segment.length}`
  return segment
}

/**
 * Build the relative storage key for one image. orderDate is the stored
 * Bangkok calendar date string ('YYYY-MM-DD') — no Date object, no timezone
 * conversion on the way to disk.
 */
export function buildKey(
  orderDate: string,
  orderNumber: string,
  line: string,
  itemNumber: number,
  seq: number,
  pkg: string | null,
  ext: string,
): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase() || 'jpg'
  return [
    sanitize(orderDate),
    sanitize(orderNumber),
    sanitize(line),
    String(itemNumber),
    `${seq}-${sanitize(pkg ?? 'Primary')}.${cleanExt}`,
  ].join('/')
}

// Guard used before serving a stored file: a key that escapes the storage
// root (hand-crafted storage_key, path traversal) must never be read.
export function isInsideRoot(absoluteFilePath: string): boolean {
  const root = path.resolve(storageRoot())
  const resolved = path.resolve(absoluteFilePath)
  return resolved === root || resolved.startsWith(root + path.sep)
}
