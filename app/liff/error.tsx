'use client'

import { useEffect } from 'react'

import { StateScreen } from '@/components/layout/state-screen'
import { Button, ButtonLink } from '@/components/ui/button'

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
    <StateScreen
      tone="error"
      title="เกิดข้อผิดพลาด"
      description="กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ ให้แจ้งแอดมิน"
      reference={error.digest}
      actions={
        <>
          <Button onClick={() => retry()}>ลองใหม่</Button>
          <ButtonLink href="/liff/forms" variant="outline">
            กลับไปหน้าแบบฟอร์ม
          </ButtonLink>
        </>
      }
    />
  )
}
