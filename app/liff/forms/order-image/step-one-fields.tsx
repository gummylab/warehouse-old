'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 md:grid md:grid-cols-3 md:items-end">
      <label className="flex flex-col gap-1.5 text-sm">
        เลขออเดอร์
        <Input
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="เช่น 12345"
          autoComplete="off"
          disabled={submitting}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        วันที่ออเดอร์
        <Input
          type="date"
          value={orderDate}
          onChange={(event) => setOrderDate(event.target.value)}
          disabled={submitting}
        />
      </label>

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

      {error && (
        <p className="text-sm text-destructive md:col-span-3">{error}</p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="md:col-span-3 md:w-fit md:justify-self-start">
        {submitting ? 'กำลังค้นหา...' : 'ถัดไป'}
      </Button>
    </form>
  )
}
