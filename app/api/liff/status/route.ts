import { NextResponse } from 'next/server'

import { getUserByLineId } from '@/lib/db/users'
import { readLineTokenRequest, resolveLineIdentity } from '@/lib/liff/identity'
import { isLocalDeviceRequest } from '@/lib/liff/local-device'

// POST /api/liff/status — public once the WAF allowlist covers /api/liff*
// (edited at Cloudflare, per ADR 0001), so the LINE identity check below is
// the only gate before the database is read.
export async function POST(request: Request) {
  // Local device (ADR 0004): the request's own headers prove it came from
  // this machine, so it is answered approved without a token, without LINE,
  // and without touching the database (virtual identity, no users row).
  if (isLocalDeviceRequest(request)) {
    return NextResponse.json({ status: 'approved', mode: 'local' })
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
  return NextResponse.json({ status: user?.status ?? 'none' })
}
