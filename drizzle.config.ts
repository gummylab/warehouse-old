import { defineConfig } from 'drizzle-kit'

// Configuration for the drizzle-kit CLI only; the app never imports it.
//
// `generate` reads `schema` and writes SQL under `out`. `push` and `studio`
// also need a file to talk to, so `url` mirrors the path `lib/db/index.ts`
// opens, including the WH_DB_PATH override the tests use.
export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.WH_DB_PATH ?? 'database/wh.db',
  },
  // `strict` keeps the generator conservative about destructive changes.
  // `verbose` stays off: `bun run build` runs the generator on every build
  // (scripts/check-migrations.ts), and the statement-by-statement dump buries
  // the rest of the build log.
  strict: true,
})
