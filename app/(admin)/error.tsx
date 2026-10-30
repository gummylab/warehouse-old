'use client'

import { useEffect } from 'react'

// Error boundary for the admin section. A failed database read (a locked
// file, a full disk) lands here instead of the bare Next.js error page,
// and the operator gets a button to retry without reloading.
export default function AdminError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <h2 className="text-base font-semibold">เกิดข้อผิดพลาดในการแสดงผล</h2>
      <p className="text-sm text-muted-foreground">
        ข้อมูลอาจยังไม่ถูกโหลด ลองใหม่อีกครั้ง
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
  )
}
