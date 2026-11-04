import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { deleteApprovedUser, getUserByLineId } from '../../lib/db/users'
import { SESSION_COOKIE, signSessionToken } from '../../lib/liff/order-session'

import { seedUser } from './support/data'

// Access control as seen from outside the app: HTTP requests against the
// running server, including the header pair that decides local device mode
// (ADR 0004) and the cookie rules of ADR 0005.
//
// Cookies are minted with the harness secret, which is the same one the server
// was started with, so these cases exercise real signature verification and the
// real per-request approval lookup.
const UNKNOWN_IMAGE = `/api/liff/order-images/images/${randomUUID()}/file`

// The test process runs on the same machine as the server, so by default every
// request it makes IS a local device request and would be trusted without a
// cookie. To exercise the remote path a request has to declare that it arrived
// through Cloudflare: the edge sets this header, and a client cannot remove it
// (ADR 0004).
const AS_REMOTE = { 'cf-connecting-ip': '203.0.113.7' }

function asRemote(extra: Record<string, string> = {}): Record<string, string> {
  return { ...AS_REMOTE, ...extra }
}

function cookieHeader(token: string): Record<string, string> {
  return { cookie: `${SESSION_COOKIE}=${token}` }
}

test.describe('local device mode', () => {
  test('answers the machine running the server as approved, with no token', async ({ request }) => {
    const response = await request.post('/api/liff/status', { data: {} })

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ status: 'approved', mode: 'local' })
  })

  test('stops trusting the request as soon as CF-Connecting-IP is present', async ({ request }) => {
    const response = await request.post('/api/liff/status', {
      headers: AS_REMOTE,
      data: {},
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({ error: 'missing token' })
  })

  test('needs no cookie at all on the machine running the server', async ({ request }) => {
    // 404 rather than 401: the request was trusted, reached the route, and the
    // route simply has no such image. This is the trust the local machine
    // already has over the database file itself.
    const response = await request.get(UNKNOWN_IMAGE)

    expect(response.status()).toBe(404)
  })
})

test.describe('session cookie as a remote caller', () => {
  test('refuses the image endpoint without a cookie', async ({ request }) => {
    const response = await request.get(UNKNOWN_IMAGE, { headers: asRemote() })

    expect(response.status()).toBe(401)
  })

  test('refuses a cookie that does not verify', async ({ request }) => {
    const response = await request.get(UNKNOWN_IMAGE, {
      headers: asRemote(cookieHeader('forged-value')),
    })

    expect(response.status()).toBe(401)
  })

  test('refuses a valid cookie belonging to a user who is not approved', async ({ request }) => {
    const user = seedUser({ status: 'pending' })
    const token = (await signSessionToken(user.lineUserId)) ?? ''

    // The signature is fine; the users row is what decides.
    const response = await request.get(UNKNOWN_IMAGE, {
      headers: asRemote(cookieHeader(token)),
    })

    expect(response.status()).toBe(403)
  })

  test('cuts access on the very next request after a revoke', async ({ request }) => {
    const user = seedUser({ status: 'approved' })
    const token = (await signSessionToken(user.lineUserId)) ?? ''
    const headers = asRemote(cookieHeader(token))

    // 404 rather than 401/403: the caller got past authentication and the
    // route has no such image.
    const allowed = await request.get(UNKNOWN_IMAGE, { headers })
    expect(allowed.status()).toBe(404)

    // Revoking deletes the users row (ADR 0003), which is what makes the
    // 12-hour cookie TTL harmless: permission is re-read every request.
    deleteApprovedUser(user.id)
    expect(getUserByLineId(user.lineUserId)).toBeUndefined()

    const denied = await request.get(UNKNOWN_IMAGE, { headers })
    expect(denied.status()).toBe(403)
  })

  test('refuses to create an order without a session', async ({ request }) => {
    const response = await request.post('/api/liff/order-images/orders', {
      headers: asRemote(),
      data: { orderNumber: '123456789', orderDate: '2026-01-15', line: 'anything' },
    })

    expect(response.status()).toBe(401)
  })
})
