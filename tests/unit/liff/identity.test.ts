import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readLineTokenRequest, resolveLineIdentity } from '@/lib/liff/identity'

// ADR 0003: identity comes from LINE, never from the caller. Every /api/liff
// handler runs this before it touches the database, and these cases cover
// what LINE is asked and what a bad answer does.
//
// fetch is the only external dependency, so it is the only thing stubbed:
// the parsing, the audience handling and the retry stay real code.
afterEach(() => {
  vi.unstubAllEnvs()
})

// The module logs every verification outcome (a phone has no console, so the
// server log is the only diagnosis). Silenced here so a green run stays
// readable; the log-content test below reads from these same spies.
beforeEach(() => {
  silenceLogs()
})

const LIFF_ID = '1234567890-abcdefgh'
const TOKEN = 'token-that-must-never-be-logged'

const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
const PROFILE_URL = 'https://api.line.me/v2/profile'

// A JWT-shaped string: only the middle segment is read (for the aud claim) and
// the signature is LINE's business, not ours.
function idTokenWith(aud?: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(aud === undefined ? {} : { aud })).toString('base64url')
  return `${header}.${payload}.signature-not-checked-here`
}

function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => handler(url, init))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function callsOf(fetchMock: ReturnType<typeof stubFetch>): [string, RequestInit][] {
  return fetchMock.mock.calls as unknown as [string, RequestInit][]
}

function silenceLogs() {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
}

describe('resolveLineIdentity: configuration', () => {
  it('reports a configuration error, and never calls LINE, without a LIFF id', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')
    const fetchMock = stubFetch(() => jsonResponse({ sub: 'U-1' }))

    expect(await resolveLineIdentity(TOKEN, 'idToken')).toEqual({
      ok: false,
      reason: 'unconfigured',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resolveLineIdentity: id token', () => {
  it('returns the LINE profile from the verify endpoint', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    stubFetch(() =>
      jsonResponse({ sub: 'U-1', name: 'Somchai', picture: 'https://profile.line-scdn.net/x' }),
    )

    expect(await resolveLineIdentity(idTokenWith('1234567890'), 'idToken')).toEqual({
      ok: true,
      identity: {
        lineUserId: 'U-1',
        displayName: 'Somchai',
        avatarUrl: 'https://profile.line-scdn.net/x',
      },
    })
  })

  it('sends the token audience as client_id, not the full LIFF id', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    const fetchMock = stubFetch(() => jsonResponse({ sub: 'U-1', name: 'Somchai' }))
    const token = idTokenWith('1234567890')

    await resolveLineIdentity(token, 'idToken')

    const [url, init] = callsOf(fetchMock)[0]
    // LINE's verify rejects the full LIFF id as client_id with an invalid
    // request, which is why the aud claim is read first.
    expect(url).toBe(VERIFY_URL)
    expect(String(init.body)).toBe(`id_token=${token}&client_id=1234567890`)
  })

  it('falls back to the LIFF id when the token carries no aud claim', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    const fetchMock = stubFetch(() => jsonResponse({ sub: 'U-1' }))

    await resolveLineIdentity(idTokenWith(), 'idToken')

    expect(String(callsOf(fetchMock)[0][1].body)).toContain(`client_id=${LIFF_ID}`)
  })

  it('falls back to a generic display name when LINE sends none', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    stubFetch(() => jsonResponse({ sub: 'U-1' }))

    const result = await resolveLineIdentity(idTokenWith(), 'idToken')

    expect(result).toEqual({
      ok: true,
      identity: { lineUserId: 'U-1', displayName: 'LINE User', avatarUrl: undefined },
    })
  })

  it('rejects an answer without a sub claim', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    silenceLogs()
    stubFetch(() => jsonResponse({ error: 'invalid_request', error_description: 'bad token' }, 400))

    expect(await resolveLineIdentity(TOKEN, 'idToken')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejects an answer that is not JSON at all', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    silenceLogs()
    stubFetch(() => new Response('<html>gateway error</html>', { status: 502 }))

    expect(await resolveLineIdentity(TOKEN, 'idToken')).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('resolveLineIdentity: access token', () => {
  it('asks LINE for the opener profile and returns it', async () => {
    // The shared config guard runs before the token type is examined, so this
    // path needs a configured LIFF id too even though it never sends one.
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    const fetchMock = stubFetch(() =>
      jsonResponse({ userId: 'U-2', displayName: 'Somsri', pictureUrl: 'https://p/x' }),
    )

    expect(await resolveLineIdentity(TOKEN, 'accessToken')).toEqual({
      ok: true,
      identity: {
        lineUserId: 'U-2',
        displayName: 'Somsri',
        avatarUrl: 'https://p/x',
      },
    })
    expect(callsOf(fetchMock)[0][0]).toBe(PROFILE_URL)
    expect((callsOf(fetchMock)[0][1].headers as Record<string, string>).Authorization).toBe(
      `Bearer ${TOKEN}`,
    )
  })

  it('rejects a profile answer without a user id', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    silenceLogs()
    stubFetch(() => jsonResponse({ message: 'Access token expired' }, 401))

    expect(await resolveLineIdentity(TOKEN, 'accessToken')).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })
})

describe('resolveLineIdentity: network failures', () => {
  it('retries once on a dead connection and then succeeds', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    silenceLogs()
    let attempts = 0
    stubFetch(() => {
      attempts += 1
      if (attempts === 1) throw new Error('ConnectTimeoutError')
      return jsonResponse({ sub: 'U-3', name: 'Third' })
    })

    const result = await resolveLineIdentity(TOKEN, 'idToken')

    expect(result.ok).toBe(true)
    expect(attempts).toBe(2)
  })

  it('gives up after two attempts', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    silenceLogs()
    let attempts = 0
    stubFetch(() => {
      attempts += 1
      throw new Error('ECONNRESET')
    })

    expect(await resolveLineIdentity(TOKEN, 'idToken')).toEqual({ ok: false, reason: 'invalid' })
    expect(attempts).toBe(2)
  })

  it('never writes the token to the log', async () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', LIFF_ID)
    silenceLogs()
    stubFetch(() => jsonResponse({ error: 'invalid_request' }, 400))

    await resolveLineIdentity(TOKEN, 'idToken')

    const warn = vi.mocked(console.warn)
    const info = vi.mocked(console.info)
    const logged = [...warn.mock.calls, ...info.mock.calls].flat().map(String).join(' ')
    // The phone has no console, so the log is the only diagnosis available.
    // It must carry the cause without the credential.
    expect(logged).toContain('invalid_request')
    expect(logged).not.toContain(TOKEN)
  })
})

describe('readLineTokenRequest', () => {
  function jsonRequest(body: unknown) {
    return new Request('http://localhost/api/liff/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('reads a token and defaults the type to idToken', async () => {
    expect(await readLineTokenRequest(jsonRequest({ token: 'abc' }))).toEqual({
      token: 'abc',
      tokenType: 'idToken',
    })
  })

  it('carries an explicit accessToken type through', async () => {
    expect(
      await readLineTokenRequest(jsonRequest({ token: 'abc', tokenType: 'accessToken' })),
    ).toEqual({ token: 'abc', tokenType: 'accessToken' })
  })

  it('treats an unexpected token type as idToken', async () => {
    expect(await readLineTokenRequest(jsonRequest({ token: 'abc', tokenType: 'refreshToken' }))).toEqual(
      { token: 'abc', tokenType: 'idToken' },
    )
  })

  it('rejects a missing, empty or non-string token', async () => {
    expect(await readLineTokenRequest(jsonRequest({}))).toBeNull()
    expect(await readLineTokenRequest(jsonRequest({ token: '' }))).toBeNull()
    expect(await readLineTokenRequest(jsonRequest({ token: 5 }))).toBeNull()
    expect(await readLineTokenRequest(jsonRequest({ token: null }))).toBeNull()
  })

  it('rejects a body that is not JSON', async () => {
    const request = new Request('http://localhost/api/liff/status', {
      method: 'POST',
      body: 'not json',
    })

    expect(await readLineTokenRequest(request)).toBeNull()
  })
})
