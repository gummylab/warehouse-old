// Keeps the `forms` table in step with lib/forms/registry.ts.
//
// Runs when the database is opened (lib/db/index.ts), next to seedLines, for
// the same reason: the read paths stay write-free.
//
// A form row exists exactly while the code still ships that form. That is
// what makes the FK on user_forms meaningful: a grant can never point at a
// page the app no longer has, and retiring a form removes its grants through
// the cascade instead of leaving them to be filtered later.
import { notInArray, sql } from 'drizzle-orm'

import { FORM_REGISTRY } from '../forms/registry'
import type { Orm } from './index'
import { forms } from './schema'

export function seedForms(orm: Orm): void {
  const rows = FORM_REGISTRY.map((form) => ({
    id: form.id,
    sortOrder: form.sortOrder,
  }))

  orm.transaction((tx) => {
    if (rows.length === 0) {
      // No form left in the registry: every grant goes with them.
      tx.delete(forms).run()
      return
    }

    // Retire forms the code no longer ships. Their grants cascade away.
    tx.delete(forms)
      .where(
        notInArray(
          forms.id,
          rows.map((row) => row.id),
        ),
      )
      .run()

    // Upsert instead of delete-then-insert: a changed sort order reaches an
    // existing database without deleting the row, which would cascade the
    // grants away on every open.
    tx.insert(forms)
      .values(rows)
      .onConflictDoUpdate({
        target: forms.id,
        set: { sortOrder: sql`excluded.sort_order` },
      })
      .run()
  })
}
