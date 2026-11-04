'use client'

import { useState } from 'react'

import { OrderNumberInput } from '@/components/order-number-input'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { todayBangkok } from '@/lib/order-images/validation'

import type { LookupInput } from './order-image-api'

// Step 1: the three facts that identify the order the photos belong to.
// This file owns only field state and the submit call — validation runs in
// the orchestrator with the same helpers the server uses, so both agree on
// every rejection message. Items are created later, in step 2. The form's
// name sits in the navbar above (see order-image-form.tsx).
export function StepOneFields({
  lines,
  submitting,
  error,
  onSubmit,
}: {
  lines: string[]
  submitting: boolean
  error: string | null
  onSubmit: (input: LookupInput) => void
}) {
  const [orderNumber, setOrderNumber] = useState('')
  // Default to today in Bangkok: the overwhelmingly common case, and the
  // string format the API expects needs no conversion anywhere.
  const [orderDate, setOrderDate] = useState(todayBangkok)
  const [line, setLine] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      orderNumber,
      orderDate,
      line: line ?? '',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="order-number">เลขออเดอร์</label>
        <OrderNumberInput
          id="order-number"
          label="เลขออเดอร์"
          value={orderNumber}
          onChange={setOrderNumber}
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="order-date">วันที่ออเดอร์</label>
        <DatePicker
          id="order-date"
          label="วันที่ออเดอร์"
          value={orderDate}
          onChange={setOrderDate}
          disabled={submitting}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        ไลน์ผลิต
        <Select value={line} onValueChange={setLine} disabled={submitting}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="เลือกไลน์ผลิต" />
          </SelectTrigger>
          <SelectContent>
            {lines.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'กำลังค้นหา...' : 'ถัดไป'}
      </Button>
    </form>
  )
}
