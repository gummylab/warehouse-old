'use client'

import { StateScreen } from '@/components/layout/state-screen'
import { Button } from '@/components/ui/button'

import type { LiffStage, LiffStatus } from './liff-session-context'

// Copy for every non-actionable LIFF session state, shared by the layout
// gate and the authorization screen so both always say the same thing.
export function LiffNotice({
  status,
  stage,
  onRetry,
}: {
  status: Exclude<LiffStatus, 'none' | 'pending' | 'approved'>
  stage: LiffStage | null
  onRetry: () => void
}) {
  switch (status) {
    case 'loading':
      return <StateScreen loading title="กำลังโหลด…" />
    case 'unconfigured':
      return <StateScreen tone="error" title="ยังไม่ได้ตั้งค่า LIFF ID" />
    case 'outside-line':
      return <StateScreen title="เปิดลิงก์นี้จากในแอป LINE อีกครั้ง" />
    case 'error':
      return (
        <StateScreen
          tone="error"
          title="เกิดข้อผิดพลาด"
          description="กรุณาลองใหม่"
          // The phone has no console; in development the stage names where
          // the bootstrap stopped.
          debug={process.env.NODE_ENV === 'development' ? (stage ?? undefined) : undefined}
          actions={
            <Button variant="outline" onClick={onRetry}>
              ลองใหม่
            </Button>
          }
        />
      )
  }
}
