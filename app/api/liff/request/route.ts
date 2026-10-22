import { NextResponse } from 'next/server'

import { createPendingUser, getUserByLineId } from '@/lib/db/users'
import { readLineTokenRequest, resolveLineIdentity } from '@/lib/liff/identity'
import { isRateLimited, rateLimitedResponse } from '@/lib/liff/rate-limit'

// POST /api/liff/request — creates the access request (pending row) for the
// verified LINE user. Idempotent: an existing row (pending or approved)
// just reports its status back instead of creating a duplicate, which the
// unique index on line_user_id also enforces.
export async function POST(request: Request) {
  // This endpoint spends an outbound HTTPS call to LINE on every request
  // (ADR 0003) and writes a row, so the rate limiter guards it first.
  if (isRateLimited(request)) {
    return rateLimitedResponse()
  }

  const body = await readLineTokenRequest(request)
  if (!body) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 })
  }

  const result = await resolveLineIdentity(body.token, body.tokenType)
  if (!result.ok) {
    const status = result.reason === 'unconfigured' ? 503 : 401
    return NextResponse.json({ error: result.reason }, { status })
  }

  const existing = getUserByLineId(result.identity.lineUserId)
  if (existing) {
    return NextResponse.json({ status: existing.status })
  }

  const created = createPendingUser(result.identity)
  return NextResponse.json({ status: created.status })
}
