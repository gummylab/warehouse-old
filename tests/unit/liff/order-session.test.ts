import { SignJWT } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { approvePendingUser, createPendingUser, deleteApprovedUser } from '@/lib/db/users'
import {
  authenticateOrderImageRequest,
  setSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from '@/lib/liff/order-session'

import { isolateTestData } from '../setup/db'

// ADR 0005: the cookie proves identity, never permission, so the interesting
// cases are all about what happens to a perfectly valid cookie belonging to
// someone who may not write.
const SECRET = 'unit-test-session-secret-at-least-32-chars'
isolateTestData({ env: { LIFF_SESSION_SECRET: SECRET } })

// Tests stub the secret and the LIFF id, and the config leaves unstubEnvs off
// (see vitest.config.mts), so the file has to put the helper's values back
// itself. Those values were written straight into process.env, so unstubbing
// restores them rather than removing them.
afterEach(() => {
  vi.unstubAllEnvs()
})

const APPROVED = 'U-approved'

function seededApproved(lineUserId: string = APPROVED) {
  const user = createPendingUser({ lineUserId, displayName: 'Approved User' })
  approvePendingUser(user.id, '2026-10-19T03:00:00.000Z')
  return user
}

function requestWithHeaders(headers: Record<string, string>) {
  return new Request('http://example.test/api/liff/order-images/orders', {
    method: 'POST',
    headers,
  })
}

function cookieRequest(token: string) {
  return requestWithHeaders({ cookie: `${SESSION_COOKIE}=${token}` })
}

async function expiredToken(sub: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now - 100)
    .setExpirationTime(now - 10)
    .sign(new TextEncoder().encode(SECRET))
}

describe('session token', () => {
  it('signs a token that verifies back to its subject', async () => {
    const token = await signSessionToken('U-1')

    expect(token).not.toBeNull()
    expect(await verifySessionToken(token ?? '')).toEqual({ sub: 'U-1' })
  })

  it('keeps the TTL at one warehouse shift', () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(12 * 60 * 60)
  })

  it('fails closed when the secret is missing or too short', async () => {
    // Signing with anything short would look like it works while being
    // brute-forceable, so the module refuses outright.
    vi.stubEnv('LIFF_SESSION_SECRET', '')
    expect(await signSessionToken('U-1')).toBeNull()

    vi.stubEnv('LIFF_SESSION_SECRET', 'too-short-to-be-a-key')
    expect(await signSessionToken('U-1')).toBeNull()
    expect(await verifySessionToken('anything')).toBeNull()
  })

  it('rejects a tampered token', async () => {
    const token = (await signSessionToken('U-1')) ?? ''
    const [header, payload, signature] = token.split('.')
    const tampered = `${header}.${payload}.${signature.slice(0, -2)}xx`

    expect(await verifySessionToken(tampered)).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const foreign = (await signSessionToken('U-1')) ?? ''

    // The secret is read per call, so switching it is enough to make an
    // otherwise valid token unverifiable.
    vi.stubEnv('LIFF_SESSION_SECRET', 'a-completely-different-secret-32-chars')

    expect(await verifySessionToken(foreign)).toBeNull()
  })

  it('rejects an expired token', async () => {
    expect(await verifySessionToken(await expiredToken('U-1'))).toBeNull()
  })
})

describe('setSessionCookie', () => {
  it('sets an httpOnly, lax, path-scoped cookie with the right TTL', () => {
    const set = vi.fn()
    const response = { cookies: { set } } as unknown as Parameters<typeof setSessionCookie>[0]

    setSessionCookie(response, 'signed-token')

    expect(set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      'signed-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      }),
    )
  })
})

describe('authenticateOrderImageRequest: local device', () => {
  it('trusts the machine running the server without any credential', async () => {
    const request = requestWithHeaders({ host: 'localhost:8080' })

    expect(await authenticateOrderImageRequest(request)).toEqual({
      ok: true,
      createdBy: 'local-device',
    })
  })
})

describe('authenticateOrderImageRequest: cookie', () => {
  it('refuses a request that carries no credential at all', async () => {
    expect(await authenticateOrderImageRequest(requestWithHeaders({}))).toEqual({
      ok: false,
      status: 401,
    })
  })

  it('accepts a signed cookie for an approved user', async () => {
    seededApproved()
    const token = (await signSessionToken(APPROVED)) ?? ''

    expect(await authenticateOrderImageRequest(cookieRequest(token))).toEqual({
      ok: true,
      createdBy: APPROVED,
    })
  })

  it('refuses a signed cookie for a user who is still pending', async () => {
    createPendingUser({ lineUserId: 'U-pending', displayName: 'Pending User' })
    const token = (await signSessionToken('U-pending')) ?? ''

    expect(await authenticateOrderImageRequest(cookieRequest(token))).toEqual({
      ok: false,
      status: 403,
    })
  })

  it('refuses a signed cookie as soon as the user is revoked', async () => {
    const user = seededApproved()
    const token = (await signSessionToken(APPROVED)) ?? ''
    expect((await authenticateOrderImageRequest(cookieRequest(token))).ok).toBe(true)

    // Revoking deletes the row (ADR 0003), which is what makes the per-request
    // approval check cut access immediately instead of at cookie expiry.
    deleteApprovedUser(user.id)

    expect(await authenticateOrderImageRequest(cookieRequest(token))).toEqual({
      ok: false,
      status: 403,
    })
  })

  it('refuses a signed cookie for a sub that has no users row', async () => {
    const token = (await signSessionToken('U-ghost')) ?? ''

    expect(await authenticateOrderImageRequest(cookieRequest(token))).toEqual({
      ok: false,
      status: 403,
    })
  })

  it('refuses an unsigned cookie value', async () => {
    expect(await authenticateOrderImageRequest(cookieRequest('not-a-token'))).toEqual({
      ok: false,
      status: 401,
    })
  })

  it('answers 503 when a cookie is presented but the secret is unconfigured', async () => {
    seededApproved()
    const token = (await signSessionToken(APPROVED)) ?? ''
    vi.stubEnv('LIFF_SESSION_SECRET', 'too-short-to-be-a-key')

    expect(await authenticateOrderImageRequest(cookieRequest(token))).toEqual({
      ok: false,
      status: 503,
    })
  })

  it('falls through an expired cookie and reports missing credentials', async () => {
    seededApproved()

    expect(await authenticateOrderImageRequest(cookieRequest(await expiredToken(APPROVED)))).toEqual({
      ok: false,
      status: 401,
    })
  })
})

describe('authenticateOrderImageRequest: bearer fallback', () => {
  function stubLineVerify(body: unknown, status = 200) {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '1234567890-abcdefgh')
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

  it('accepts a bearer token LINE vouches for', async () => {
    seededApproved()
    stubLineVerify({ sub: APPROVED, name: 'Approved User' })

    const request = requestWithHeaders({ authorization: 'Bearer some-liff-id-token' })

    expect(await authenticateOrderImageRequest(request)).toEqual({
      ok: true,
      createdBy: APPROVED,
    })
  })

  it('refuses a bearer token for a user who is not approved', async () => {
    stubLineVerify({ sub: 'U-stranger', name: 'Stranger' })

    expect(
      await authenticateOrderImageRequest(
        requestWithHeaders({ authorization: 'Bearer some-liff-id-token' }),
      ),
    ).toEqual({ ok: false, status: 403 })
  })

  it('reports 401 when LINE rejects the bearer token', async () => {
    stubLineVerify({ error: 'invalid_request' }, 400)

    expect(
      await authenticateOrderImageRequest(
        requestWithHeaders({ authorization: 'Bearer some-liff-id-token' }),
      ),
    ).toEqual({ ok: false, status: 401 })
  })

  it('reports 503 when LINE verification is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')

    expect(
      await authenticateOrderImageRequest(
        requestWithHeaders({ authorization: 'Bearer some-liff-id-token' }),
      ),
    ).toEqual({ ok: false, status: 503 })
  })

  it('ignores an empty or non-bearer authorization header', async () => {
    expect(
      await authenticateOrderImageRequest(requestWithHeaders({ authorization: 'Bearer ' })),
    ).toEqual({ ok: false, status: 401 })
    expect(
      await authenticateOrderImageRequest(requestWithHeaders({ authorization: 'Basic abc' })),
    ).toEqual({ ok: false, status: 401 })
  })
})
