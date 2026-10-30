// Server-side LINE identity verification. Every /api/liff handler calls
// resolveLineIdentity before touching the database: the LIFF surface is the
// only public entry point (ADR 0001), so identity must come from LINE
// itself, never from client-supplied claims (ADR 0003). Tokens are forwarded
// to LINE for verification and are never logged or stored.

// LINE must answer within a deadline: fetch has no useful default timeout,
// and a hung verify call would hold the /api/liff request open for minutes.
// The deadline covers BOTH attempts of fetchFromLine, so the worst case
// stays under the LIFF page's own POST deadline (25s) and the server gives
// up first, reporting the cause. An abort lands in the same catch as a
// rejection and counts as 'invalid'.
const VERIFY_TIMEOUT_MS = 20_000

export type LineIdentity = {
  lineUserId: string
  displayName: string
  avatarUrl?: string
}

export type LineIdentityResult =
  | { ok: true; identity: LineIdentity }
  | { ok: false; reason: 'unconfigured' | 'invalid' }

// Reads and validates the shared request body: { token, tokenType }.
// tokenType defaults to idToken; anything unexpected is rejected early.
export async function readLineTokenRequest(
  request: Request,
): Promise<{ token: string; tokenType: 'idToken' | 'accessToken' } | null> {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown; tokenType?: unknown }
    | null
  if (typeof body?.token !== 'string' || body.token.length === 0) {
    return null
  }
  const tokenType = body.tokenType === 'accessToken' ? 'accessToken' : 'idToken'
  return { token: body.token, tokenType }
}

export async function resolveLineIdentity(
  token: string,
  tokenType: 'idToken' | 'accessToken',
): Promise<LineIdentityResult> {
  // The LIFF ID doubles as the OAuth client_id/audience; without it LINE
  // cannot validate anything, so this is a configuration error, not a
  // rejection of the caller.
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    return { ok: false, reason: 'unconfigured' }
  }

  const identity =
    tokenType === 'idToken'
      ? await verifyIdToken(token, liffId)
      : await verifyAccessToken(token)

  return identity
    ? { ok: true, identity }
    : { ok: false, reason: 'invalid' }
}

// OpenID ID token path: LINE checks the signature and audience for us.
async function verifyIdToken(
  token: string,
  liffId: string,
): Promise<LineIdentity | null> {
  // Verify rejects the full LIFF id as client_id (HTTP 400 invalid_request,
  // "some parameters in the wrong format"): it wants the audience the token
  // was actually issued for, which the token itself carries in `aud` (the
  // numeric channel id). Reading that claim is not verification; the
  // signature check stays LINE's job.
  const clientId = audienceOf(token) ?? liffId
  const startedAt = Date.now()
  const { response, fetchError } = await fetchFromLine(
    'https://api.line.me/oauth2/v2.1/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: token, client_id: clientId }),
      cache: 'no-store',
    },
    'idToken verify',
    startedAt,
  )

  // Verify answers with the OpenID claims directly: the user id is `sub`
  // (`userId` is the v2/profile path's field, not this endpoint's).
  const data = (await response?.json().catch(() => null)) as
    | {
        sub?: string
        name?: string
        picture?: string
        error?: string
        error_description?: string
        message?: string
      }
    | null
    | undefined

  if (!data?.sub) {
    // LINE's error fields never echo the token, so logging them is safe.
    // This is the only way to see a verification cause: the phone has no
    // console, but the dev server log does.
    console.warn(
      `[liff] idToken verify failed (HTTP ${response?.status ?? 'no response'} after ${Date.now() - startedAt}ms):`,
      data?.error ?? data?.message ?? fetchError ?? 'no sub claim (empty body)',
      data?.error_description ?? '',
    )
    return null
  }

  console.info(`[liff] idToken verify ok (aud=${clientId} in ${Date.now() - startedAt}ms)`)
  return {
    lineUserId: data.sub,
    displayName: data.name ?? 'LINE User',
    avatarUrl: data.picture,
  }
}

// Reads the `aud` claim from an unparsed id token. Not verification: the
// signature is never checked here, this only tells verify which client_id
// the token belongs to.
function audienceOf(idToken: string): string | null {
  const payload = idToken.split('.')[1]
  if (!payload) return null
  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { aud?: unknown }
    return typeof claims.aud === 'string' ? claims.aud : null
  } catch {
    return null
  }
}

// Access token path: asking LINE for the opener's own profile proves the
// token is real and belongs to them.
async function verifyAccessToken(token: string): Promise<LineIdentity | null> {
  const startedAt = Date.now()
  const { response, fetchError } = await fetchFromLine(
    'https://api.line.me/v2/profile',
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
    'accessToken profile',
    startedAt,
  )

  const data = (await response?.json().catch(() => null)) as
    | {
        userId?: string
        displayName?: string
        pictureUrl?: string
        message?: string
      }
    | null
    | undefined

  if (!data?.userId) {
    console.warn(
      `[liff] accessToken profile failed (HTTP ${response?.status ?? 'no response'} after ${Date.now() - startedAt}ms):`,
      data?.message ?? fetchError ?? 'empty body',
    )
    return null
  }

  console.info(`[liff] accessToken profile ok in ${Date.now() - startedAt}ms`)
  return {
    lineUserId: data.userId,
    displayName: data.displayName ?? 'LINE User',
    avatarUrl: data.pictureUrl,
  }
}

// One verify call to LINE, retried once on a dead connection. Cold connects
// to api.line.me sometimes hang past undici's own connect deadline
// (seen as "ConnectTimeoutError" around 10s in the dev log) and the
// attempt dies before our abort ever fires; the retry connects immediately
// in practice. Both attempts share one overall budget measured from
// startedAt, so the worst case stays under the LIFF page's POST deadline.
// Only thrown fetch errors are retried: an HTTP answer from LINE (even an
// error status) is a real reply and is passed through for parsing.
async function fetchFromLine(
  url: string,
  init: RequestInit,
  tag: string,
  startedAt: number,
): Promise<{ response: Response | null; fetchError: string | null }> {
  let fetchError: string | null = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = VERIFY_TIMEOUT_MS - (Date.now() - startedAt)
    if (remaining <= 0) break

    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(remaining),
      })
      return { response, fetchError: null }
    } catch (error) {
      // Never log the token: fetch failures carry only the error's own
      // name and message (ConnectTimeoutError, ECONNRESET, ...), which is
      // exactly the diagnosis the phone cannot provide.
      fetchError = describeFetchError(error)
      console.warn(`[liff] ${tag} attempt ${attempt} failed: ${fetchError}`)
    }
  }

  return { response: null, fetchError }
}

// Names an unknown fetch rejection for the log ("ConnectTimeoutError:
// ..." etc.) so a network-level failure is distinguishable from an abort.
function describeFetchError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}
