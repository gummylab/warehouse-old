import { describe, expect, it } from 'vitest'

import { getOrm } from '@/lib/db'
import { userForms } from '@/lib/db/schema'
import {
  approvePendingUser,
  createPendingUser,
  deleteApprovedUser,
  deletePendingUser,
  getUserByLineId,
  listUsers,
  setUserForms,
} from '@/lib/db/users'

import { isolateTestData } from '../setup/db'

// The users table is the whole access-control record: status drives every
// /api/liff answer and the register queue. These tests run against a real
// SQLite file (in a temp dir), so the CHECK constraint, the unique index and
// the status guards in the SQL are all exercised, not mocked away.
isolateTestData()

const DECIDED_AT = '2026-10-19T03:00:00.000Z'

function requestAccess(lineUserId: string, displayName = 'Line User') {
  return createPendingUser({ lineUserId, displayName })
}

// better-sqlite3 exposes the SQLite result code on the error, which is what
// lib/db/order-images.ts withRetry keys off too.
function errorCodeOf(fn: () => unknown): string | undefined {
  try {
    fn()
    return undefined
  } catch (error) {
    return (error as { code?: string }).code
  }
}

describe('createPendingUser', () => {
  it('stores a pending request with an ISO timestamp', () => {
    const user = requestAccess('U-1', 'Somchai')

    expect(user.id).not.toBe('')
    expect(user.displayName).toBe('Somchai')
    expect(user.status).toBe('pending')
    expect(Number.isNaN(Date.parse(user.requestedAt))).toBe(false)
  })

  it('reads the row back through the LINE id', () => {
    const user = requestAccess('U-2')

    expect(getUserByLineId('U-2')).toEqual(user)
  })

  it('leaves avatarUrl undefined when LINE returned no picture', () => {
    const user = requestAccess('U-3')

    expect(user.avatarUrl).toBeUndefined()
    expect(getUserByLineId('U-3')?.avatarUrl).toBeUndefined()
  })

  it('keeps the LINE picture when there is one', () => {
    const user = createPendingUser({
      lineUserId: 'U-4',
      displayName: 'Somchai',
      avatarUrl: 'https://profile.line-scdn.net/abc',
    })

    expect(user.avatarUrl).toBe('https://profile.line-scdn.net/abc')
    expect(getUserByLineId('U-4')?.avatarUrl).toBe('https://profile.line-scdn.net/abc')
  })

  it('returns undefined for a LINE user who never requested access', () => {
    expect(getUserByLineId('U-unknown')).toBeUndefined()
  })

  it('refuses a second request from the same LINE user', () => {
    requestAccess('U-5')

    // The unique index on line_user_id is the last line of defence behind the
    // endpoint's own lookup.
    expect(errorCodeOf(() => requestAccess('U-5'))).toBe('SQLITE_CONSTRAINT_UNIQUE')
  })
})

describe('approvePendingUser', () => {
  it('approves a pending request and is idempotent for a second click', () => {
    const user = requestAccess('U-6')

    expect(approvePendingUser(user.id, DECIDED_AT, ['order-image'])).toBe(true)
    expect(approvePendingUser(user.id, DECIDED_AT, ['order-image'])).toBe(false)
    expect(getUserByLineId('U-6')?.status).toBe('approved')
  })

  it('reports a miss for an unknown id instead of pretending it wrote', () => {
    expect(approvePendingUser('no-such-id', DECIDED_AT, [])).toBe(false)
  })
})

describe('deletePendingUser (reject)', () => {
  it('removes the request entirely so the user can ask again', () => {
    const user = requestAccess('U-7')

    expect(deletePendingUser(user.id)).toBe(true)
    expect(getUserByLineId('U-7')).toBeUndefined()
  })

  it('cannot be used to delete an approved user', () => {
    const user = requestAccess('U-8')
    approvePendingUser(user.id, DECIDED_AT, ['order-image'])

    expect(deletePendingUser(user.id)).toBe(false)
    expect(getUserByLineId('U-8')?.status).toBe('approved')
  })
})

describe('deleteApprovedUser (revoke)', () => {
  it('removes the approved row so access has to be requested again', () => {
    const user = requestAccess('U-9')
    approvePendingUser(user.id, DECIDED_AT, ['order-image'])

    expect(deleteApprovedUser(user.id)).toBe(true)
    expect(getUserByLineId('U-9')).toBeUndefined()
  })

  it('cannot be used to delete a pending request', () => {
    const user = requestAccess('U-10')

    expect(deleteApprovedUser(user.id)).toBe(false)
    expect(getUserByLineId('U-10')?.status).toBe('pending')
  })

  it('reports a miss for an unknown id', () => {
    expect(deleteApprovedUser('no-such-id')).toBe(false)
  })
})

describe('listUsers', () => {
  it('lists every row for the register screen', async () => {
    const pending = requestAccess('U-11')
    const approved = requestAccess('U-12')
    approvePendingUser(approved.id, DECIDED_AT, ['order-image'])

    const users = await listUsers()
    const byId = new Map(users.map((user) => [user.id, user]))

    expect(users).toHaveLength(2)
    expect(byId.get(pending.id)?.status).toBe('pending')
    expect(byId.get(pending.id)?.formIds).toEqual([])
    expect(byId.get(approved.id)?.status).toBe('approved')
    expect(byId.get(approved.id)?.formIds).toEqual(['order-image'])
  })
})

// The grant table is the access-control record the LIFF gate and every form
// endpoint read. These cases cover the paths the admin screen can take:
// approve with a set, replace it from the edit dialog, and lose it on revoke.
describe('form grants', () => {
  function countGrants(): number {
    return getOrm().select().from(userForms).all().length
  }

  it('stores the chosen forms in display order', () => {
    const user = requestAccess('U-forms-1')

    expect(approvePendingUser(user.id, DECIDED_AT, ['line-walk', 'order-image'])).toBe(true)

    expect(getUserByLineId('U-forms-1')?.formIds).toEqual(['order-image', 'line-walk'])
  })

  it('drops ids the registry does not know', () => {
    const user = requestAccess('U-forms-2')

    approvePendingUser(user.id, DECIDED_AT, ['order-image', 'no-such-form'])

    expect(getUserByLineId('U-forms-2')?.formIds).toEqual(['order-image'])
  })

  it('approves a user with no form at all', () => {
    const user = requestAccess('U-forms-3')

    expect(approvePendingUser(user.id, DECIDED_AT, [])).toBe(true)
    expect(getUserByLineId('U-forms-3')?.formIds).toEqual([])
  })

  it('replaces the whole set from the edit path, including down to zero', () => {
    const user = requestAccess('U-forms-4')
    approvePendingUser(user.id, DECIDED_AT, ['order-image'])

    expect(setUserForms(user.id, ['line-walk'])).toBe(true)
    expect(getUserByLineId('U-forms-4')?.formIds).toEqual(['line-walk'])

    expect(setUserForms(user.id, [])).toBe(true)
    expect(getUserByLineId('U-forms-4')?.formIds).toEqual([])
  })

  it('refuses to edit grants on a pending row', () => {
    const user = requestAccess('U-forms-5')

    expect(setUserForms(user.id, ['order-image'])).toBe(false)
    expect(getUserByLineId('U-forms-5')?.formIds).toEqual([])
  })

  it('loses the grants when the user is revoked', () => {
    const user = requestAccess('U-forms-6')
    approvePendingUser(user.id, DECIDED_AT, ['order-image'])
    expect(countGrants()).toBe(1)

    deleteApprovedUser(user.id)

    // ADR 0003 deletes the users row; the FK cascade removes the grant with
    // it, so a fresh request cannot inherit the old permissions.
    expect(countGrants()).toBe(0)
  })
})
