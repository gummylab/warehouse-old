# A write expires the overview cache for the very next read

The top strip of `/order-images` and `/line-walks` — the three summary cells and the chart — is read through `unstable_cache` with a 60 second revalidation and a tag (`orders`, `line-walks`). The operator logs work on a phone through the LIFF form and then opens the admin page on the same machine. Passing the `'max'` profile only marked the tag stale: that read was answered from the old entry while the new one built in the background, so the dashboard showed the numbers from before the write until a second reload.

`safeRevalidateTag` in `lib/cache/revalidate.ts` now calls `revalidateTag(tag, { expire: 0 })`, which makes the next read block until the entry is rebuilt. Every write that can change a number the overview counts expires the tag: the admin actions reach it through `revalidateOrder()` in `app/(admin)/order-images/actions.ts`, with one direct call in the delete-order action, and the LIFF routes that change a counted number call it themselves, from the line-walk save and order creation through item add and delete to photo upload and delete. One edit to the wrapper therefore covers both overviews and every write that changes a counted number. The one write left out is the LIFF `PATCH` that labels a photo with a package: the overview counts orders, items and photos, never package labels, so relabelling changes no number it shows.

## Considered options

- **Use `updateTag(tag)` in Server Actions.** Rejected: it is the read-your-own-writes API, but it only works in Server Actions, and the writes that matter here arrive through Route Handlers from the phone, where it throws. That would leave two rules for the same cache.
- **Keep `'max'` and shorten the 60 second revalidation.** Rejected: it still serves one stale read, which is the exact complaint, and a shorter TTL pays the aggregation cost on every unrelated load.
- **Drop `unstable_cache` and compute the overview on every request.** Rejected: each overview runs three window aggregations (day, month, year) and the admin reloads the page constantly. The cache stays for that reason.

## Consequences

- The first read after a mutation blocks until the overview is recomputed, rather than returning stale data at once. That is a local SQLite aggregation in the millisecond range, and it blocks only readers who arrive during that window.
- The 60 second `revalidate` stays as a safety net for data changed outside the app, such as a direct database edit or a restored file, which no tag invalidation would see.
- A caller that genuinely wants stale-while-revalidate can no longer get it from `safeRevalidateTag`. It must call `revalidateTag` directly with its own profile, and should say why in a comment.
- Both `tests/e2e/admin-line-walks.spec.ts` and `tests/e2e/admin-order-images.spec.ts` pin the behaviour: each primes an overview, writes through the real endpoint (a line-walk save and an item add respectively), reloads once and expects the new numbers. Dropping the tag call from the write under test makes that spec fail.
