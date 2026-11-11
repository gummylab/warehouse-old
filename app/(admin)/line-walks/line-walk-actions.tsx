'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PencilIcon, Trash2Icon } from 'lucide-react'

import { deleteLineWalkAction } from './actions'

export function LineWalkActions({
  id,
  walkDate,
  shift,
  line,
  brand,
  packStyle,
}: {
  id: string
  walkDate: string
  shift: 'day' | 'night'
  line: string
  brand: string
  packStyle: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const editHref = `/liff/forms/line-walk?walkDate=${encodeURIComponent(walkDate)}&shift=${shift}&line=${encodeURIComponent(line)}&brand=${encodeURIComponent(brand)}&packStyle=${encodeURIComponent(packStyle)}`

  function handleDelete() {
    startTransition(async () => {
      await deleteLineWalkAction(id)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1">
      <ButtonLink
        href={editHref}
        target="_blank"
        rel="noreferrer"
        variant="ghost"
        size="icon-sm"
        aria-label="แก้ไข">
        <PencilIcon />
      </ButtonLink>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="ลบ"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}>
        <Trash2Icon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบบันทึกการเดินไลน์</DialogTitle>
            <DialogDescription>
              ลบรายการนี้ออกจากระบบ ไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              ยกเลิก
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? 'กำลังลบ…' : 'ลบ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
