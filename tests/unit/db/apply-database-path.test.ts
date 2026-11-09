import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { applyDatabasePath, closeDb, getDb, getOrm } from '@/lib/db'
import { findOrCreateOrder } from '@/lib/db/order-images'
import { lines } from '@/lib/db/schema'
import { SEED_LINES } from '@/lib/db/seed'
import { databaseFile } from '@/lib/settings/paths'
import { readSettings } from '@/lib/settings/store'
import { isolateTestData } from '../setup/db'

isolateTestData()

// Targets live outside the harness's own database so a switch never replaces
// the file the harness counts rows in.
const targetDir = mkdtempSync(join(tmpdir(), 'wh-switch-'))

afterAll(() => {
  // The live handle still points at one of these files, and Windows will not
  // release it until the connection is closed.
  closeDb()
  rmSync(targetDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

describe('applyDatabasePath', () => {
  it('opens a new file, migrates it and seeds the catalog', () => {
    const target = join(targetDir, 'fresh')

    expect(applyDatabasePath(target)).toBe(target)
    expect(databaseFile()).toBe(join(target, 'wh.db'))
    expect(readSettings().databasePath).toBe(target)
    expect(getOrm().select({ name: lines.name }).from(lines).all()).toHaveLength(
      SEED_LINES.length,
    )
  })

  it('leaves the running database alone when the target cannot open', () => {
    const brokenDir = join(targetDir, 'broken')
    mkdirSync(brokenDir, { recursive: true })
    const brokenFile = join(brokenDir, 'wh.db')
    writeFileSync(brokenFile, 'this is not a sqlite file', 'utf8')

    expect(() => applyDatabasePath(brokenDir)).toThrow()
    // Nothing was persisted, and the handle from the previous test still works.
    expect(databaseFile()).not.toBe(brokenFile)
    expect(readSettings().databasePath).not.toBe(brokenDir)
    expect(getDb().prepare('SELECT 1 AS value').get()).toEqual({ value: 1 })
  })

  it('serves reads from the file it has just switched to', () => {
    const withOrder = join(targetDir, 'with-order')

    applyDatabasePath(withOrder)
    findOrCreateOrder({
      orderNumber: 'A-1',
      orderDate: '2026-11-09',
      line: SEED_LINES[0],
      createdBy: 'local-device',
    })
    expect(countOrders()).toBe(1)

    // The switch has to move the live handle, not just the settings value:
    // the old file has no order, so a stale handle would answer 1 here.
    applyDatabasePath(join(targetDir, 'fresh'))
    expect(countOrders()).toBe(0)

    applyDatabasePath(withOrder)
    expect(countOrders()).toBe(1)
  })
})

function countOrders(): number {
  const row = getDb()
    .prepare('SELECT count(*) AS count FROM orders')
    .get() as { count: number }
  return row.count
}
