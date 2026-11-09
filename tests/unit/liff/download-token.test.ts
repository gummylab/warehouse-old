import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createDownloadToken,
  verifyDownloadToken,
} from '@/lib/liff/download-token'
import { verifySessionToken } from '@/lib/liff/order-session'

const SECRET = 'unit-test-download-secret-at-least-32-chars'
process.env.LIFF_SESSION_SECRET = SECRET

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  process.env.LIFF_SESSION_SECRET = SECRET
})

describe('download token', () => {
  it('verifies a token for its own image', () => {
    const token = createDownloadToken('image-1')
    expect(token).not.toBeNull()
    expect(verifyDownloadToken(token, 'image-1')).toBe(true)
  })

  it('refuses a token minted for another image', () => {
    expect(verifyDownloadToken(createDownloadToken('image-1'), 'image-2')).toBe(
      false,
    )
  })

  it('refuses a tampered signature', () => {
    const token = createDownloadToken('image-1')
    expect(token).not.toBeNull()
    expect(verifyDownloadToken(`${token}x`, 'image-1')).toBe(false)
  })

  it('refuses a token after its five minute window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const token = createDownloadToken('image-1')
    vi.setSystemTime(new Date('2026-01-01T00:06:00.000Z'))
    expect(verifyDownloadToken(token, 'image-1')).toBe(false)
  })

  it('is not accepted as a session cookie', async () => {
    const token = createDownloadToken('image-1')
    expect(token).not.toBeNull()
    expect(await verifySessionToken(token as string)).toBeNull()
  })

  it('mints nothing when the session secret is missing', () => {
    vi.stubEnv('LIFF_SESSION_SECRET', '')
    expect(createDownloadToken('image-1')).toBeNull()
  })
})
