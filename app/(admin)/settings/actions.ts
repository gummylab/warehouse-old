'use server'

import { existsSync, mkdirSync, statSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

import { requireLocalAdminRequest } from '@/lib/admin/authorize'
import { applyDatabasePath } from '@/lib/db'
import { storageRoot } from '@/lib/order-images/storage'
import { updateSettings } from '@/lib/settings/store'

// The outcome of one save. 'confirm' only comes back from the database field,
// when the target file does not exist yet and creating it would look like
// every order disappeared.
export type SavePathResult =
  | { status: 'saved'; path: string }
  | { status: 'confirm'; path: string }
  | { status: 'error'; message: string }

// A server action is a plain POST endpoint, so the local-machine check has to
// run here and not only on the page (ADR 0007).
export async function saveDatabasePath(input: {
  path: string
  confirm?: boolean
}): Promise<SavePathResult> {
  await requireLocalAdminRequest()

  const requested = input.path.trim()
  if (!requested) return { status: 'error', message: 'ระบุโฟลเดอร์ฐานข้อมูล' }

  const dir = resolve(requested)
  // The fixed file name lives inside the folder the operator typed.
  const base = basename(dir) === 'wh.db' ? dirname(dir) : dir
  const target = resolve(base, 'wh.db')

  if (existsSync(base) && statSync(base).isFile()) {
    return { status: 'error', message: 'ที่อยู่นี้เป็นไฟล์ ไม่ใช่โฟลเดอร์' }
  }

  if (!input.confirm && !hasContent(target)) {
    return { status: 'confirm', path: base }
  }

  try {
    return { status: 'saved', path: applyDatabasePath(base) }
  } catch (error) {
    return {
      status: 'error',
      message: `เปิดไฟล์ฐานข้อมูลไม่ได้: ${reason(error)}`,
    }
  }
}

export async function saveStoragePath(input: {
  path: string
}): Promise<SavePathResult> {
  await requireLocalAdminRequest()

  const requested = input.path.trim()
  if (!requested) return { status: 'error', message: 'ระบุที่อยู่ที่จัดเก็บ' }

  const base = resolve(requested)
  if (existsSync(base) && statSync(base).isFile()) {
    return { status: 'error', message: 'ที่อยู่นี้เป็นไฟล์ ไม่ใช่โฟลเดอร์' }
  }

  try {
    // Create it now so a permission problem surfaces here instead of on the
    // first upload. The storage rule adds the folder name when the path does
    // not end with it, so the saved value is the base and the returned value
    // is the effective root the operator will see.
    mkdirSync(base, { recursive: true })
    updateSettings({ storagePath: base })
    return { status: 'saved', path: storageRoot() }
  } catch (error) {
    return { status: 'error', message: `ใช้ที่อยู่นี้ไม่ได้: ${reason(error)}` }
  }
}

// A file that exists but holds nothing is the same trap as a missing one: the
// first open would initialise an empty database in its place.
function hasContent(file: string): boolean {
  if (!existsSync(file)) return false
  try {
    return statSync(file).size > 0
  } catch {
    return false
  }
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
