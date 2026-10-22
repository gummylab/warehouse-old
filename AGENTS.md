# AGENTS.md

Next.js 16 dashboard for warehouse order images ("Warehouse Dashboard"). Bun is the package manager. UI copy is Thai.

## Commands

All run with bun (do not use npm/yarn/pnpm, `packageManager: bun@1.4.2`):

- `bun run dev` → dev server on port **8080** (not 3000). Loads `.env` automatically.
- `bun run lint` → ESLint flat config.
- `bun run typecheck` → `bunx next typegen && bunx tsc --noEmit`. The typegen step writes the generated route types (`PageProps`, `RouteContext`) that the code uses; without it the typecheck sees no route types at all.
- `bun run test` → Vitest unit tests under `tests/unit` (`test:watch` to keep them running).
- `bun run test:e2e` → Playwright, which starts its own server on port **3100** (specs in `tests/e2e`, `test:e2e:ui` for the UI runner).
- `bun run verify` → lint + typecheck + unit tests + production build. Run this before claiming a change works. The build step is part of it because cacheComponents only surfaces its validation errors there, not in dev.
- `bun run dev:tunnel` → dev server + Cloudflare Tunnel side by side (`concurrently`).
- `bun run tunnel` → tunnel only. Requires `CLOUDFLARE_TUNNEL_TOKEN` in `.env`, exits if missing.
- `bun run build` / `bun run start` → production. `start` runs Next + tunnel; `start:next` runs Next alone.

## Tests

Two layers, split by what they can prove.

- **Unit (`tests/unit`, Vitest, `environment: 'node'`)** covers the pure rules (item numbering, validation, storage keys, page titles) and the server logic that needs a real database (data layer, LINE identity with `fetch` stubbed, the session/auth matrix, route handlers called directly with a `Request`). They run on Node rather than Bun on purpose: `better-sqlite3` must load on the same runtime as production, and `bun run dev` runs Next on Node.
- **E2E (`tests/e2e`, Playwright)** runs a real browser against a real server for the journeys unit tests cannot reach: the LIFF routing gate, the whole order-image flow, and the register queue. First run on a machine needs `bunx playwright install chromium`.

Data isolation is the part to understand before adding a test:

- `tests/unit/setup/db.ts` exports `isolateTestData()`. Call it at the top of any test file that touches the database or the upload folder: it points `WH_DB_PATH` and `STORAGE_PATH` at a temp dir and wipes both before every test, so counting rows is trustworthy and nothing reaches `database/wh.db`.
- Those two variables are read lazily (`lib/db/index.ts` on open, `lib/order-images/storage.ts` per call), which is what makes the swap possible. An open connection is cached on `globalThis.__whDb`, so the helper calls `closeDb()` around every test.
- The e2e harness owns its own server, port, database, upload folder and Next build output (`tests/e2e/support/env.ts`, `playwright.config.ts`; `WH_DIST_DIR` in `next.config.ts`). It never touches port 8080, the real database or the developer's `.next`.
- The e2e runner and the server it starts must agree on the run id (`WH_E2E_RUN_ID`), or they work on different database files and the specs see neither the seeded rows nor the deletions. `tests/e2e/support/env.ts` sets it on the runner's process and `playwright.config.ts` passes it on in `webServer.env`.
- The e2e specs import the data layer, which carries the `server-only` marker. That package throws on import unless the `react-server` export condition is set, which Next sets for the server bundle but Playwright does not: the `test:e2e` scripts pass `--conditions=react-server` for that reason.
- Playwright specs run on `127.0.0.1`, which is exactly local device mode (ADR 0004), so the whole order-image journey runs without LINE. To test the remote path, a request must declare that it came through Cloudflare by sending `CF-Connecting-IP` (see `AS_REMOTE` in `tests/e2e/auth-guards.spec.ts`).
- A LINE-verified identity cannot be produced from a browser, so the register and cookie cases seed rows through the real data layer (`tests/e2e/support/data.ts`) and mint cookies with the harness secret. Each spec uses a unique name or id because the specs share one database.
- A component library reports a misused component in the browser console, and a locator assertion never sees it. `tests/e2e/support/console.ts` collects those console errors, and the specs that walk a screen check them at the end. A spec that clicks through a screen without that check passes while the console fills up with errors.
- Bun loads `.env` into the test process, so a test that depends on an env var must set it explicitly rather than rely on it being absent.

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
- Base UI's `Button` must not render a link. It enforces button semantics (`role="button"`, keyboard handlers), so a `<Link>` inside it gets the wrong semantics and the browser console complains. Use `ButtonLink` from `components/ui/button.tsx` for a link that looks like a button; it styles the `<a>` with `buttonVariants` and keeps the link's own semantics.
- Base UI `Button` renders `type="button"` by default (unlike native HTML), so inside a `<form action={serverAction}>` it will silently do nothing — pass `type="submit"` explicitly.
- `cn` comes from the `cn` package; `lib/utils.ts` just re-exports it. Both `import { cn } from 'cn'` and `from '@/lib/utils'` appear in existing files.
- Tailwind v4 is wired through a Turbopack loader rule in `next.config.ts` (`cacheComponents` and `partialPrefetching` are enabled). Do not look for `tailwind.config`. The rule matches every `*.css` (the ones in node_modules included, because the loader skips the files with no Tailwind directive) but excludes `*.module.css`, which has to keep its own scoping.
- `tunnel.ts` deliberately drops most cloudflared log lines to keep the tunnel token and noise out of logs. Keep the filtering when editing it.
- `.env` is gitignored and holds a real tunnel token. Never commit it or echo it in scripts.
- Local device mode (ADR 0004): opening `/liff` on `localhost` skips LINE. The server trusts requests with no `CF-Connecting-IP` header plus a loopback `Host`, and the browser skips `liff.init` when `location.hostname` is loopback. `dev`/`start:next` bind `127.0.0.1`, which is what makes the `Host` half of that check hold; do not drop `--hostname 127.0.0.1`.
- The admin surface is local-only by design (ADR 0001), and that promise is kept in code as well: `lib/local-machine.ts` holds the loopback rule, `lib/admin/authorize.ts` uses it to guard the server actions, and `app/(admin)/admin-gate.tsx` uses it to keep the pages themselves from rendering for anyone else. A new admin write must go through `requireLocalAdminRequest()`.
- The register screen removes a decided row optimistically (`useOptimistic`). The removal has to happen inside the button's own action, because React rejects an optimistic update made outside a transition or an action. A refusal puts the row back, and the error is reported above the table rather than next to the button, because the button unmounts together with the row it removed.
- README documents the real commands and the env variables. Keep it in step with `package.json`.
- The e2e server must keep its own `distDir`: two Next servers sharing one `.next` fight over build artifacts. That directory is fixed (`tests/.tmp/e2e/dist`, not per run) because Next appends a `distDir`-specific type path to `tsconfig.json`'s `include` whenever it writes that file — a per-run path would grow a new entry on every run and leave the tree dirty. The two entries for the fixed path are committed there.
- Everything a test run writes lives under `tests/.tmp/` (plus Playwright's `test-results/` and `playwright-report/`) and is gitignored. ESLint ignores those paths too, or it would lint the generated build output.

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
