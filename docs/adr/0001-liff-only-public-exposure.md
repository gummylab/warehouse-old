# Tunnel exposes only /liff via a Cloudflare WAF allowlist

The public hostname behind Cloudflare Tunnel serves only the LIFF pages; every other path (the admin dashboard, `/order-images`, `/register`) is blocked at the Cloudflare edge so those pages stay reachable from localhost only. The rule allows exactly `/liff*`, `/_next/*` (the LIFF page loads its JS/CSS from there), and `/favicon.ico`, and is scoped with `http.request.host` so it cannot affect other hostnames in the zone.

cloudflared ingress could not do this: it matches hostnames only, not paths. Zero Trust Access and a Worker were rejected because they add a login wall in front of LINE users or an extra deployable, while a WAF rule is a one-time dashboard setting.

## Consequences

- The rule lives in the Cloudflare dashboard (Security > WAF > Custom rules), not in this repo; the repo only holds the tunnel token, which cannot manage WAF.
- Exposing a new public path means editing that rule at Cloudflare. New admin pages are blocked automatically by the allowlist, so no action is needed for them.
