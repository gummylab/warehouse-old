# User data lives in a local SQLite file, read and written without an ORM

Registration data (the users shown on the register screen) is stored in a single better-sqlite3 file at `database/wh.db`, opened from server code with plain SQL. The schema bootstraps on first open via `CREATE TABLE IF NOT EXISTS` in `lib/db/index.ts`; there is no migration tool, so changing columns later means a manual `ALTER TABLE`. One table with no joins or reporting queries did not justify drizzle, and a local file keeps the dashboard self-contained with no database server to run.

Access is server-only: the register page reads through `lib/db/users.ts` and approve/reject are server actions, so there is no REST layer yet. When the LIFF side needs this data, its endpoints live under `/api/liff/*` — a path the owner adds to the WAF allowlist at Cloudflare (ADR 0001), keeping the LIFF pages under `/liff` and the API under its own prefix.

## Consequences

- `database/*.db*` is gitignored; every clone starts with an empty database and no seed data.
- better-sqlite3 is a native module on Next.js's default `serverExternalPackages` list, so no bundler config was needed.
- With `cacheComponents` enabled, the read path calls `io()` so the user list is never baked into build output.
- The first external writer (LINE bot or LIFF endpoint) fills in `line_user_id`, which the schema already reserves.
