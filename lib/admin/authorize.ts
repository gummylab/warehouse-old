// Authorization for the admin surface.
//
// The admin pages are local-only by design (ADR 0001): the Cloudflare WAF
// allowlist lets only /liff*, /_next/* and /favicon.ico through, and the
// server binds to 127.0.0.1 (package.json). A server action, though, is a
// plain POST endpoint that anyone who can reach the origin can call, so
// "the page is not linked" is not a boundary: the action itself has to
// check.
//
// The rule is the one ADR 0004 already accepts for the LIFF surface: the
// machine running the server is the operator. A request qualifies when it
// never passed through Cloudflare (no CF-Connecting-IP) and names the
// loopback host. Both halves matter, and the second one depends on the
// 127.0.0.1 bind: loosening the bind lets a LAN client forge a loopback
// Host header, so revisit this before changing it.
//
// This is a second line of defence, not the first. The WAF rule and the
// bind are the primary controls; this check keeps a mistake in either of
// them from turning into a public approve/revoke button.
import { headers } from 'next/headers'

import { isLocalMachineHeaders } from '../local-machine'

// True when the caller is the machine running the server. Reads the
// request headers, so it is runtime data: call it from inside a Suspense
// boundary (a page) or from a server action.
export async function isLocalAdminRequest(): Promise<boolean> {
  return isLocalMachineHeaders(await headers())
}

// Throws when the caller is not the machine running the server. The message
// stays generic on purpose: it tells the operator what happened without
// describing the rule to someone probing the endpoint.
export async function requireLocalAdminRequest(): Promise<void> {
  if (!(await isLocalAdminRequest())) {
    throw new Error('คำขอนี้มาจากเครื่องอื่นที่ไม่ใช่เครื่องของผู้ดูแลระบบ')
  }
}
