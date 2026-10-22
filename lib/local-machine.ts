// The machine running the server is the operator. This module holds the one
// primitive that decides whether a request came straight from that machine,
// shared by the two places that need it:
//
//   - the LIFF surface, which treats such a request as an approved user
//     without asking LINE (ADR 0004)
//   - the admin surface, whose server actions accept writes only from that
//     machine (see lib/admin/authorize.ts)
//
// Two conditions must BOTH hold:
//   1. It never passed through Cloudflare. The edge sets CF-Connecting-IP
//      on every tunneled request and a client cannot remove or forge it,
//      so a request without it came in directly.
//   2. It names the loopback host. The dev and production servers bind to
//      127.0.0.1 (package.json), so no other machine can open a connection
//      with a loopback-looking Host header; weakening that binding weakens
//      this check.
//
// Tunnel traffic therefore never matches (it always carries the header).

// window.location.hostname keeps IPv6 brackets ("[::1]"); a Host header
// carries an optional port ("localhost:8080").
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

// The subset of the Headers API this module needs, so both a real Request's
// headers and the read-only headers() of a server action fit.
type HeaderReader = {
  get(name: string): string | null
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(parseHostname(host).toLowerCase())
}

// Extracts the hostname from a Host header. The header carries an optional
// port, and an IPv6 literal is bracketed: '[::1]:8080'.
function parseHostname(host: string): string {
  if (host.startsWith('[')) {
    const end = host.indexOf(']')
    return end === -1 ? host : host.slice(0, end + 1)
  }
  // A bare IPv6 literal has more than one colon, so splitting on the first
  // one would cut the address in half. The Host header should carry a
  // bracketed literal, but the set lists the bare form too, so it has to be
  // parsed rather than left as an entry nothing can ever match.
  if (host.indexOf(':') !== host.lastIndexOf(':')) {
    return host
  }
  return host.split(':')[0]
}

// Server side: does this request come straight from the machine itself?
export function isLocalMachineHeaders(headers: HeaderReader): boolean {
  if (headers.get('cf-connecting-ip')) return false
  const host = headers.get('host')
  return host !== null && isLoopbackHost(host)
}

export function isLocalMachineRequest(request: Request): boolean {
  return isLocalMachineHeaders(request.headers)
}
