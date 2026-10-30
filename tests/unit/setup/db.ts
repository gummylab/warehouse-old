import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, beforeEach } from 'vitest'

import { closeDb } from '@/lib/db'

// Gives the calling test file a private SQLite file and storage directory so
// no test ever touches database/wh.db or the real upload folder, and wipes
// both before every test.
//
// The name avoids the "use*" prefix on purpose: eslint's react-hooks plugin
// treats any such call as a React hook, and this is a test hook, not one.
//
// Nothing is returned: the modules under test read the paths themselves
// (lib/db/index.ts reads WH_DB_PATH when it opens the file;
// lib/order-images/storage.ts reads STORAGE_PATH on every call), and both
// reads happen lazily, which is what makes this swap possible at all.
//
// vi.stubEnv is deliberately not used here. The stub would be dropped by an
// afterEach unstub hook in the middle of the file and the remaining tests
// would quietly open the real database. process.env is written directly and
// put back in afterAll.
export function isolateTestData({ env = {} }: { env?: Record<string, string> } = {}): void {
  const root = mkdtempSync(join(tmpdir(), 'wh-unit-'))
  const dbPath = join(root, 'wh.db')
  const storagePath = join(root, 'storage')
  const previous = new Map<string, string | undefined>()

  beforeAll(() => {
    for (const [key, value] of Object.entries({
      WH_DB_PATH: dbPath,
      STORAGE_PATH: storagePath,
      ...env,
    })) {
      previous.set(key, process.env[key])
      process.env[key] = value
    }
  })

  // A fresh database per test, not per file: assertions such as "exactly one
  // order exists" are only trustworthy when the previous test's rows cannot
  // still be sitting there. Reopening costs a schema exec, which SQLite
  // treats as a no-op.
  beforeEach(() => {
    // Drop the cached connection first: a previous test (or a previous file in
    // this same worker) may have left one open on globalThis, and an open
    // handle keeps wh.db plus its sidecars locked on Windows.
    closeDb()
    rmSync(dbPath, { force: true })
    rmSync(`${dbPath}-wal`, { force: true })
    rmSync(`${dbPath}-shm`, { force: true })
    rmSync(storagePath, { recursive: true, force: true })
  })

  afterAll(() => {
    closeDb()
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    // maxRetries covers the short window where a just-closed handle is still
    // being released by the OS.
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  })
}
