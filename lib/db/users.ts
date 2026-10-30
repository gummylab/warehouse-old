import 'server-only'

import { randomUUID } from 'node:crypto'

import { io } from 'next/cache'

import { getDb } from './index'
import type { RegisterUser } from './types'

export type { RegisterUser } from './types'

// Raw column shape as SQLite returns it: snake_case with the nullable
// columns typed explicitly so the mapping below must handle them.
type UserRow = {
  id: string
  display_name: string
  avatar_url: string | null
  status: RegisterUser['status']
  requested_at: string
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
  const rows = getDb()
    .prepare('SELECT id, display_name, avatar_url, status, requested_at FROM users')
    .all() as UserRow[]
  return rows.map(toRegisterUser)
}

// Used by the LIFF status endpoint. Sync and unaugmented: the caller has
// already verified the LINE identity, only the lookup happens here.
export function getUserByLineId(lineUserId: string): RegisterUser | undefined {
  const row = getDb()
    .prepare(
      'SELECT id, display_name, avatar_url, status, requested_at FROM users WHERE line_user_id = ?',
    )
    .get(lineUserId) as UserRow | undefined
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
  getDb()
    .prepare(
      'INSERT INTO users (id, display_name, avatar_url, status, requested_at, line_user_id) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      user.id,
      user.displayName,
      user.avatarUrl ?? null,
      user.status,
      user.requestedAt,
      input.lineUserId,
    )
  return user
}

// Returns false when the row was already decided or does not exist, so the
// caller can surface that instead of pretending the write succeeded. The
// status = 'pending' guard makes a double-click on a queue button
// idempotent.
export function approvePendingUser(id: string, decidedAt: string): boolean {
  const result = getDb()
    .prepare(
      "UPDATE users SET status = 'approved', decided_at = ? WHERE id = ? AND status = 'pending'",
    )
    .run(decidedAt, id)
  return result.changes > 0
}

// Rejecting removes the request entirely (ADR 0003): the user simply sees
// the request button again on their next visit, and no rejected status is
// ever stored. Guarded by status so an approved user cannot be deleted
// through the queue path.
export function deletePendingUser(id: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM users WHERE id = ? AND status = 'pending'")
    .run(id)
  return result.changes > 0
}

// Revoking access deletes the approved row outright, with the same storage
// trade-off as reject (ADR 0003): the user simply sees the request button
// again on their next LIFF visit. Guarded by status so the queue path
// (deletePendingUser) can never delete an approved row and vice versa.
export function deleteApprovedUser(id: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM users WHERE id = ? AND status = 'approved'")
    .run(id)
  return result.changes > 0
}

function toRegisterUser(row: UserRow): RegisterUser {
  return {
    id: row.id,
    displayName: row.display_name,
    // NULL means no picture: omit the key so the optional prop stays honest.
    avatarUrl: row.avatar_url ?? undefined,
    status: row.status,
    requestedAt: row.requested_at,
  }
}
