'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// Deleting an order removes every item and every photo, so a single click is
// not enough. The operator types the order number; the server action checks
// it again.
export function DeleteOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  itemCount,
  imageCount,
  pending,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  itemCount: number
  imageCount: number
  pending: boolean
  error: string | null
  onConfirm: (confirmation: string) => void
}) {
  const [confirmation, setConfirmation] = useState('')
  const matches = confirmation.trim() === orderNumber

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmation('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยืนยันการลบออเดอร์</DialogTitle>
          <DialogDescription>
            ลบออเดอร์ {orderNumber} พร้อมไอเท็ม {itemCount} รายการ และรูป{' '}
            {imageCount} รูป ออกถาวร ไม่สามารถกู้คืนได้
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-1.5 text-sm">
          พิมพ์เลขออเดอร์เพื่อยืนยัน
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={orderNumber}
            autoComplete="off"
            autoFocus
            disabled={pending}
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(confirmation)}
            disabled={!matches || pending}>
            {pending ? 'กำลังลบ...' : 'ลบออเดอร์'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
