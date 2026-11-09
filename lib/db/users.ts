import 'server-only'

import { cache } from 'react'

import { randomUUID } from 'node:crypto'

import { and, asc, eq } from 'drizzle-orm'
import { io } from 'next/cache'

import { normalizeFormIds } from '../forms/registry'
import { getOrm } from './index'
import { forms, userForms, users } from './schema'
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
  const orm = getOrm()
  const rows = orm.select(USER_COLUMNS).from(users).all()
  // One extra read for the whole list, grouped in JS: a per-user query would
  // be N+1, and a join would force USER_COLUMNS to change shape.
  const grants = readGrantsByUser()
  return rows.map((row) => toRegisterUser(row, grants.get(row.id) ?? []))
}

// Form ids per user, in display order. Reads the forms table so a grant whose
// form was retired can never reach a caller.
function readGrantsByUser(): Map<string, string[]> {
  const rows = getOrm()
    .select({ userId: userForms.userId, formId: userForms.formId })
    .from(userForms)
    .innerJoin(forms, eq(forms.id, userForms.formId))
    .orderBy(asc(forms.sortOrder))
    .all()

  const byUser = new Map<string, string[]>()
  for (const row of rows) {
    const current = byUser.get(row.userId)
    if (current) current.push(row.formId)
    else byUser.set(row.userId, [row.formId])
  }
  return byUser
}

// The same list for one user. Used by the identity lookup every /api/liff
// request goes through, so it stays a single indexed read.
function readFormIds(userId: string): string[] {
  return getOrm()
    .select({ formId: userForms.formId })
    .from(userForms)
    .innerJoin(forms, eq(forms.id, userForms.formId))
    .where(eq(userForms.userId, userId))
    .orderBy(asc(forms.sortOrder))
    .all()
    .map((row) => row.formId)
}

// Used by the LIFF status endpoint. Sync and unaugmented: the caller has
// already verified the LINE identity, only the lookup happens here.
function _getUserByLineId(lineUserId: string): RegisterUser | undefined {
  const row = getOrm()
    .select(USER_COLUMNS)
    .from(users)
    .where(eq(users.lineUserId, lineUserId))
    .get()
  return row ? toRegisterUser(row, readFormIds(row.id)) : undefined
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
    // A request carries no grants; the admin picks them at approval.
    formIds: [],
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
// idempotent. The status flip and its grants commit in one transaction: an
// approval without the chosen form set would lose the admin's choice.
export function approvePendingUser(
  id: string,
  decidedAt: string,
  formIds: readonly string[],
): boolean {
  const grants = normalizeFormIds(formIds)
  return getOrm().transaction((tx) => {
    const result = tx
      .update(users)
      .set({ status: 'approved', decidedAt })
      .where(and(eq(users.id, id), eq(users.status, 'pending')))
      .run()
    if (result.changes === 0) return false

    if (grants.length > 0) {
      tx.insert(userForms)
        .values(grants.map((formId) => ({ userId: id, formId })))
        .run()
    }
    return true
  })
}

// Replaces the whole grant set from the approved table's edit dialog.
// Replacement rather than merge: the dialog shows the complete set, so a form
// that is no longer checked must lose its row. An empty set is valid and
// means the user may open no form. Returns false when the row does not exist
// or is not approved, which also keeps a pending row from gaining grants
// through this path.
export function setUserForms(id: string, formIds: readonly string[]): boolean {
  const grants = normalizeFormIds(formIds)
  return getOrm().transaction((tx) => {
    const row = tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.status, 'approved')))
      .get()
    if (!row) return false

    tx.delete(userForms).where(eq(userForms.userId, id)).run()
    if (grants.length > 0) {
      tx.insert(userForms)
        .values(grants.map((formId) => ({ userId: id, formId })))
        .run()
    }
    return true
  })
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

function toRegisterUser(row: UserRow, formIds: string[]): RegisterUser {
  return {
    id: row.id,
    displayName: row.displayName,
    // NULL means no picture: omit the key so the optional prop stays honest.
    avatarUrl: row.avatarUrl ?? undefined,
    status: row.status,
    requestedAt: row.requestedAt,
    formIds,
  }
}

// React cache() wrappers (within-request dedup).
export const getUserByLineId = cache(_getUserByLineId)
