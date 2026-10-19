import { NextResponse } from 'next/server'

import { findOrCreateOrder, lineExists } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'
import {
  isValidCalendarDate,
  isValidOrderNumber,
  normalizeOrderNumber,
} from '@/lib/order-images/validation'

// Step 1 of the form: find the order by number+date, creating it on first
// sight. Items are created in step 2 through the auto-numbered add
// buttons, so this response carries the order id only. Errors are machine
// codes; the form maps them to Thai copy so wording stays in one place.
export async function POST(request: Request) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const body = (await request.json().catch(() => null)) as {
    orderNumber?: unknown
    orderDate?: unknown
    line?: unknown
  } | null

  const orderNumber = typeof body?.orderNumber === 'string' ? normalizeOrderNumber(body.orderNumber) : ''
  if (!isValidOrderNumber(orderNumber)) {
    return NextResponse.json({ error: 'invalid-order-number' }, { status: 400 })
  }
  const orderDate = typeof body?.orderDate === 'string' ? body.orderDate : ''
  if (!isValidCalendarDate(orderDate)) {
    return NextResponse.json({ error: 'invalid-order-date' }, { status: 400 })
  }
  const line = typeof body?.line === 'string' ? body.line : ''
  if (!lineExists(line)) {
    return NextResponse.json({ error: 'unknown-line' }, { status: 400 })
  }

  const order = findOrCreateOrder({
    orderNumber,
    orderDate,
    line,
    createdBy: auth.createdBy,
  })
  return NextResponse.json({ orderId: order.id })
}
