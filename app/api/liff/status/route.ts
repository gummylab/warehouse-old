import { NextResponse } from 'next/server'

import { getUserByLineId } from '@/lib/db/users'
import { readLineTokenRequest, resolveLineIdentity } from '@/lib/liff/identity'

// POST /api/liff/status — public once the WAF allowlist covers /api/liff*
// (edited at Cloudflare, per ADR 0001), so the LINE identity check below is
// the only gate before the database is read.
export async function POST(request: Request) {
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
