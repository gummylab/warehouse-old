import { readFile } from 'node:fs/promises'

import { NextResponse } from 'next/server'

import { getImageFile } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'
import { isInsideRoot, toAbsolute } from '@/lib/order-images/storage'

// Serves the stored bytes behind <img src=".../file">. The session cookie
// (sent automatically by the browser) is what authenticates these requests
// — an img tag cannot carry headers.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const { id } = await params
  const file = getImageFile(id)
  if (!file) {
    return NextResponse.json({ error: 'image-not-found' }, { status: 404 })
  }

  const absolute = toAbsolute(file.storageKey)
  // A storage_key that escapes the storage root must never be read, even
  // though only the server can write that column.
  if (!isInsideRoot(absolute)) {
    return NextResponse.json({ error: 'image-not-found' }, { status: 404 })
  }

  let bytes: Buffer
  try {
    bytes = await readFile(absolute)
  } catch {
    // Row exists but the file is gone (manual delete, failed copy): the
    // client shows a broken thumbnail rather than a 500 page.
    return NextResponse.json({ error: 'file-missing' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': file.mimeType ?? 'application/octet-stream',
      // private: the bytes are auth-gated, so shared caches must not keep
      // them. immutable: a given image id never changes content, and a
      // replaced photo always gets a fresh id.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
