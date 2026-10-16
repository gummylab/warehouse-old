'use client'

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
      return <p className="text-muted-foreground">กำลังโหลด...</p>
    case 'unconfigured':
      return <p className="text-destructive">ยังไม่ได้ตั้งค่า LIFF ID</p>
    case 'outside-line':
      return <p className="text-muted-foreground">เปิดลิงก์นี้จากในแอป LINE อีกครั้ง</p>
    case 'error':
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="text-destructive">เกิดข้อผิดพลาด กรุณาลองใหม่</p>
          {process.env.NODE_ENV === 'development' && stage && (
            <p className="text-muted-foreground text-xs">{stage}</p>
          )}
          <Button variant="outline" onClick={onRetry}>
            ลองใหม่
          </Button>
        </div>
      )
  }
}
