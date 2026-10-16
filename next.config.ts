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
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
