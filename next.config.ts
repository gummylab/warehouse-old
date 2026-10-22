import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // /liff is only a folder prefix; land visitors on the authorization screen
  // instead of a 404. Done here (before render) rather than with an
  // app/liff/page.tsx calling redirect(): that logs "Could not validate
  // `instant`" under cacheComponents in Next 16.4. Temporary (307) on
  // purpose so the destination can change without cached 308s fighting us.
  async redirects() {
    return [{ source: '/liff', destination: '/liff/authorization', permanent: false }]
  },
  // Let the Cloudflare tunnel host through Next's cross-origin block on dev
  // resources, so HMR's websocket works when the page is opened via
  // wh-bot.itclex.space from a phone. Dev-only setting; production unaffected.
  allowedDevOrigins: ['wh-bot.itclex.space'],
  poweredByHeader: false,
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // The tunnel's hostname is public, so the app answers to the open
  // internet. These headers are the cheap, standard defences:
  //   - nosniff stops the browser from guessing a content type other than
  //     the one the server sent, which matters for the image route: the
  //     bytes come from a phone upload.
  //   - frame-ancestors 'none' keeps the app out of someone else's iframe.
  //   - referrer-policy stops the public hostname from leaking into a
  //     third party's logs when a link is followed.
  // The admin pages are local-only (ADR 0001) but share these headers:
  // one rule set is easier to reason about than two.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  // The e2e harness runs its own server beside the developer's dev server
  // (playwright.config.ts). Two Next servers sharing one .next directory
  // fight over build artifacts, so the harness points WH_DIST_DIR at its own
  // throwaway tree. Unset means the normal .next, i.e. nothing changes for
  // `bun run dev` / `bun run build`.
  distDir: process.env.WH_DIST_DIR ?? '.next',
  turbopack: {
    rules: {
      // Tailwind's Turbopack loader. The glob covers every CSS file, the
      // ones in node_modules included, because the loader's own "quick bail"
      // skips the files that hold no Tailwind directive (tw-animate-css and
      // shadcn's stylesheet among them).
      //
      // A CSS module ('*.module.css') is deliberately left out: the loader
      // is for the global stylesheet, and a module file has to keep its own
      // scoping, which the loader would flatten.
      '*.css': {
        condition: { not: { path: '*.module.css' } },
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
