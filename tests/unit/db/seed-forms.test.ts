import { describe, expect, it } from 'vitest'

import { getOrm } from '@/lib/db'
import { forms } from '@/lib/db/schema'
import { seedForms } from '@/lib/db/seed-forms'
import {
  approvePendingUser,
  createPendingUser,
  getUserByLineId,
} from '@/lib/db/users'
import { FORM_REGISTRY } from '@/lib/forms/registry'

import { isolateTestData } from '../setup/db'

// The seed runs on every database open, so two things must hold at all times:
// a row exists exactly while the registry ships that form, and re-seeding
// never deletes a grant that is still valid.
isolateTestData()

const DECIDED_AT = '2026-10-19T03:00:00.000Z'

function formRows() {
  return getOrm()
    .select()
    .from(forms)
    .all()
    .sort((a, b) => a.id.localeCompare(b.id))
}

function expectedRows() {
  return FORM_REGISTRY.map((form) => ({ id: form.id, sortOrder: form.sortOrder })).sort((a, b) =>
    a.id.localeCompare(b.id),
  )
}

describe('seedForms', () => {
  it('writes every registry form with its sort order', () => {
    expect(formRows()).toEqual(expectedRows())
  })

  it('retires a form the registry no longer ships, and its grants', () => {
    const user = createPendingUser({ lineUserId: 'U-retired', displayName: 'Retired Form' })
    approvePendingUser(user.id, DECIDED_AT, ['order-image'])

    // A row written by an older build, before the form was removed from the
    // registry.
    getOrm().insert(forms).values({ id: 'retired-form', sortOrder: 99 }).run()
    seedForms(getOrm())

    expect(formRows()).toEqual(expectedRows())
    // The surviving form keeps its grant through the re-seed.
    expect(getUserByLineId('U-retired')?.formIds).toEqual(['order-image'])
  })

  it('updates a changed sort order without deleting the row or its grants', () => {
    const user = createPendingUser({ lineUserId: 'U-reseed', displayName: 'Reseed' })
    approvePendingUser(user.id, DECIDED_AT, ['order-image'])

    getOrm().update(forms).set({ sortOrder: 99 }).run()
    seedForms(getOrm())

    expect(formRows()).toEqual(expectedRows())
    expect(getUserByLineId('U-reseed')?.formIds).toEqual(['order-image'])
  })
})
