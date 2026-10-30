// A small in-process rate limiter for the public LIFF endpoints.
//
// Why it exists: the /api/liff/* handlers are the app's only public entry
// point (ADR 0001), and two of them spend an outbound HTTPS call to LINE
// on every request (ADR 0003). Without a limit, a single caller can turn
// the server into a relay for requests to LINE, or simply keep every
// request slow.
//
// The counter is per client address and lives in this process's memory,
// which is the right scope for a single self-hosted server: no shared
// store, nothing to run, and the limit resets when the server restarts.
//
// It is deliberately not the only defence. The WAF allowlist at
// Cloudflare is the real gate (ADR 0001); this is the second line, for
// the case where the allowlist is edited to cover /api/liff* and a
// single client then behaves badly.
import { isLocalDeviceRequest } from './local-device'

// The window and the number of requests allowed inside it. A LINE user
// opens the app a handful of times per shift, and the LIFF page sends
// one status call per load, so a generous limit still protects the
// server without getting in a real user's way.
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20

type Bucket = {
  count: number
  resetAt: number
}

// Keyed by client address. A Map that grows with the number of distinct
// addresses would leak, so old buckets are swept when the map is
// touched.
const buckets = new Map<string, Bucket>()

// The address a request came from. Cloudflare sets CF-Connecting-IP on
// every tunneled request, so that is the real client address for the
// public hostname. A request without it came straight from the machine
// (ADR 0004) and is not a remote caller, so it is not limited.
function clientKey(request: Request): string | null {
  const connectingIp = request.headers.get('cf-connecting-ip')
  if (connectingIp) return connectingIp
  if (isLocalDeviceRequest(request)) return null
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return null
}

// Returns true when the request may proceed, false when the client has
// used up its allowance. A local request is always allowed: it is the
// operator's own machine, and it never reaches the public surface.
export function isRateLimited(request: Request): boolean {
  const key = clientKey(request)
  if (key === null) return false

  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > MAX_REQUESTS_PER_WINDOW
}

// Drops the buckets whose window has passed. Called on every request
// rather than on a timer, so the map cannot grow without bound.
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

// The standard response for a rate-limited request. 429 with Retry-After
// tells the client when to come back, which matters for the LIFF page:
// it retries on its own.
export function rateLimitedResponse(): Response {
  return Response.json(
    { error: 'too-many-requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(WINDOW_MS / 1000)) },
    },
  )
}
