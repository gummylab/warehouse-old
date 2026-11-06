import { defineConfig, devices } from '@playwright/test'

import {
  E2E_BASE_URL,
  E2E_DB_PATH,
  E2E_DIST_DIR,
  E2E_RUN_ID,
  E2E_SESSION_SECRET,
  E2E_SETTINGS_PATH,
  E2E_STORAGE_DIR,
} from './tests/e2e/support/env'

// The harness owns its server, port, database, upload folder and build
// output, so `bun run test:e2e` never touches the dev server on 8080, the real
// warehouse data, or the developer's .next directory.
//
// The specs reach this server over 127.0.0.1 with no CF-Connecting-IP header,
// which is exactly the condition for local device mode (ADR 0004). That is
// what lets the whole order-image journey run in a real browser without LINE.
// The run id has to reach the server this runner starts, or the two would
// work on different database files. env.ts (imported above) sets it on this
// process, so passing the environment along carries it over.
const serverEnv = {
  WH_DB_PATH: E2E_DB_PATH,
  STORAGE_PATH: E2E_STORAGE_DIR,
  WH_SETTINGS_PATH: E2E_SETTINGS_PATH,
  WH_DIST_DIR: E2E_DIST_DIR,
  LIFF_SESSION_SECRET: E2E_SESSION_SECRET,
  WH_E2E_RUN_ID: E2E_RUN_ID,
}

// Workers inherit this process's environment, so setting the paths here means
// every spec sees them from its first import, with no import-order dance.
Object.assign(process.env, serverEnv)

// The server-only marker package resolves to a throwing stub unless the
// "react-server" export condition is set. Next.js sets it for the server
// bundle; the specs import the data layer directly (to seed rows), so the
// runner needs the same condition or every import of the data layer throws.
// The condition is set in the test:e2e script, because Node reads
// NODE_OPTIONS when the process starts, not while the config is loaded.

export default defineConfig({
  testDir: './tests/e2e',
  // One server and one database are shared by every spec. They run one at a
  // time and each seeds its own uniquely named rows instead of assuming an
  // empty database.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
  },
  // /liff is a phone surface: this is the shape every page is built and
  // manually tested for.
  projects: [{ name: 'chromium-mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'bun run e2e:server',
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: serverEnv,
  },
})
