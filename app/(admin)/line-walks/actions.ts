'use server'

import { requireLocalAdminRequest } from '@/lib/admin/authorize'
import { deleteLineWalk } from '@/lib/db/line-walks'

export async function deleteLineWalkAction(id: string): Promise<{ ok: boolean }> {
  await requireLocalAdminRequest()
  deleteLineWalk(id)
  return { ok: true }
}
