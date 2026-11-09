import { NextResponse } from 'next/server'

import { getUserByLineId } from '@/lib/db/users'
import { FORM_IDS } from '@/lib/forms/registry'
import { readLineTokenRequest, resolveLineIdentity } from '@/lib/liff/identity'
import { isLocalDeviceRequest } from '@/lib/liff/local-device'
import { isRateLimited, rateLimitedResponse } from '@/lib/liff/rate-limit'

// POST /api/liff/status — public once the WAF allowlist covers /api/liff*
// (edited at Cloudflare, per ADR 0001), so the LINE identity check below is
// the only gate before the database is read.
//
// The answer carries the forms this user may open, because this call is the
// one the LIFF gate already waits on: one round-trip instead of two, and the
// hub and the route gate read the same list.
export async function POST(request: Request) {
  // Local device (ADR 0004): the request's own headers prove it came from
  // this machine, so it is answered approved without a token, without LINE,
  // and without touching the database (virtual identity, no users row). It
  // may open every form, which is what makes local development usable.
  if (isLocalDeviceRequest(request)) {
    return NextResponse.json({
      status: 'approved',
      mode: 'local',
      forms: [...FORM_IDS],
    })
  }

  // This endpoint spends an outbound HTTPS call to LINE on every request
  // (ADR 0003), so it is the one the rate limiter guards first.
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

  const user = getUserByLineId(result.identity.lineUserId)
  return NextResponse.json({
    status: user?.status ?? 'none',
    // The grant set is chosen at approval, so a pending or unknown user has
    // none. An approved user with zero forms gets an empty list, not an
    // omission: the hub shows its "no permission" state from it.
    forms: user?.status === 'approved' ? user.formIds : [],
  })
}
