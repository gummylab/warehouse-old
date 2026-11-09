# A database switch proves the live connection and expires both overview caches

Switching the database on `/settings` reported success as soon as the new file opened and migrated, and the pages then kept showing the previous file's numbers. The swap itself was working: the overview strip of `/order-images` and `/line-walks` is read through `unstable_cache` entries tagged `orders` and `line-walks`, keyed by the day argument rather than by the database file (ADR 0019). No write path expired those tags on a switch, so the next visits were answered from the old file until the 60 second revalidation ran out. A prefetched client payload was a second way the old page could survive the switch.

`applyDatabasePath` in `lib/db/index.ts` now runs `SELECT count(*) AS count FROM orders` on the probe handle and again on the live handle after the swap, and reports success only when both answer. A save means the connection the app reads through answered a query, because the operator's next click is the only feedback they get that the switch worked. On the same folder it verifies the live handle and reopens once when that read fails, since there is no earlier path to roll back to; when the live read fails after a real swap, the existing rollback writes the previous path back and the function throws. `saveDatabasePath` in `app/(admin)/settings/actions.ts` then calls `safeRevalidateTag('orders')`, `safeRevalidateTag('line-walks')` and `safeRevalidatePath('/', 'layout')` through the wrappers in `lib/cache/revalidate.ts`. The path sweep purges the Client Cache, so a prefetched RSC payload of either admin page cannot outlive the switch. `app/(admin)/settings/locations-card.tsx` replaces both path fields with a `role="status"` panel reading "กำลังเชื่อมต่อฐานข้อมูล…" while the transition is pending, shows "กำลังเชื่อมต่อ…" on the confirm button, and after success shows the toast "เชื่อมต่อฐานข้อมูลใหม่แล้ว" and calls `router.refresh()`.

## Considered options

- **Leave the cache alone and rely on the 60 second revalidation.** Rejected: the operator sees the previous database's numbers right after switching, which is the complaint this change answers.
- **Lower the revalidation or drop `unstable_cache`.** Rejected: ADR 0019 keeps the cache because each overview runs three window aggregations.
- **Expire the tags inside `applyDatabasePath`.** Rejected: unit tests call that function directly outside a request context, where revalidation throws. The action owns the invalidation.
- **Restart the process to switch files.** Rejected: the local app switches without a restart by design (ADR 0014).

## Consequences

- The first visit after a switch is slower: the overview cache is rebuilt and the client cache is purged, so both admin pages refetch.
- `tests/unit/db/apply-database-path.test.ts` proves the live handle follows the switch: an order written in one file is absent in the other.
- `tests/unit/settings/save-database-path.test.ts` asserts that both tags and the path are revalidated on success, and that nothing is revalidated when the target cannot open.
- `tests/e2e/admin-settings.spec.ts` switches to a second folder, writes an order and an item through the LIFF endpoints, asserts the first visit shows the new order and a KPI of 1/1/0, then switches back in a `finally` so later specs keep the run's own database.
