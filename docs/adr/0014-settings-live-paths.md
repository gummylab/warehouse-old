# The database and storage locations are editable on /settings and apply without a restart

The two paths that decide where every order, line walk and photo lives were only editable in `.env`, so changing either one meant a text editor and a restart of a process the operator is standing in front of. `/settings` existed as a placeholder. The operator rejected a read-only display of the current values, so the card `ตำแหน่งที่ตั้ง` edits both: `ฐานข้อมูล` and `ที่จัดเก็บ`. Each field saves on its own to `config/settings.json` and takes effect on the next operation. The file holds absolute paths, is machine specific, and is gitignored; `WH_SETTINGS_PATH` overrides its location for the test harnesses. Writes go through `settings.json.tmp` and `renameSync`, so a crash leaves the previous file instead of a truncated one.

A saved value wins over the environment: precedence is `config/settings.json`, then `WH_DB_PATH` or `STORAGE_PATH`, then the default inside the repo (`database/wh.db`, and `./` with the app folder appended). The saved value is the operator's latest choice, so it has to outrank a deployment default. Reads are uncached on purpose, because `storageRoot()` runs on every upload and every file lookup and a cached value would keep writing to the old folder after a save. An unreadable file is logged once and falls back to the environment, which is what the app used before the first save. `lib/settings/paths.ts` holds `databaseFile()` and `storageBase()`; `storageRoot()` stays in `lib/order-images/storage.ts` because appending `order-images` is its rule, and a base that is already a folder of that name is used as-is so the saved value reads back as the effective root.

`applyDatabasePath(requested)` opens and migrates the target in a throwaway handle before it touches the live connection, then persists the path, calls `closeDb()` and reopens. A typo cannot leave the dashboard without a database. If the reopen fails anyway, the previous path is written back and that file is reopened. A target equal to the current path is a no-op. `saveDatabasePath` returns `{ status: 'confirm' }` when the target is missing or zero bytes, because opening it would initialise an empty database in its place and look like every order disappeared; a second request with `confirm: true` proceeds. `saveStoragePath` creates the folder and rejects a path that is an existing file. Both start with `requireLocalAdminRequest()` (ADR 0007), since a server action is a plain POST endpoint.

## Considered options

- **Write `.env` from the app.** Rejected: the file holds the tunnel token, comments and quoting, and a form that rewrites it will eventually mangle it. `.env` stays the deployment default.
- **Store the settings in a `settings` table.** Rejected: the database path is one of the two values, so it cannot live inside the database it describes.
- **Require a restart before the change applies.** Rejected by the operator: the change is something they make at the machine.
- **Move the existing photos to the new root automatically.** Rejected: a copy can fail halfway and the database would then point at a partially filled folder. The card warns instead, and the operator copies the folder.

## Consequences

- Two sources describe the same thing. A value saved on `/settings` shadows the matching environment variable, and changing `.env` afterwards has no effect until the key is removed from `config/settings.json`.
- A second process on the same file, such as a dev server and a production server, does not see a database switch: each process caches its own connection. The storage root does apply per call.
- Switching to an older database runs the pending migrations on it, because `openAt` migrates the target before the swap.
- The old database file is never deleted or changed by a switch. Pointing the field back returns to the previous data.
- Changing the storage root hides the existing photos until the operator copies the folder, because `images.storage_key` is relative to the root.
- The settings file must sit where the app can write. A read-only checkout fails the save, and the filesystem error is shown inline under the field.
- Absolute paths make the settings file machine specific, which is why it is gitignored.
