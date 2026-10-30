'use server'

import { revalidatePath } from 'next/cache'

import { requireLocalAdminRequest } from '@/lib/admin/authorize'
import { approvePendingUser, deleteApprovedUser, deletePendingUser } from '@/lib/db/users'

// Server action result: null on success, otherwise an error message (Thai,
// rendered next to the button) shown when the write did not apply.
export type DecideActionState = { error: string } | null

// A server action is a plain POST endpoint, so it verifies for itself who is
// calling instead of trusting that the page that rendered the button is the
// only way in (see lib/admin/authorize.ts). The check runs first, before any
// database write.
export async function approveUser(id: string): Promise<DecideActionState> {
  await requireLocalAdminRequest()
  const updated = approvePendingUser(id, new Date().toISOString())
  if (!updated) {
    return { error: 'ไม่พบคำขอนี้ หรือดำเนินการไปแล้ว ลองรีเฟรชหน้าอีกครั้ง' }
  }
  // The queue is read fresh on every visit (io() in listUsers), so there is
  // no cache to expire. What this call does is make the server re-render
  // the current route as part of the action's response, so the decided row
  // leaves the queue in the same roundtrip.
  revalidatePath('/register')
  return null
}

// Rejecting deletes the request row (ADR 0003); the LIFF user sees the
// request button again on their next visit.
export async function rejectUser(id: string): Promise<DecideActionState> {
  await requireLocalAdminRequest()
  const deleted = deletePendingUser(id)
  if (!deleted) {
    return { error: 'ไม่พบคำขอนี้ หรือดำเนินการไปแล้ว ลองรีเฟรชหน้าอีกครั้ง' }
  }
  revalidatePath('/register')
  return null
}

// Revoking deletes the approved row; the user must request access again
// through LIFF before using the system. The client only reaches this after
// its confirm dialog.
export async function revokeUser(id: string): Promise<DecideActionState> {
  await requireLocalAdminRequest()
  const deleted = deleteApprovedUser(id)
  if (!deleted) {
    return { error: 'ไม่พบผู้ใช้นี้ หรือเพิกถอนไปแล้ว ลองรีเฟรชหน้าอีกครั้ง' }
  }
  revalidatePath('/register')
  return null
}
