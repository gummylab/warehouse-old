'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { UserKeyIcon } from 'lucide-react'
import { LiffNotice } from '../liff-notice'
import { postJson, useLiffSession } from '../liff-session-context'

// The request screen: which state the user is in comes from the shared
// session context (the layout provider resolves the LINE identity once per
// load); this file owns only the request action and the copy for the two
// actionable states. "approved" never renders here, the gate redirects it.
export function AuthorizationClient() {
  const { status, stage, token, retry, applyStatus } = useLiffSession()
  const [requesting, setRequesting] = useState(false)
  const [requestFailed, setRequestFailed] = useState(false)

  async function requestAccess() {
    if (!token || requesting) return
    setRequesting(true)
    const data = await postJson('/api/liff/request', token)
    setRequesting(false)
    if (!data) {
      setRequestFailed(true)
      return
    }
    applyStatus(data.status === 'pending' ? 'pending' : 'none')
  }

  if (requestFailed) {
    return <LiffNotice status="error" stage="api" onRetry={() => setRequestFailed(false)} />
  }

  switch (status) {
    case 'none':
      return (
        <Button onClick={() => void requestAccess()} disabled={requesting}>
          <UserKeyIcon />
          ขอสิทธิ์การใช้งานระบบ
        </Button>
      )
    case 'pending':
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="text-muted-foreground">คำขอของคุณอยู่ระหว่างรอการอนุมัติ</p>
        </div>
      )
    case 'approved':
      return null
    default:
      return <LiffNotice status={status} stage={stage} onRetry={retry} />
  }
}
