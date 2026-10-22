import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { defineConfig } from 'vitest/config'

// Unit tests only; browser-level journeys live in tests/e2e (Playwright).
//
// environment stays "node" on purpose: everything under test is server code,
// and better-sqlite3 is a native module that must load on the same runtime as
// production. `bun run dev` runs Next on Node (no --bun flag in package.json),
// so the tests do too.
//
// The server-only marker package throws on import unless the "react-server"
// export condition is set. Next.js sets that condition for the server bundle;
// Vitest does not. Every module under test here is server code, so the
// marker is a no-op for the tests, exactly as it is in the server bundle.
//
// The package's "react-server" entry (empty.js) is that no-op file. It is
// not reachable through the export map under that name, so the path is
// built next to the package's main entry, which is what resolves.
const require = createRequire(import.meta.url)
const serverOnlyMarker = join(dirname(require.resolve('server-only')), 'empty.js')

export default defineConfig({
  // Vite 8 resolves the "@/*" alias straight from tsconfig.json, so no
  // vite-tsconfig-paths plugin is needed.
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': serverOnlyMarker },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
    // unstubEnvs is deliberately OFF: tests/unit/setup/db.ts writes
    // process.env directly and restores it in afterAll, while vi.stubEnv is
    // used per test for identity/secret values. An afterEach unstubAllEnvs
    // would also silently drop the data paths mid-file, pointing every later
    // test in that file at the real database/wh.db.
  },
})
