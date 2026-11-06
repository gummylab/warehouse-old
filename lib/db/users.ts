import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'
import { io } from 'next/cache'

import { getOrm } from './index'
import { users } from './schema'
import type { RegisterUser } from './types'

export type { RegisterUser } from './types'

// The columns every read returns. Selecting them explicitly keeps the shape
// stable if the table later grows a column the client must not see, such as
// line_user_id.
const USER_COLUMNS = {
  id: users.id,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  status: users.status,
  requestedAt: users.requestedAt,
}

type UserRow = {
  id: string
  displayName: string
  avatarUrl: string | null
  status: RegisterUser['status']
  requestedAt: string
}

// The user list for the register screen.
//
// io() keeps the read out of the static shell and out of any cache, so
// every visit sees the current state of the table. That is the right
// trade for this list: it is the operator's approval queue, it changes
// whenever a request arrives or a decision is made, and it is read a
// handful of times a day by one person.
//
// A 'use cache' scope with a 'users' tag would serve it from cache and
// need an explicit invalidation on every write path. It would also tie
// this function to the Next.js cache runtime, which the unit tests cannot
// exercise (cacheLife() throws outside a use-cache scope).
export async function listUsers(): Promise<RegisterUser[]> {
  await io()
  const rows = getOrm().select(USER_COLUMNS).from(users).all()
  return rows.map(toRegisterUser)
}

// Used by the LIFF status endpoint. Sync and unaugmented: the caller has
// already verified the LINE identity, only the lookup happens here.
export function getUserByLineId(lineUserId: string): RegisterUser | undefined {
  const row = getOrm()
    .select(USER_COLUMNS)
    .from(users)
    .where(eq(users.lineUserId, lineUserId))
    .get()
  return row ? toRegisterUser(row) : undefined
}

// Used by the LIFF request endpoint; identity fields come from the
// LINE-verified profile, never from raw client claims (ADR 0003).
export function createPendingUser(input: {
  lineUserId: string
  displayName: string
  avatarUrl?: string
}): RegisterUser {
  const user: RegisterUser = {
    id: randomUUID(),
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  }
  getOrm()
    .insert(users)
    .values({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      requestedAt: user.requestedAt,
      lineUserId: input.lineUserId,
    })
    .run()
  return user
}

// Returns false when the row was already decided or does not exist, so the
// caller can surface that instead of pretending the write succeeded. The
// status = 'pending' guard makes a double-click on a queue button
// idempotent.
export function approvePendingUser(id: string, decidedAt: string): boolean {
  const result = getOrm()
    .update(users)
    .set({ status: 'approved', decidedAt })
    .where(and(eq(users.id, id), eq(users.status, 'pending')))
    .run()
  return result.changes > 0
}

// Rejecting removes the request entirely (ADR 0003): the user simply sees
// the request button again on their next visit, and no rejected status is
// ever stored. Guarded by status so an approved user cannot be deleted
// through the queue path.
export function deletePendingUser(id: string): boolean {
  const result = getOrm()
    .delete(users)
    .where(and(eq(users.id, id), eq(users.status, 'pending')))
    .run()
  return result.changes > 0
}

// Revoking access deletes the approved row outright, with the same storage
// trade-off as reject (ADR 0003): the user simply sees the request button
// again on their next LIFF visit. Guarded by status so the queue path
// (deletePendingUser) can never delete an approved row and vice versa.
export function deleteApprovedUser(id: string): boolean {
  const result = getOrm()
    .delete(users)
    .where(and(eq(users.id, id), eq(users.status, 'approved')))
    .run()
  return result.changes > 0
}

function toRegisterUser(row: UserRow): RegisterUser {
  return {
    id: row.id,
    displayName: row.displayName,
    // NULL means no picture: omit the key so the optional prop stays honest.
    avatarUrl: row.avatarUrl ?? undefined,
    status: row.status,
    requestedAt: row.requestedAt,
  }
}
