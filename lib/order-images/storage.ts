// Filesystem layout for order-image uploads, ported from eu-shipment's
// lib/storage.ts (read-only reference). STORAGE_PATH from .env is the base
// dir (e.g. D:\ or ./); the storage folder name is appended here so wh and
// eu-shipment never share files even when pointed at the same base.
import { mkdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'

// Resolved per call rather than once at module load: the test harness points
// STORAGE_PATH at a throwaway directory before the first write
// (tests/unit/setup/db.ts), which a module-level constant could never see.
export function storageRoot(): string {
  // The base comes from the environment, so Turbopack cannot know it at build
  // time and traces the whole project into the server output to cover any
  // path it might resolve to. This folder holds runtime uploads, never
  // imported modules, so opting this call out of tracing is safe.
  const base = path.resolve(
    /*turbopackIgnore: true*/ process.env.STORAGE_PATH ?? './',
  )
  return base.endsWith('wh-order-images-storage')
    ? base
    : path.join(base, 'wh-order-images-storage')
}

// Convert a relative storage key ('2026-10-19/1234/ดอกแค/100/1-Primary.jpg')
// to an absolute file path.
export function toAbsolute(key: string): string {
  return path.join(storageRoot(), path.normalize(key))
}

// Called before writing a new file; mkdir recursive also creates the root,
// so no separate boot-time hook is needed.
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
