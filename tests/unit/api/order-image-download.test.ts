import { describe, expect, it } from 'vitest'

import { GET as tokenRoute } from '@/app/api/liff/order-images/images/[id]/download-token/route'
import { GET as fileRoute } from '@/app/api/liff/order-images/images/[id]/file/route'
import {
  addItem,
  findOrCreateOrder,
  saveImageOriginal,
} from '@/lib/db/order-images'
import { SEED_LINES } from '@/lib/db/seed'
import {
  createDownloadToken,
  verifyDownloadToken,
} from '@/lib/liff/download-token'

import { isolateTestData } from '../setup/db'

isolateTestData({
  env: { LIFF_SESSION_SECRET: 'unit-test-download-secret-at-least-32-chars' },
})

const BYTES = Buffer.from('fake-image-bytes')

function seedImage(): string {
  const order = findOrCreateOrder({
    orderNumber: 'A-1',
    orderDate: '2026-11-09',
    line: SEED_LINES[0],
    createdBy: 'local-device',
  })
  const added = addItem(order.id, null, 'local-device')
  if (!added.ok) throw new Error('seed item failed')
  const { image } = saveImageOriginal({
    itemId: added.item.id,
    package: null,
    fileName: 'photo.png',
    mimeType: 'image/png',
    fileSize: BYTES.length,
    createdBy: 'local-device',
    buffer: BYTES,
  })
  return image.id
}

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://example.test${path}`, { headers })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

const LOCAL = { host: 'localhost:8080' }

describe('GET /api/liff/order-images/images/[id]/file', () => {
  it('serves the original as an attachment for download=1', async () => {
    const id = seedImage()
    const response = await fileRoute(
      request(
        `/api/liff/order-images/images/${id}/file?size=original&download=1`,
        LOCAL,
      ),
      params(id),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename=".+\.png"$/,
    )
    expect((await response.arrayBuffer()).byteLength).toBe(BYTES.length)
  })

  it('keeps the response inline without download=1', async () => {
    const id = seedImage()
    const response = await fileRoute(
      request(`/api/liff/order-images/images/${id}/file`, LOCAL),
      params(id),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toBeNull()
  })

  it('accepts a download token when no cookie is present', async () => {
    const id = seedImage()
    const token = createDownloadToken(id)
    const response = await fileRoute(
      request(
        `/api/liff/order-images/images/${id}/file?download=1&token=${token}`,
      ),
      params(id),
    )

    expect(response.status).toBe(200)
  })

  it('refuses a download with neither a cookie nor a token', async () => {
    const id = seedImage()
    const response = await fileRoute(
      request(`/api/liff/order-images/images/${id}/file?download=1`),
      params(id),
    )

    expect(response.status).toBe(401)
  })

  it('refuses a token minted for another image', async () => {
    const id = seedImage()
    const other = seedImage()
    const token = createDownloadToken(other)
    const response = await fileRoute(
      request(
        `/api/liff/order-images/images/${id}/file?download=1&token=${token}`,
      ),
      params(id),
    )

    expect(response.status).toBe(401)
  })
})

describe('GET /api/liff/order-images/images/[id]/download-token', () => {
  it('mints a token for the authenticated page', async () => {
    const id = seedImage()
    const response = await tokenRoute(
      request(`/api/liff/order-images/images/${id}/download-token`, LOCAL),
      params(id),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { token?: string }
    expect(verifyDownloadToken(body.token ?? null, id)).toBe(true)
  })

  it('refuses a caller with no session', async () => {
    const id = seedImage()
    const response = await tokenRoute(
      request(`/api/liff/order-images/images/${id}/download-token`),
      params(id),
    )

    expect(response.status).toBe(401)
  })
})
