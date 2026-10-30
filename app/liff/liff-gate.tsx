'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { LiffNotice } from './liff-notice'
import { useLiffSession } from './liff-session-context'

const AUTH_PATH = '/liff/authorization'
const FORMS_PATH = '/liff/forms'

// UX gate for everything under /liff: only LINE-verified approved users get
// past the authorization screen. This steers navigation only; the real
// security stays at the /api/liff endpoints, which verify every caller
// themselves (ADR 0003). Client-side on purpose: the identity token exists
// only in the browser, so a server redirect cannot know who is opening.
export function LiffGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, stage, retry } = useLiffSession()

  useEffect(() => {
    if (status === 'none' || status === 'pending') {
      // Already on the request screen? Nothing to do; elsewhere head there.
      if (pathname !== AUTH_PATH) router.replace(AUTH_PATH)
      return
    }
    if (status === 'approved' && pathname === AUTH_PATH) {
      // Approved users have no business on the request screen.
      router.replace(FORMS_PATH)
    }
  }, [status, pathname, router])

  // The authorization screen owns its own copy for every state (request
  // button, pending text, notices); let it render.
  if (pathname === AUTH_PATH) return children
  if (status === 'approved') return children

  // none/pending are mid-redirect to the authorization screen; show the
  // loading notice instead of the destination flashing by.
  if (status === 'none' || status === 'pending') {
    return <LiffNotice status="loading" stage={null} onRetry={retry} />
  }

  return <LiffNotice status={status} stage={stage} onRetry={retry} />
}
