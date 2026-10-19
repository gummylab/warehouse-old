'use client'

import { usePathname } from 'next/navigation'

// Centers the gate content (authorization states, loading notice) in the
// remaining viewport of every /liff page. The form routes (/liff/forms,
// /liff/form/...) stay top-aligned: their own content is a full page, and
// centering would fight the natural top-to-bottom reading order. Lives as
// its own client component so the liff layout stays a server component;
// flex-1 stretches from the layout's flex-column main without percentage
// heights (LINE's older in-app WebView has no dvh, and percentages collapse
// against auto-height ancestors).
export function LiffCenter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const centered = !pathname.startsWith('/liff/form')
  return (
    <div
      className={
        centered
          ? 'flex flex-1 flex-col items-center justify-center'
          : 'flex flex-1 flex-col'
      }
    >
      {children}
    </div>
  )
}
