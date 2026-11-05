import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST as ordersRoute } from '@/app/api/liff/order-images/orders/route'
import { POST as requestRoute } from '@/app/api/liff/request/route'
import { POST as statusRoute } from '@/app/api/liff/status/route'
import { listLines } from '@/lib/db/order-images'
import { approvePendingUser, createPendingUser, getUserByLineId, listUsers } from '@/lib/db/users'
import { signSessionToken, SESSION_COOKIE } from '@/lib/liff/order-session'

import { isolateTestData } from '../setup/db'

// The route handlers are called directly with a Request, which is the same
// shape Next hands them: this covers the status codes and the error codes the
// form maps to Thai copy, without a server or a browser in the way.
const SECRET = 'unit-test-session-secret-at-least-32-chars'
const LIFF_ID = '1234567890-abcdefgh'

isolateTestData({ env: { LIFF_SESSION_SECRET: SECRET } })

afterEach(() => {
  vi.unstubAllEnvs()
})

const ORDER_DATE = '2026-10-19'

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://example.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// Stubs LINE and configures the LIFF id in one step: the routes use the real
// verification helper, so fetch is the only seam.
function stubLineVerify(body: unknown, status = 200) {
  vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  )
}

function seededUser(lineUserId: string, status: 'pending' | 'approved') {
  const user = createPendingUser({ lineUserId, displayName: `User ${lineUserId}` })
  if (status === 'approved') approvePendingUser(user.id, '2026-10-19T03:00:00.000Z')
  return user
}

async function cookieHeadersFor(lineUserId: string): Promise<Record<string, string>> {
  return { cookie: `${SESSION_COOKIE}=${(await signSessionToken(lineUserId)) ?? ''}` }
}

describe('POST /api/liff/status', () => {
  function post(headers: Record<string, string> = {}, body: unknown = {}) {
    return statusRoute(jsonRequest('/api/liff/status', body, headers))
  }

  it('answers the local device without a token and without a users row', async () => {
    const response = await post({ host: 'localhost:8080' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'approved', mode: 'local' })
    expect(await listUsers()).toEqual([])
  })

  it('does not treat a request that carries CF-Connecting-IP as local', async () => {
    const response = await post({ host: 'localhost:8080', 'cf-connecting-ip': '203.0.113.7' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'missing token' })
  })

  it('rejects a request without a token', async () => {
    const response = await post()

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'missing token' })
  })

  it('reports a configuration problem when the LIFF id is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')

    const response = await post({}, { token: 'id-token' })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'unconfigured' })
  })

  it('answers none for a LINE user who never requested access', async () => {
    stubLineVerify({ sub: 'U-none', name: 'Nobody' })

    const response = await post({}, { token: 'id-token' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'none' })
  })

  it('answers the stored status for a known user', async () => {
    stubLineVerify({ sub: 'U-pending', name: 'Pending User' })
    seededUser('U-pending', 'pending')

    expect(await (await post({}, { token: 'id-token' })).json()).toEqual({ status: 'pending' })

    seededUser('U-approved', 'approved')
    stubLineVerify({ sub: 'U-approved', name: 'Approved User' })

    expect(await (await post({}, { token: 'id-token' })).json()).toEqual({ status: 'approved' })
  })
})

describe('POST /api/liff/request', () => {
  function post(body: unknown) {
    return requestRoute(jsonRequest('/api/liff/request', body))
  }

  it('rejects a request without a token', async () => {
    const response = await post({})

    expect(response.status).toBe(400)
  })

  it('rejects a token LINE does not accept', async () => {
    stubLineVerify({ error: 'invalid_request' }, 400)
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const response = await post({ token: 'id-token' })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'invalid' })
  })

  it('reports a configuration problem when the LIFF id is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')

    const response = await post({ token: 'id-token' })

    expect(response.status).toBe(503)
  })

  it('creates the pending request from the LINE-verified profile', async () => {
    stubLineVerify({ sub: 'U-new', name: 'Somchai', picture: 'https://profile.line-scdn.net/x' })

    const response = await post({ token: 'id-token' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'pending' })

    const stored = getUserByLineId('U-new')
    expect(stored?.displayName).toBe('Somchai')
    expect(stored?.avatarUrl).toBe('https://profile.line-scdn.net/x')
    expect(stored?.status).toBe('pending')
  })

  it('is idempotent: a second tap does not create a second row', async () => {
    stubLineVerify({ sub: 'U-twice', name: 'Somchai' })

    await post({ token: 'id-token' })
    const second = await post({ token: 'id-token' })

    expect(await second.json()).toEqual({ status: 'pending' })
    expect(await listUsers()).toHaveLength(1)
  })

  it('reports the existing status instead of creating a row for an approved user', async () => {
    seededUser('U-approved', 'approved')
    stubLineVerify({ sub: 'U-approved', name: 'Approved User' })

    const response = await post({ token: 'id-token' })

    expect(await response.json()).toEqual({ status: 'approved' })
    expect(await listUsers()).toHaveLength(1)
  })
})

describe('POST /api/liff/order-images/orders', () => {
  async function post(body: unknown, headers: Record<string, string> = {}) {
    return ordersRoute(jsonRequest('/api/liff/order-images/orders', body, headers))
  }

  it('refuses a caller with no session', async () => {
    const response = await post({ orderNumber: '123456789', orderDate: ORDER_DATE, line: 'x' })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'unauthorized' })
  })

  it('refuses a caller whose session belongs to a pending user', async () => {
    seededUser('U-pending', 'pending')

    const response = await post(
      { orderNumber: '123456789', orderDate: ORDER_DATE, line: 'x' },
      await cookieHeadersFor('U-pending'),
    )

    expect(response.status).toBe(403)
  })

  it('rejects an empty order number', async () => {
    seededUser('U-approved', 'approved')

    const response = await post(
      { orderNumber: '   ', orderDate: ORDER_DATE, line: 'x' },
      await cookieHeadersFor('U-approved'),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid-order-number' })
  })

  it('rejects a date that is not a real calendar date', async () => {
    seededUser('U-approved', 'approved')

    const response = await post(
      { orderNumber: '123456789', orderDate: '2026-02-30', line: 'x' },
      await cookieHeadersFor('U-approved'),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid-order-date' })
  })

  it('rejects a line that is not in the catalog', async () => {
    seededUser('U-approved', 'approved')

    const response = await post(
      { orderNumber: '123456789', orderDate: ORDER_DATE, line: 'not-a-line' },
      await cookieHeadersFor('U-approved'),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'unknown-line' })
  })

  it('creates the order and returns its id for a valid step 1', async () => {
    seededUser('U-approved', 'approved')
    const [line] = listLines()

    const response = await post(
      { orderNumber: ' 123456789 ', orderDate: ORDER_DATE, line },
      await cookieHeadersFor('U-approved'),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { orderId: string }
    expect(body.orderId).toEqual(expect.any(String))
  })

  it('creates a second order when the same number and date use another line', async () => {
    seededUser('U-approved', 'approved')
    const [firstLine, secondLine] = listLines()
    const headers = await cookieHeadersFor('U-approved')

    const firstResponse = await post(
      { orderNumber: '123456789', orderDate: ORDER_DATE, line: firstLine },
      headers,
    )
    const secondResponse = await post(
      { orderNumber: '123456789', orderDate: ORDER_DATE, line: secondLine },
      headers,
    )

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    const first = (await firstResponse.json()) as { orderId: string }
    const second = (await secondResponse.json()) as { orderId: string }
    expect(second.orderId).not.toBe(first.orderId)
  })
})
