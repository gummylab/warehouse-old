# The schema lives in Drizzle and reaches the database as generated migrations

The data layer writes through `drizzle-orm@0.45.4` on top of the existing better-sqlite3 connection, and `lib/db/schema.ts` is now the single source of truth for the six tables (`users`, `lines`, `orders`, `items`, `images`, `line_walks`), their indexes, unique indexes and CHECK constraints. `drizzle-kit@0.31.11` generates the SQL into `drizzle/`, and `lib/db/index.ts` applies whatever has not run yet with `migrate(orm, { migrationsFolder })`, after the WAL, `busy_timeout` and foreign-key pragmas and before the line catalog is seeded. The migration runner takes the Drizzle instance rather than the raw driver because it runs through the dialect. Constrained text columns carry a type-level `enum` option (status, shift, package); the CHECK constraint in the generated SQL is still what the file enforces, so a write that bypasses TypeScript is rejected by SQLite too.

The call sites forced the driver choice. Server components and unit tests call the data layer directly, and `saveImage` writes the image file with `writeFileSync` inside a transaction, so the API had to stay synchronous. The better-sqlite3 driver is the only Drizzle adapter that keeps it.

The hand-written `CREATE TABLE IF NOT EXISTS` bootstrap could add tables but never change one. Changing the orders unique index once left an older branch opening a database whose shape no longer matched its code. Generated migrations end that class of failure, and typed rows turn a renamed column or a missing property into a compile error instead of a runtime surprise. The data-layer functions kept their signatures, so pages, route handlers, unit tests and e2e specs did not change. Raw `sql` fragments remain for what the query builder does not express well: `ESCAPE '\'` on LIKE, `substr(walk_date, 1, 7)` buckets, `count(*)` aggregates, correlated item counts and `ORDER BY rowid` for the line catalog.

This supersedes only the "without an ORM" part of [ADR 0002](0002-sqlite-local-user-database.md). Its decision to keep user data in a single local SQLite file still stands.

## Considered options

- **Kysely.** A typed SQL builder with no runtime engine. Rejected: its API is async, so every data-layer function, every caller and the tests would have become async.
- **Prisma.** Rejected: it ships a query engine, it is async, and it is heavier than a single-file local app needs.
- **TypeORM, MikroORM, Sequelize.** Rejected: async and heavier, with no benefit here.
- **Raw SQL with a manual `schema_version` table.** Rejected: less code, but still no migration generation and no typed rows.

## Consequences

- `drizzle/` is read at runtime by `migrate()`, so it must ship with the app. It is committed and resolved from `process.cwd()` under `next start`; a future standalone build would have to trace it into the output.
- Changing the schema means editing `lib/db/schema.ts` and running `bun run db:generate`. The generated SQL is committed. Hand-editing a database is no longer a supported step.
- The build runs the generator before Next.js starts. `scripts/check-migrations.ts` fingerprints every file under `drizzle/` by content, runs `drizzle-kit generate`, fingerprints the folder again and compares, so an edit to `lib/db/schema.ts` without a committed migration stops the build instead of reaching `migrate()` at runtime. The generated migration is left in the working tree for review and commit. The build therefore needs `drizzle-kit`, a dev dependency: a build that installs only production dependencies fails on a missing binary.
- A database file created before this change has no `__drizzle_migrations` table, so `migrate()` would try to create the existing tables and fail. The local file was copied aside outside the repo and then deleted, so the first migration ran on an empty file.
- Branches older than this change can no longer open the new database file.
- A failed migration closes the handle before the error is rethrown, because a half-open handle keeps the file locked on Windows and makes the next test file fail with EPERM instead of the real error.
- `listLines` orders by `rowid` to keep the seeding order the operator is used to; ordering by `name` would resort the dropdown by Thai collation.
