import { NextResponse } from 'next/server'

import {
  authenticateOrderImageRequest,
  resolveExchangeIdentity,
  setSessionCookie,
  signSessionToken,
} from '@/lib/liff/order-session'

// Exchange the LIFF token for the session cookie (or confirm the local
// device, which needs none). Idempotent: a still-valid cookie answers
// without another LINE round trip.
export async function POST(request: Request) {
  const auth = await authenticateOrderImageRequest(request)
  if (auth.ok && auth.createdBy !== 'local-device') {
    return NextResponse.json({ ok: true, mode: 'line' })
  }

  const identity = await resolveExchangeIdentity(request)
  if (!identity.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: identity.status })
  }

  // Local device mode (ADR 0004) authenticates by request headers on every
  // call, so it never needs a cookie.
  if (identity.lineUserId === 'local-device') {
    return NextResponse.json({ ok: true, mode: 'local' })
  }

  const token = await signSessionToken(identity.lineUserId)
  if (!token) {
    return NextResponse.json({ error: 'session secret not configured' }, { status: 503 })
  }
  const response = NextResponse.json({ ok: true, mode: 'line' })
  setSessionCookie(response, token)
  return response
}
