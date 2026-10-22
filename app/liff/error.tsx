'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Error boundary for the LIFF section, which runs on a phone in the
// warehouse. The screen is read at arm's length, often with gloves on, so
// the message is short, the retry button is large, and the way back to the
// form hub is one tap away.
export default function LiffError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h2 className="text-base font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="text-sm text-muted-foreground">
        กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ ให้แจ้งผู้ดูแลระบบ
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">รหัสอ้างอิง: {error.digest}</p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          ลองใหม่
        </button>
        <Link
          href="/liff/forms"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium"
        >
          กลับไปหน้าแบบฟอร์ม
        </Link>
      </div>
    </div>
  )
}
