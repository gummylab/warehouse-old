import { NextResponse } from 'next/server'

import { addItem, orderExists } from '@/lib/db/order-images'
import type { AddItemResult } from '@/lib/db/order-images'
import { authenticateFormRequest } from '@/lib/liff/order-session'
import { addItemSchema, parseJsonBody } from '@/lib/liff/schemas'

// Step 2 "add item" buttons: auto-numbered next single (+100) or next
// variety under a pack (+10). Omit parentItemId for a top-level single.
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/liff/order-images/orders/[id]/items'>,
) {
  const auth = await authenticateFormRequest(request, 'order-image')
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id: orderId } = await params
  if (!orderExists(orderId)) {
    return NextResponse.json({ error: 'order-not-found' }, { status: 404 })
  }

  // A missing parentItemId means "top level", so the field is optional.
  const body = await parseJsonBody(request, addItemSchema)
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 })
  }
  const parentItemId = body.data.parentItemId ?? null

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
