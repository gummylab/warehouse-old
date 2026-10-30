'use client'

import { useActionState, useState } from 'react'

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

import { revokeUser, type DecideActionState } from './actions'
import { useRegisterDecision } from './register-decision-context'

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
  const { removeUser, reportError } = useRegisterDecision()

  // The row leaves the table on the click: useOptimistic only accepts
  // updates made inside a transition or an action, and useActionState's
  // action is one. The server's revalidated payload replaces the row
  // afterwards, and puts it back if the write was refused.
  const [, formAction, pending] = useActionState(
    async (previous: DecideActionState): Promise<DecideActionState> => {
      removeUser(id)
      const result = await revokeUser(id)
      // A refusal is reported above the table, not next to the button:
      // the button unmounts together with the row it removed.
      if (result) reportError(result.error)
      return result
    },
    null,
  )

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
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
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
            <form action={formAction}>
              <Button variant="destructive" type="submit" disabled={pending}>
                เพิกถอนสิทธิ์
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
