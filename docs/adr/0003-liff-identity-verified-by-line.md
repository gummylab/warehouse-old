# LIFF identity is verified by LINE before any database access

Every `/api/liff/*` handler resolves the caller by sending the LIFF token (ID token or access token from `@line/liff`) to LINE's own verification API and only then uses the returned `line_user_id`. Client-sent profiles are never trusted: once the WAF allowlist covers `/api/liff*` (edited at Cloudflare per ADR 0001), these endpoints face the public internet, and an unverified one would let anyone mint pending rows for arbitrary LINE users or probe their status. Verification costs one HTTPS call to LINE per request, which is fine for a single-user-at-a-time admin tool.

Related decision from the same round: rejecting an access request deletes the row instead of storing a `rejected` status. The user simply sees the request button again next time, and the schema keeps only `pending`/`approved`. The trade-off is that rejected requests leave no audit trail; if we later need to know who was rejected or why, this decision must be revisited.

## Consequences

- No `/api/liff` route may read or write the users table before `resolveLineIdentity` returns ok; `lib/liff/identity.ts` holds the single verification helper.
- `NEXT_PUBLIC_LIFF_ID` must exist in `.env` for verification (it is the OAuth client_id/audience); without it the endpoints answer 503 and the LIFF page shows a configuration notice.
- Tokens travel from the browser to our server only to be forwarded to LINE; they are never logged or stored.
- The owner adds `/api/liff*` to the WAF allowlist at Cloudflare; until then the API is reachable from localhost only, which is enough for development.
