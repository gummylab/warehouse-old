'use client'

import { useEffect } from 'react'

// Global error UI: the last line of defence, shown when even the root
// layout fails to render. It replaces the root layout, so it has to bring
// its own <html> and <body>, and it cannot use the app's global styles.
//
// The digest identifies the error in the server log, so the operator can
// match a report from a phone to a line in the dev server output.
export default function GlobalError({
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
    <html lang="th">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
          <h1 className="text-lg font-semibold">เกิดข้อผิดพลาดที่ระบบ</h1>
          <p className="text-sm text-muted-foreground">
            กรุณาลองใหม่อีกครั้ง ถ้ายังพบปัญหาให้แจ้งผู้ดูแลระบบ
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">รหัสอ้างอิง: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  )
}
