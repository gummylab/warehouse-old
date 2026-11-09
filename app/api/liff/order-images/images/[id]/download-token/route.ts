import { NextResponse } from 'next/server'

import { getImageFile } from '@/lib/db/order-images'
import { createDownloadToken } from '@/lib/liff/download-token'
import { authenticateFormRequest } from '@/lib/liff/order-session'

// Mints the short-lived token the client appends when it hands the download
// to the external browser. This page is authenticated, so the mint carries
// the session; the external browser cannot.
export async function GET(
  request: Request,
  { params }: RouteContext<'/api/liff/order-images/images/[id]/download-token'>,
) {
  const auth = await authenticateFormRequest(request, 'order-image')
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id } = await params
  if (!getImageFile(id)) {
    return NextResponse.json({ error: 'image-not-found' }, { status: 404 })
  }

  const token = createDownloadToken(id)
  if (!token) {
    return NextResponse.json({ error: 'download-unavailable' }, { status: 503 })
  }
  return NextResponse.json({ token })
}
