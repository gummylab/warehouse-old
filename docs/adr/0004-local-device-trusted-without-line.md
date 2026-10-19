# Local device requests are trusted without LINE verification

A request counts as local when it never passed through Cloudflare (no `CF-Connecting-IP` header) and its `Host` header names a loopback address (`localhost`, `127.0.0.1`, or `[::1]`). `/api/liff/status` answers such requests `approved` before reading the body: there is no token to verify and no users row is created. The identity is virtual, so the register screen never shows local sessions. The browser side detects the same condition from `window.location.hostname`, skips `liff.init` entirely, and posts to the status endpoint without a token. Every page under `/liff` then shows a banner naming the mode, so a local screen is never mistaken for a LINE-verified one.

Both conditions must hold at once, and the second one is only meaningful because `next dev` and `next start` bind to `127.0.0.1` (package.json). Tunnel traffic always carries `CF-Connecting-IP` (the Cloudflare edge sets it and clients cannot remove it), and with a loopback-only bind no other machine can open a connection with a loopback-looking `Host` header at all. Trusting the machine's own operator matches the trust the admin surface already grants: `/register` and the SQLite file are equally reachable from that machine, and admin pages are local-only by design (ADR 0001).

## Consequences

- Local device mode works in development and production alike: it is a property of the machine, not of `NODE_ENV`.
- Anyone who can make requests to `127.0.0.1` on the server machine is treated as an approved user. That is the operator, by definition.
- Removing the `127.0.0.1` bind from the scripts weakens the `Host` half of the check: a LAN client could then reach the origin directly with a forged loopback `Host`. Revisit this ADR before changing the bind.
- ADR 0003 still governs every request that is not local: verification happens before any database access, and local requests never reach the database.
