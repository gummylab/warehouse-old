'use server'

import { revalidatePath } from 'next/cache'

import { approvePendingUser, deletePendingUser } from '@/lib/db/users'

// Server action result: null on success, otherwise an error message (Thai,
// rendered next to the button) shown when the write did not apply.
export type DecideActionState = { error: string } | null

export async function approveUser(id: string): Promise<DecideActionState> {
  const updated = approvePendingUser(id, new Date().toISOString())
  if (!updated) {
    return { error: 'ไม่พบคำขอนี้ หรือดำเนินการไปแล้ว ลองรีเฟรชหน้าอีกครั้ง' }
  }
  revalidatePath('/register')
  return null
}

// Rejecting deletes the request row (ADR 0003); the LIFF user sees the
// request button again on their next visit.
export async function rejectUser(id: string): Promise<DecideActionState> {
  const deleted = deletePendingUser(id)
  if (!deleted) {
    return { error: 'ไม่พบคำขอนี้ หรือดำเนินการไปแล้ว ลองรีเฟรชหน้าอีกครั้ง' }
  }
  revalidatePath('/register')
  return null
}
