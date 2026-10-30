# Tests point the database and the upload folder at throwaway paths

An automated test never opens `database/wh.db` or the real `wh-order-images-storage` folder. Both locations are overridable by environment variable (`WH_DB_PATH`, `STORAGE_PATH`) and are read when they are used rather than when their module loads: `lib/db/index.ts` resolves the path inside `openDatabase()`, `lib/order-images/storage.ts` resolves the storage root on every call. Unset, both keep exactly the previous defaults, so the app behaves identically. A unit test file calls `isolateTestData()` (tests/unit/setup/db.ts), which points the variables at a temp directory and wipes the database and the uploads before every test; the e2e harness passes the same two variables to the server it starts.

Both values used to be fixed: the database path was `join(process.cwd(), 'database')` and the storage root was a module-level constant. That made the data layer untestable without touching real data. The alternative seams were worse. An in-memory SQLite database would skip the file, WAL and `ON DELETE CASCADE` behaviour that the tests exist to check, and replacing `getDb()` with a fake would test the fake instead of the schema. Deleting and recreating the real database on every run would destroy the operator's only copy of the data. Reading the locations at call time is the smallest change that keeps the default honest and lets a test own its files.

## Consequences

- `bun run test` is safe to run on a machine that holds real data: no test writes to `database/wh.db` or the production upload folder.
- The connection cached on `globalThis.__whDb` outlives a single test, so the harness closes it (`closeDb()`) around every test and after every file. Without that, the second file in a worker silently keeps writing to the first file's database.
- A new test file that touches the database or the uploads must call `isolateTestData()`. A file that forgets it will write to the real data.
- The e2e server also needs its own Next build output, since two Next servers sharing one `.next` directory fight over build artifacts (see `WH_DIST_DIR` in `next.config.ts`, ADR 0001 for why admin pages stay local-only). That directory is fixed rather than per run because `next dev` appends a `distDir`-specific type path to `tsconfig.json`'s `include` whenever it writes that file.
