import { NextResponse } from 'next/server'

import { getOrderDetail } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'

// Full order state for step 2: items (varieties nested) with their images.
// The client refetches this after every mutation instead of patching local
// state, so the server stays the single source of truth.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id } = await params
  const detail = getOrderDetail(id)
  if (!detail) {
    return NextResponse.json({ error: 'order-not-found' }, { status: 404 })
  }
  return NextResponse.json(detail)
}
