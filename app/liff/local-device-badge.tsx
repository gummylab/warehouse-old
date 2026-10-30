'use client'

import { useLiffSession } from './liff-session-context'

// Marks every /liff page while the session came from local device trust
// (ADR 0004) instead of LINE verification, so a screen on this machine is
// never mistaken for what a LINE user sees. Lives in the layout, above the
// gate, so it covers the authorization screen and the forms alike.
export function LocalDeviceBadge() {
  const { mode } = useLiffSession()
  if (mode !== 'local') return null
  return (
    <span
      role="status"
      className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
    >
      Admin
    </span>
  )
}
