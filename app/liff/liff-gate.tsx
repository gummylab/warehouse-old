'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { AUTH_PATH, gateRedirect } from '@/lib/liff/form-access'

import { LiffNotice } from './liff-notice'
import { useLiffSession } from './liff-session-context'

// UX gate for everything under /liff: only LINE-verified approved users get
// past the authorization screen, and an approved user may only open the forms
// granted to them. This steers navigation only; the real security stays at
// the /api/liff endpoints, which check approval and the form grant for every
// caller themselves (ADR 0003, ADR 0017). Client-side on purpose: the
// identity token exists only in the browser, so a server redirect cannot know
// who is opening.
export function LiffGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, stage, retry, forms } = useLiffSession()
  const redirect = gateRedirect(status, pathname, forms)

  useEffect(() => {
    if (redirect) router.replace(redirect)
  }, [redirect, router])

  // The authorization screen owns its own copy for every state (request
  // button, pending text, notices); let it render while the redirect is in
  // flight.
  if (pathname === AUTH_PATH) return children

  if (status === 'approved') {
    // Hold the destination back while a redirect is in flight (a form the
    // user no longer has): rendering it would flash a screen whose API calls
    // all answer 403.
    if (redirect) return <LiffNotice status="loading" stage={null} onRetry={retry} />
    return children
  }

  // none/pending are mid-redirect to the authorization screen; show the
  // loading notice instead of the destination flashing by.
  if (status === 'none' || status === 'pending') {
    return <LiffNotice status="loading" stage={null} onRetry={retry} />
  }

  return <LiffNotice status={status} stage={stage} onRetry={retry} />
}
