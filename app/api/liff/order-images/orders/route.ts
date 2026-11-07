import { NextResponse } from 'next/server'

import { safeRevalidateTag } from '@/lib/cache/revalidate'
import { findOrCreateOrder, lineExists } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'
import { orderLookupSchema, parseJsonBody } from '@/lib/liff/schemas'
import {
  isValidCalendarDate,
  isValidOrderNumber,
  normalizeOrderNumber,
} from '@/lib/order-images/validation'

// Step 1 of the form: find the order by number+date+line, creating it on
// first sight. Items are created in step 2 through the auto-numbered add
// buttons, so this response carries the order id only. Errors are machine
// codes; the form maps them to Thai copy so wording stays in one place.
export async function POST(request: Request) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  // The schema checks the shape of the body; the shared helpers check the
  // value. Both live on the server, so a hand-crafted request is held to
  // the same rules as the form.
  const body = await parseJsonBody(request, orderLookupSchema)
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 })
  }

  const orderNumber = normalizeOrderNumber(body.data.orderNumber)
  if (!isValidOrderNumber(orderNumber)) {
    return NextResponse.json({ error: 'invalid-order-number' }, { status: 400 })
  }
  if (!isValidCalendarDate(body.data.orderDate)) {
    return NextResponse.json({ error: 'invalid-order-date' }, { status: 400 })
  }
  if (!lineExists(body.data.line)) {
    return NextResponse.json({ error: 'unknown-line' }, { status: 400 })
  }

  const order = findOrCreateOrder({
    orderNumber,
    orderDate: body.data.orderDate,
    line: body.data.line,
    createdBy: auth.createdBy,
  })
  safeRevalidateTag('orders')
  return NextResponse.json({ orderId: order.id })
}
