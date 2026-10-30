# The order-image form authenticates with its own session cookie

Every other `/api/liff` endpoint verifies the caller's LINE token against LINE on each request (ADR 0003). The order-image form exchanges its idToken once for an httpOnly session cookie (`wh_order_image_session`, HS256 signed with `jose` using `LIFF_SESSION_SECRET` from `.env`, minimum 32 characters, 12-hour TTL). Its endpoints, including `GET /api/liff/order-images/images/<id>/file` (which arrives only as an `<img src>` request), then authenticate from that cookie, with a Bearer token still accepted as a fallback for callers that have not exchanged yet. An image tag cannot send an `Authorization` header, and verifying every thumbnail with LINE over the public internet would add an external round trip per picture; the cookie removes both problems. Local-device requests (ADR 0004) skip the cookie entirely.

The cookie proves identity, never permission: every request re-reads the users row (`getUserByLineId`) and requires `approved`, so revoking a user (which deletes the row, ADR 0003) cuts access on the very next request instead of when the cookie expires. The exchange itself still runs the full ADR 0003 verification: a cookie is only ever minted after LINE vouched for the token.

## Consequences

- A missing or short `LIFF_SESSION_SECRET` fails closed: the session route refuses to mint a cookie and the endpoints answer 503. There is no silent fallback to a weak key.
- The stolen-cookie window is bounded by the 12-hour TTL and the per-request approval check; the cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Stored bytes are served with `Cache-Control: private, max-age=31536000, immutable`: private because access is authenticated, immutable because an image id never changes content (a replaced photo gets a new id).
- The form's fetch layer re-exchanges automatically on a 401, so an expired cookie mid-session heals instead of dead-ending the page.
