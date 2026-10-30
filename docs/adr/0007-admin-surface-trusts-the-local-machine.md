# The admin surface trusts only the machine running the server

The admin pages and the server actions behind them are reachable only from the machine that runs the server. That promise was previously kept in two places outside the repo: the Cloudflare WAF allowlist, which lets only `/liff*`, `/_next/*` and `/favicon.ico` through, and the `127.0.0.1` bind in the start scripts. A server action is a plain POST endpoint, so "the page that renders the button is the only way in" was never true: anyone who could reach the origin could POST the action directly. A mistake in either of the two outside controls, or a future change that widens the bind, would have turned approve/revoke into a public button.

The rule is the one ADR 0004 already accepts for the LIFF surface: the machine running the server is the operator. A request qualifies when it never passed through Cloudflare (no `CF-Connecting-IP` header) and names the loopback host. Both halves matter, and the second one depends on the `127.0.0.1` bind: loosening the bind lets a LAN client forge a loopback `Host` header. The primitive lives in `lib/local-machine.ts` because both surfaces need it; `lib/liff/local-device.ts` keeps the LIFF-facing names.

The check runs in two places. `lib/admin/authorize.ts` guards every write, so an action refuses a caller that is not the local machine. `app/(admin)/admin-gate.tsx` guards the pages, so the register queue (every user who asked for access) is not rendered for anyone else.

## Consequences

- A new admin write must call `requireLocalAdminRequest()` before it touches the database. The action is the security boundary; the gate around the page is the user-facing half.
- The loopback `Host` half of the check depends on the `127.0.0.1` bind. Revisit this decision before changing it, exactly as ADR 0004 warns.
- The WAF allowlist stays the primary control. This is the second line, not a replacement: it keeps a mistake in the allowlist, or a widened bind, from becoming a public approve/revoke button.
- The check reads the request headers, so it is runtime data. The page-level gate therefore lives inside a `<Suspense>` boundary in the admin layout.
- A local request is never rate limited, and never counts towards the public endpoint's allowance: it is the operator's own machine.
