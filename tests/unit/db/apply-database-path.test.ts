import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { applyDatabasePath, getDb, getOrm } from '@/lib/db'
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
})
