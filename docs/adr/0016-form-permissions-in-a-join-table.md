# Form permissions live in a form catalog and a join table

Approval used to imply every form: `/liff/forms` showed both hardcoded cards to any approved user. Permission is now decided per user, so it needs somewhere to live. `forms(id, sort_order)` is the catalog and `user_forms(user_id, form_id)` is the grant, one row per (user, form) with a composite primary key and a cascading foreign key on both sides. The catalog is seeded from `lib/forms/registry.ts` on every database open, next to the line catalog; the registry also owns each form's path and reads its label from `PAGE_TITLES`, so a form's id, route and display name come from one list. The seed upserts a changed sort order and deletes a catalog row the registry no longer ships, and the foreign key cascade removes that form's grants with it.

The foreign key is the point: a grant cannot name a form that does not exist, so no read or write has to defend that boundary in application code. Adding a form is an entry in the registry with no migration, and retiring one removes its rows at the next open instead of leaving grants to be filtered later.

## Considered options

- **A JSON `allowed_forms` column on `users`.** Rejected: no referential integrity, so every read and write would validate against the registry, and a stale id would survive until something noticed.
- **A database-managed catalog with an admin CRUD page.** Rejected: a row still needs a route and a page in code, so the catalog and the app would drift, and the admin could create a form that opens nothing.
- **A join table without a catalog table.** Rejected: the foreign key needs a referential target, and the sort order has to live somewhere both database reads and the hub can use.

## Consequences

- Adding or removing a form is a registry edit followed by the next database open; there is no migration for either.
- Removing a form silently revokes it from every user, because the grants go with the catalog row.
- The catalog is not editable from `/register` or any admin page; it exists to be the target of grants, and the registry stays the only source.
- `normalizeFormIds` drops ids the registry does not know, so a forged request grants nothing even before the foreign key would reject it.
