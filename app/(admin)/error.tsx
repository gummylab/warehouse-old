'use client'

import { useEffect } from 'react'

import { StateScreen } from '@/components/layout/state-screen'
import { Button } from '@/components/ui/button'

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
    <StateScreen
      tone="error"
      headingLevel="h2"
      title="เกิดข้อผิดพลาดในการแสดงผล"
      description="ข้อมูลอาจยังไม่ถูกโหลด ลองใหม่อีกครั้ง"
      reference={error.digest}
      actions={
        <Button variant="outline" onClick={() => retry()}>
          ลองใหม่
        </Button>
      }
    />
  )
}
