// Local device trust (ADR 0004): a request from the machine running the
// server skips LINE verification and is treated as approved. Two conditions
// must BOTH hold:
//   1. It never passed through Cloudflare. The edge sets CF-Connecting-IP
//      on every tunneled request and a client cannot remove or forge it,
//      so a request without it came in directly.
//   2. It names the loopback host. The dev and production servers bind to
//      127.0.0.1 (package.json), so no other machine can open a connection
//      with a loopback-looking Host header; weakening that binding
//      weakens this check.
// Tunnel traffic therefore never matches (it always carries the header),
// and ADR 0003 verification still applies to every remote caller.

// window.location.hostname keeps IPv6 brackets ("[::1]"); a Host header
// carries an optional port ("localhost:8080").
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

function isLoopbackHost(host: string): boolean {
  const hostname = host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)
    : host.split(':')[0]
  return LOOPBACK_HOSTS.has(hostname.toLowerCase())
}

// Server side: does this request come straight from the machine itself?
export function isLocalDeviceRequest(request: Request): boolean {
  if (request.headers.get('cf-connecting-ip')) return false
  const host = request.headers.get('host')
  return host !== null && isLoopbackHost(host)
}

// Client side: is the page being opened on the machine itself? Guards
// window so the module also loads during server rendering.
export function isLocalDeviceBrowser(): boolean {
  return (
    typeof window !== 'undefined' && isLoopbackHost(window.location.hostname)
  )
}
