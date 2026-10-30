import path from 'node:path'

// Everything an e2e run needs to stay away from the developer's machine
// state: its own port, database, upload folder and Next build output.
//
// The runner reads this module first (through playwright.config.ts), sets the
// run id on its own process, and both the server it starts and the test
// workers inherit it, so all three agree on the same throwaway paths.
//
// WHY a run id for the data: a fixed path would let a previous run's users and
// orders show up in this one, and deleting the old tree while a server still
// holds the SQLite file open fails on Windows.
//
// The run id has to be the SAME in the runner and in the server it starts.
// This module runs in both processes, so a fresh Date.now() would give each
// one its own id: the server would then work on a different database file
// than the specs read and write, and the specs would see neither the seeded
// rows nor the deletions. The runner therefore sets WH_E2E_RUN_ID before
// starting the server and passes it on (see playwright.config.ts); this
// module only invents an id when it runs first.
const runId = process.env.WH_E2E_RUN_ID ?? String(Date.now())
process.env.WH_E2E_RUN_ID = runId
const runDir = path.resolve('tests', '.tmp', 'e2e', runId)

// The runner passes this to the server it starts, so both work on the same
// throwaway paths (see the note above).
export const E2E_RUN_ID = runId

// Keep in sync with the e2e:server script in package.json.
const serverPort = 3100
export const E2E_BASE_URL = `http://127.0.0.1:${serverPort}`

export const E2E_DB_PATH = path.join(runDir, 'wh.db')
export const E2E_STORAGE_DIR = path.join(runDir, 'storage')

// Next resolves distDir against the project root, so this stays relative and
// uses forward slashes.
//
// Deliberately NOT run-scoped (unlike the database and upload folder): Next
// appends a distDir-specific type path to tsconfig.json's "include" whenever it
// writes that file, so a per-run directory would grow a new entry on every run
// and leave the working tree permanently dirty. The two entries for this fixed
// path are committed in tsconfig.json, which is what makes Next's check find
// them already present and skip the write.
export const E2E_DIST_DIR = ['tests', '.tmp', 'e2e', 'dist'].join('/')

// A throwaway signing key, comfortably past the 32-character minimum that
// lib/liff/order-session.ts fails closed on. The specs mint their own cookies
// with it, which is how the auth spec proves the per-request approval check
// without involving LINE.
export const E2E_SESSION_SECRET = 'e2e-session-secret-that-is-at-least-32-chars'
