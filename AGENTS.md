# AGENTS.md

Next.js 16 dashboard for warehouse order images ("Warehouse Dashboard"). Bun is the package manager. UI copy is Thai.

## Commands

All run with bun (do not use npm/yarn/pnpm, `packageManager: bun@1.4.2`):

- `bun run dev` → dev server on port **8080** (not 3000). Loads `.env` automatically.
- `bun run lint` → ESLint flat config. Only verification gate in the repo.
- `bun run dev:tunnel` → dev server + Cloudflare Tunnel side by side (`concurrently`).
- `bun run tunnel` → tunnel only. Requires `CLOUDFLARE_TUNNEL_TOKEN` in `.env`, exits if missing.
- `bun run build` / `bun run start` → production. `start` runs Next + tunnel; `start:next` runs Next alone.

No test runner and no typecheck script exist. For types run `bunx tsc --noEmit` (tsconfig already sets `noEmit`).

## Layout architecture

- `app/layout.tsx` (root) is intentionally thin: Kanit font, `TooltipProvider`, global metadata title template ("Warehouse Dashboard"). Do not add sidebar or header here.
- `app/(admin)/layout.tsx` owns the dashboard chrome: `SidebarProvider` + `AppSidebar` + header with `SidebarTrigger` and `AppNavbarLabel`. Every admin page lives under `app/(admin)/`; the route group name does not appear in URLs.
- Pages outside `(admin)` (currently `app/liff/authorization`) render without sidebar/header by design. The `app/liff/layout.tsx` wrapper only adds `<main>` padding.
- `lib/page-titles.ts` is the single source of truth for page titles, shared by `metadata.title` in each page and the header label (`components/app-navbar-label.tsx` via `getPageTitle`). When adding a route: add its path key there, or the header falls back to the decoded last URL segment.
- `components/app-sidebar.tsx` hardcodes nav links. Keep its `href`s in sync with the folders under `app/(admin)/` (a stale href silently 404s).

## Gotchas

- The dev server is the user's: never start `bun run dev` / `dev:tunnel` yourself, never kill port 8080 unless asked, and only `curl` against a server the user already started.
- The `/liff` root redirect (307 to `/liff/authorization`) lives in `next.config.ts` `redirects()`, not in an `app/liff/page.tsx`: `redirect()` in a page logs "Could not validate `instant`" under cacheComponents (seen on Next 16.4).
- New pages under `/liff` (any route besides `/liff/authorization`) need `export const instant = false`: the LIFF gate in the layout withholds children until the LINE session resolves, so instant-navigation validation drops the segment and logs an error. `/liff/authorization` is exempt because the gate always renders it.
- Public exposure: the tunnel's public hostname serves only `/liff*`, `/_next/*` and `/favicon.ico`; every other path returns 403 from a Cloudflare WAF allowlist rule (dashboard, not code, see `docs/adr/0001-liff-only-public-exposure.md`). Admin pages are local-only by design. Exposing a new public path means editing the rule at Cloudflare, never repo code.
- Duplicate route crash: two pages resolving to one path kill dev with "You cannot have two parallel pages...". When moving a page into a route group, delete the original file in the same change.
- shadcn here uses style `base-luma` = Base UI, not Radix. Compose components with the `render` prop (`render={<Link href="..." />}`), there is no `asChild`.
- Base UI `Button` renders `type="button"` by default (unlike native HTML), so inside a `<form action={serverAction}>` it will silently do nothing — pass `type="submit"` explicitly.
- `cn` comes from the `cn` package; `lib/utils.ts` just re-exports it. Both `import { cn } from 'cn'` and `from '@/lib/utils'` appear in existing files.
- Tailwind v4 is wired through a Turbopack loader rule in `next.config.ts` (`cacheComponents` and `partialPrefetching` are enabled). Do not look for `tailwind.config`.
- `tunnel.ts` deliberately drops most cloudflared log lines to keep the tunnel token and noise out of logs. Keep the filtering when editing it.
- `.env` is gitignored and holds a real tunnel token. Never commit it or echo it in scripts.
- Local device mode (ADR 0004): opening `/liff` on `localhost` skips LINE. The server trusts requests with no `CF-Connecting-IP` header plus a loopback `Host`, and the browser skips `liff.init` when `location.hostname` is loopback. `dev`/`start:next` bind `127.0.0.1`, which is what makes the `Host` half of that check hold; do not drop `--hostname 127.0.0.1`.
- README is untouched create-next-app boilerplate (claims port 3000); trust `package.json`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Ignore routine debugging and unverified changes. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Keep a qualifying candidate through the reporting pass even if you resolve or work around it. A successful fix changes the report outcome; it does not erase the friction that qualified it.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `node node_modules/next/dist/bin/next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
