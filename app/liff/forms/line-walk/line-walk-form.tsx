'use client'

import { useState } from 'react'

import { ChevronLeftIcon } from 'lucide-react'

import { FormPage } from '@/components/layout/form-page'
import { Button, ButtonLink } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { todayBangkok } from '@/lib/order-images/validation'

import { FormNavbar } from '../../form-navbar'

// The line-walk form shell. The fields and their state are real; the save path
// does not exist yet, so the submit stays disabled and the note below it says
// so. When the API lands, only the submit handler and the button's disabled
// prop change.
export function LineWalkForm({ lines }: { lines: string[] }) {
  const [walkDate, setWalkDate] = useState(todayBangkok)
  const [line, setLine] = useState<string | null>(null)
  const [brand, setBrand] = useState('')
  const [packStyle, setPackStyle] = useState('')

  return (
    <FormPage
      width="full"
      header={
        <FormNavbar
          width="full"
          title="บันทึกจำนวนการเดินไลน์"
          action={
            <ButtonLink
              variant="ghost"
              size="icon"
              aria-label="กลับไปหน้าแบบฟอร์ม"
              href="/liff/forms">
              <ChevronLeftIcon />
            </ButtonLink>
          }
        />
      }>
      <form
        onSubmit={(event) => event.preventDefault()}
        className="mx-auto flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="walk-date">วันที่</label>
          <DatePicker
            id="walk-date"
            label="วันที่"
            value={walkDate}
            onChange={setWalkDate}
          />
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          ไลน์ผลิต
          <Select value={line} onValueChange={setLine}>
            <SelectTrigger className="w-full" aria-label="ไลน์ผลิต">
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

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="walk-brand">ชื่อแบรนด์</label>
          <Input
            id="walk-brand"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="walk-pack-style">Pack style</label>
          <Input
            id="walk-pack-style"
            value={packStyle}
            onChange={(event) => setPackStyle(event.target.value)}
            autoComplete="off"
          />
        </div>

        <Button type="submit" disabled>
          บันทึก
        </Button>
        <p className="text-xs text-muted-foreground">
          ฟอร์มนี้อยู่ระหว่างพัฒนา ยังไม่บันทึกข้อมูล
        </p>
      </form>
    </FormPage>
  )
}
