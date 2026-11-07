import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { storageRoot } from '@/lib/order-images/storage'
import { databaseFile, storageBase } from '@/lib/settings/paths'
import { updateSettings } from '@/lib/settings/store'

// A private settings file per test, so a save in one case cannot leak into the
// next. The environment is restored at the end.
const root = mkdtempSync(join(tmpdir(), 'wh-paths-'))
const previous = new Map<string, string | undefined>()

// Absolute paths built with join(), never a hand-written 'D:/...': the suite
// also runs on Linux, where that string is a relative path.
const envDb = join(root, 'harness.db')
const savedDb = join(root, 'saved')
const envStorage = join(root, 'uploads')
const savedStorage = join(root, 'photos')

beforeEach(() => {
  for (const [key, value] of Object.entries({
    WH_SETTINGS_PATH: join(root, 'settings.json'),
    WH_DB_PATH: '',
    STORAGE_PATH: '',
  })) {
    if (!previous.has(key)) previous.set(key, process.env[key])
    if (value === '') delete process.env[key]
    else process.env[key] = value
  }
  rmSync(join(root, 'settings.json'), { force: true })
})

afterAll(() => {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

describe('databaseFile', () => {
  it('falls back to database/wh.db in the repo root', () => {
    expect(databaseFile()).toBe(join(process.cwd(), 'database', 'wh.db'))
  })

  it('lets WH_DB_PATH win over the default', () => {
    process.env.WH_DB_PATH = envDb

    expect(databaseFile()).toBe(envDb)
  })

  it('lets a saved path win over WH_DB_PATH', () => {
    process.env.WH_DB_PATH = envDb
    updateSettings({ databasePath: savedDb })

    expect(databaseFile()).toBe(join(savedDb, 'wh.db'))
  })
})

describe('storageBase', () => {
  it('falls back to the repo root', () => {
    expect(storageBase()).toBe(process.cwd())
  })

  it('lets STORAGE_PATH win over the default', () => {
    process.env.STORAGE_PATH = envStorage

    expect(storageBase()).toBe(envStorage)
  })

  it('lets a saved path win over STORAGE_PATH', () => {
    process.env.STORAGE_PATH = envStorage
    updateSettings({ storagePath: savedStorage })

    expect(storageBase()).toBe(savedStorage)
  })
})

describe('storageRoot', () => {
  it('appends the app folder name to a base', () => {
    process.env.STORAGE_PATH = envStorage

    expect(storageRoot()).toBe(join(envStorage, 'order-images'))
  })

  it('keeps a path that already names the folder', () => {
    process.env.STORAGE_PATH = join(envStorage, 'order-images')

    expect(storageRoot()).toBe(join(envStorage, 'order-images'))
  })

  it('applies a saved base to the next call', () => {
    updateSettings({ storagePath: savedStorage })

    expect(storageRoot()).toBe(join(savedStorage, 'order-images'))
  })
})
