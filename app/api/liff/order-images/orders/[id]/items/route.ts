import { NextResponse } from 'next/server'

import { addItem, orderExists } from '@/lib/db/order-images'
import type { AddItemResult } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'

// Step 2 "add item" buttons: auto-numbered next single (+100) or next
// variety under a pack (+10). Omit parentItemId for a top-level single.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id: orderId } = await params
  if (!orderExists(orderId)) {
    return NextResponse.json({ error: 'order-not-found' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as
    | { parentItemId?: unknown }
    | null
  const rawParent = body?.parentItemId
  // Anything that is not a non-empty string or explicit null means
  // "top-level", matching the omitted-field behaviour.
  const parentItemId = typeof rawParent === 'string' && rawParent.length > 0 ? rawParent : null

  const result = addItem(orderId, parentItemId, auth.createdBy)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: errorStatus(result) })
  }
  return NextResponse.json({ item: result.item }, { status: 201 })
}

function errorStatus(result: Extract<AddItemResult, { ok: false }>): number {
  switch (result.error) {
    case 'parent-missing':
      return 404
    case 'pack-full':
      // A real outcome of the +9/+90 limits, not a client bug.
      return 409
    case 'variety-of-variety':
      return 400
  }
}
