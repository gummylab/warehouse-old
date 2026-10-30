// Session cookie for the order-image form (ADR 0005). The LIFF idToken is
// exchanged once for an HMAC-signed cookie; every order-images endpoint
// then authenticates locally, which is also the only way an <img src> can
// prove identity (it cannot send headers). Approval is still re-checked
// against the database on every request, so revoking a user (ADR 0003,
// deletes the users row) cuts access immediately rather than after the
// cookie TTL.
import { jwtVerify, SignJWT } from 'jose'
import type { NextResponse } from 'next/server'

import { getUserByLineId } from '../db/users'
import { readLineTokenRequest, resolveLineIdentity } from './identity'
import { isLocalDeviceRequest } from './local-device'

export const SESSION_COOKIE = 'wh_order_image_session'
// One warehouse shift with slack; the form re-exchanges the token on every
// page load, so a longer cookie only widens the revocation delay window
// that the per-request approval check already closes.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

function sessionSecret(): Uint8Array | null {
  const secret = process.env.LIFF_SESSION_SECRET
  // Failing loudly beats a silently weak key: signing with anything shorter
  // would look like it works while being brute-forceable.
  if (!secret || secret.length < 32) return null
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(sub: string): Promise<string | null> {
  const secret = sessionSecret()
  if (!secret) return null
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<{ sub: string } | null> {
  const secret = sessionSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? { sub: payload.sub } : null
  } catch {
    return null
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Production is served over the https tunnel. Secure cookies would be
    // dropped on plain-http localhost, which local-device mode (ADR 0004)
    // covers anyway without needing any cookie.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export type OrderImageAuth =
  | { ok: true; createdBy: string }
  | { ok: false; status: 401 | 403 | 503 }

export async function authenticateOrderImageRequest(
  request: Request,
): Promise<OrderImageAuth> {
  // ADR 0004: the machine running the server is its own approved user and
  // never needs a cookie.
  if (isLocalDeviceRequest(request)) return { ok: true, createdBy: 'local-device' }

  // Cookie first: the file endpoint is also reached by <img> tags, which
  // can only ever present this credential.
  const cookie = readSessionCookie(request)
  if (cookie) {
    // Present but unsignable means misconfiguration, not a bad caller.
    if (!sessionSecret()) return { ok: false, status: 503 }
    const session = await verifySessionToken(cookie)
    if (session) return approveSub(session.sub)
    // Expired or tampered cookie: fall through so a Bearer caller can
    // still succeed, then report 401 if nothing else authenticates.
  }

  // Bearer idToken fallback for callers that have not exchanged yet (or
  // whose cookie expired mid-session); same LINE verification as ADR 0003.
  const bearer = readBearerToken(request)
  if (bearer) {
    const result = await resolveLineIdentity(bearer, 'idToken')
    if (!result.ok) {
      return { ok: false, status: result.reason === 'unconfigured' ? 503 : 401 }
    }
    return approveSub(result.identity.lineUserId)
  }

  return { ok: false, status: 401 }
}

// Approval is re-checked on every request (one indexed local read): the
// cookie only proves who the caller is, not that they may still write.
function approveSub(sub: string): OrderImageAuth {
  const user = getUserByLineId(sub)
  return user?.status === 'approved' ? { ok: true, createdBy: sub } : { ok: false, status: 403 }
}

function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) {
      const value = rest.join('=')
      return value.length > 0 ? value : null
    }
  }
  return null
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

// Shared by the session route and endpoint auth so an exchange that no
// longer passes approval (revoked mid-session) answers consistently.
export async function resolveExchangeIdentity(
  request: Request,
): Promise<
  | { ok: true; lineUserId: string }
  | { ok: false; status: 400 | 401 | 403 | 503 }
> {
  if (isLocalDeviceRequest(request)) return { ok: true, lineUserId: 'local-device' }
  const body = await readLineTokenRequest(request)
  if (!body) return { ok: false, status: 400 }
  const result = await resolveLineIdentity(body.token, body.tokenType)
  if (!result.ok) {
    return { ok: false, status: result.reason === 'unconfigured' ? 503 : 401 }
  }
  const user = getUserByLineId(result.identity.lineUserId)
  if (user?.status !== 'approved') return { ok: false, status: 403 }
  return { ok: true, lineUserId: result.identity.lineUserId }
}
