'use client'

import { useLiffSession } from './liff-session-context'

// Marks every /liff page while the session came from local device trust
// (ADR 0004) instead of LINE verification, so a screen on this machine is
// never mistaken for what a LINE user sees. Lives in the layout, above the
// gate, so it covers the authorization screen and the forms alike.
export function LocalDeviceBanner() {
  const { mode } = useLiffSession()
  if (mode !== 'local') return null
  return (
    <div
      role="status"
      className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
    >
      โหมดอุปกรณ์ภายใน: เปิดจากเครื่องรันระบบโดยตรง ไม่ผ่านการยืนยันตัวตนด้วย LINE
    </div>
  )
}
