import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { readSettings, settingsFile, updateSettings } from '@/lib/settings/store'

// The store reads WH_SETTINGS_PATH on every call, so a private file per test
// is enough; the database harness is not involved here.
const root = mkdtempSync(join(tmpdir(), 'wh-settings-'))
const previous = process.env.WH_SETTINGS_PATH

beforeEach(() => {
  process.env.WH_SETTINGS_PATH = join(root, 'settings.json')
  rmSync(settingsFile(), { force: true })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterAll(() => {
  vi.restoreAllMocks()
  if (previous === undefined) delete process.env.WH_SETTINGS_PATH
  else process.env.WH_SETTINGS_PATH = previous
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

describe('settings store', () => {
  it('has no settings before the first save', () => {
    expect(readSettings()).toEqual({})
  })

  it('reads back what a save wrote', () => {
    updateSettings({ databasePath: 'D:/data/wh.db', storagePath: 'D:/data' })

    expect(readSettings()).toEqual({
      databasePath: 'D:/data/wh.db',
      storagePath: 'D:/data',
    })
  })

  it('keeps the other key when only one is saved', () => {
    updateSettings({ databasePath: 'D:/data/wh.db' })
    updateSettings({ storagePath: 'D:/photos' })

    expect(readSettings()).toEqual({
      databasePath: 'D:/data/wh.db',
      storagePath: 'D:/photos',
    })
  })

  it('writes real JSON so a person can read the file', () => {
    updateSettings({ storagePath: 'D:/photos' })

    const text = readFileSync(settingsFile(), 'utf8')
    expect(JSON.parse(text)).toEqual({ storagePath: 'D:/photos' })
    expect(text.endsWith('\n')).toBe(true)
  })

  it('falls back to the environment when the file is not JSON', () => {
    writeFileSync(settingsFile(), 'this is not json', 'utf8')

    expect(readSettings()).toEqual({})
  })

  it('ignores values that are not strings', () => {
    writeFileSync(
      settingsFile(),
      JSON.stringify({ databasePath: 42, storagePath: null }),
      'utf8',
    )

    expect(readSettings()).toEqual({
      databasePath: undefined,
      storagePath: undefined,
    })
  })

  it('points at WH_SETTINGS_PATH when it is set', () => {
    expect(settingsFile()).toBe(resolve(process.env.WH_SETTINGS_PATH ?? ''))
  })
})
