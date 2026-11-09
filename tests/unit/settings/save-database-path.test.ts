import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { revalidatePath, revalidateTag } from 'next/cache'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveDatabasePath } from '@/app/(admin)/settings/actions'
import { databaseFile } from '@/lib/settings/paths'

import { isolateTestData } from '../setup/db'

// The action asks the request headers whether the caller is the operator's
// machine, and calls the cache functions to expire the overviews. Both throw
// outside a Next request, so the test supplies the two values the action
// needs before the module is imported.
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: '127.0.0.1:8080' }),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

isolateTestData()

// Targets live outside the harness's database so a switch never replaces the
// file the harness counts rows in.
const targetDir = mkdtempSync(join(tmpdir(), 'wh-settings-action-'))

afterAll(() => {
  rmSync(targetDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

beforeEach(() => {
  vi.mocked(revalidateTag).mockClear()
  vi.mocked(revalidatePath).mockClear()
})

describe('saveDatabasePath', () => {
  it('expires both overview tags and the client cache after a switch', async () => {
    const target = join(targetDir, 'switched')

    const result = await saveDatabasePath({ path: target, confirm: true })

    expect(result).toEqual({ status: 'saved', path: target })
    expect(databaseFile()).toBe(join(target, 'wh.db'))
    expect(revalidateTag).toHaveBeenCalledWith('orders', { expire: 0 })
    expect(revalidateTag).toHaveBeenCalledWith('line-walks', { expire: 0 })
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('leaves the caches alone when the target cannot open', async () => {
    const broken = join(targetDir, 'broken')
    mkdirSync(broken, { recursive: true })
    writeFileSync(join(broken, 'wh.db'), 'this is not a sqlite file', 'utf8')

    const result = await saveDatabasePath({ path: broken, confirm: true })

    expect(result.status).toBe('error')
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
