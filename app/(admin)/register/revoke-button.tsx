'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { revokeUser } from './actions'

// Revoke button for the approved table: a direct destructive button (one
// action, so no dropdown) behind a confirm dialog, because the write
// deletes the user's row outright. On success the server action
// revalidates /register, the row leaves the table, and this component
// unmounts with it.
export function RevokeButton({
  id,
  displayName,
}: {
  id: string
  displayName: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmRevoke() {
    // Async transition keeps the confirm button disabled while the server
    // writes, and the dialog closes only when the write actually applied —
    // an error (row already gone) stays visible inside the dialog.
    startTransition(async () => {
      const result = await revokeUser(id)
      if (result) {
        setError(result.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        เพิกถอนสิทธิ์
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันเพิกถอนสิทธิ์</DialogTitle>
            <DialogDescription>
              เพิกถอนสิทธิ์ของ &quot;{displayName}&quot;
              ผู้ใช้จะต้องขอสิทธิ์ใหม่ผ่าน LINE ก่อนจึงจะใช้งานระบบได้อีกครั้ง
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
            <Button variant="destructive" disabled={pending} onClick={confirmRevoke}>
              {pending ? 'กำลังเพิกถอน...' : 'เพิกถอนสิทธิ์'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
