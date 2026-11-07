'use client'

import { useState } from 'react'

import { OrderNumberInput } from '@/components/order-number-input'
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
import { isValidOrderNumber } from '@/lib/order-images/validation'

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
  // Nine-digit orders use the same slot input as the LIFF form. A row that
  // predates the rule still gets a text field, so an old order remains
  // deletable without a migration.
  const useOtp = isValidOrderNumber(orderNumber)

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

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="delete-order-confirmation">
            พิมพ์เลขออเดอร์เพื่อยืนยัน
          </label>
          {useOtp ? (
            <OrderNumberInput
              id="delete-order-confirmation"
              label="พิมพ์เลขออเดอร์เพื่อยืนยัน"
              value={confirmation}
              onChange={setConfirmation}
              disabled={pending}
              invalid={Boolean(error)}
              autoFocus
            />
          ) : (
            <Input
              id="delete-order-confirmation"
              aria-label="พิมพ์เลขออเดอร์เพื่อยืนยัน"
              aria-invalid={Boolean(error) || undefined}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={orderNumber}
              autoComplete="off"
              autoFocus
              disabled={pending}
            />
          )}
        </div>

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
            {pending ? 'กำลังลบ…' : 'ลบออเดอร์'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
