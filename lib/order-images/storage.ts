// Filesystem layout for order-image uploads, ported from eu-shipment's
// lib/storage.ts (read-only reference). STORAGE_PATH from .env is the base
// dir (e.g. D:\ or ./); the storage folder name is appended here so wh and
// eu-shipment never share files even when pointed at the same base.
import { mkdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'

const raw = process.env.STORAGE_PATH ?? './'
const base = path.resolve(raw)
export const STORAGE_ROOT = base.endsWith('wh-order-images-storage')
  ? base
  : path.join(base, 'wh-order-images-storage')

// Convert a relative storage key ('2026-10-19/1234/ดอกแค/100/1-Primary.jpg')
// to an absolute file path.
export function toAbsolute(key: string): string {
  return path.join(STORAGE_ROOT, path.normalize(key))
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
  return segment
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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
  const root = path.resolve(STORAGE_ROOT)
  const resolved = path.resolve(absoluteFilePath)
  return resolved === root || resolved.startsWith(root + path.sep)
}
