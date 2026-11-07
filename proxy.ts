import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// In-memory rate limiter (no external deps). Runs on Node.js runtime (proxy.ts).
// Limits are per-IP, per-window. Entries expire automatically.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Clean up expired entries every 60s to prevent unbounded growth.
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key)
  }
}

function checkLimit(key: string, limit: number, windowMs: number): boolean {
  cleanup()
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count++
  return true
}

// Rate limit config per path prefix.
const LIMITS: { prefix: string; suffix?: string; limit: number; windowMs: number }[] = [
  { prefix: '/api/liff/order-images/items/', suffix: '/images', limit: 20, windowMs: 60_000 }, // uploads: 20/min
  { prefix: '/api/liff/', limit: 120, windowMs: 60_000 }, // general: 120/min
]

function getLimit(pathname: string): { limit: number; windowMs: number } {
  for (const l of LIMITS) {
    if (l.suffix && pathname.startsWith(l.prefix) && pathname.endsWith(l.suffix)) {
      return { limit: l.limit, windowMs: l.windowMs }
    }
    if (!l.suffix && pathname.startsWith(l.prefix)) {
      return { limit: l.limit, windowMs: l.windowMs }
    }
  }
  return { limit: 120, windowMs: 60_000 }
}

export function proxy(request: NextRequest) {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const { limit, windowMs } = getLimit(request.nextUrl.pathname)
  const key = `${ip}:${request.nextUrl.pathname.split('/').slice(0, 4).join('/')}`

  if (!checkLimit(key, limit, windowMs)) {
    return new NextResponse(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(windowMs / 1000)),
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/liff/:path*'],
}
