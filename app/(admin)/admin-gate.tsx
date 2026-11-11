import { isLocalAdminRequest } from '@/lib/admin/authorize'

// The gate for the whole admin section.
//
// The admin pages are local-only by design (ADR 0001): the Cloudflare WAF
// allowlist lets only /liff*, /_next/* and /favicon.ico through, and the
// server binds to 127.0.0.1 (package.json). This component is the in-code
// half of that promise: a request that did not come from the machine
// running the server never sees the admin pages at all.
//
// It lives in the layout rather than in each page so a new admin page
// cannot forget the check. The server-action guard (lib/admin/authorize.ts)
// stays separate, because an action is a POST endpoint that anyone who can
// reach the origin can call, whether or not they ever loaded the page.
//
// The check reads the request headers, so it is runtime data: the layout
// wraps it in a Suspense boundary (see (admin)/layout.tsx).
export default async function AdminGate({ children }: { children: React.ReactNode }) {
  if (!(await isLocalAdminRequest())) {
    return (
      <p className="text-sm text-muted-foreground">
        หน้านี้เปิดได้เฉพาะเครื่องของแอดมินเท่านั้น
      </p>
    )
  }

  return children
}
