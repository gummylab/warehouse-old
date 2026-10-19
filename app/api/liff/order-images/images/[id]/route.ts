import { NextResponse } from 'next/server'

import { deleteImage, getImage, setImagePackage } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'
import { isPackageName } from '@/lib/order-images/packages'

// Label an uploaded photo with its packaging, or clear the label again.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id } = await params
  const body = (await request.json().catch(() => null)) as { package?: unknown } | null
  const pkg = body?.package
  // Explicit null clears the label; anything else must be a known package.
  if (pkg !== null && !isPackageName(pkg)) {
    return NextResponse.json({ error: 'invalid-package' }, { status: 400 })
  }
  if (!setImagePackage(id, pkg)) {
    return NextResponse.json({ error: 'image-not-found' }, { status: 404 })
  }
  const image = getImage(id)
  return NextResponse.json({ image })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id } = await params
  if (!deleteImage(id)) {
    return NextResponse.json({ error: 'image-not-found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
