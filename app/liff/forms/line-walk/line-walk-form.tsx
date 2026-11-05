'use client'

import { useRef, useState } from 'react'

import { ChevronLeftIcon, Trash2Icon } from 'lucide-react'

import { FormPage } from '@/components/layout/form-page'
import { TileButton } from '@/components/layout/tile-grid'
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

// One line-walk entry. The date lives on the entry, not on the form, because a
// single visit can log work from more than one day.
type LineWalkSection = {
  id: string
  walkDate: string
  line: string | null
  brand: string
  packStyle: string
  people: string
  amount: string
}

// Ids are generated from a counter instead of randomUUID so the server and the
// client render the same first section and hydration stays quiet.
function newSection(id: string): LineWalkSection {
  return {
    id,
    walkDate: todayBangkok(),
    line: null,
    brand: '',
    packStyle: '',
    people: '',
    amount: '',
  }
}

// The line-walk form shell. Sections and their state are real; the save path
// does not exist yet, so the submit stays disabled and the note below it says
// so. When the API lands, only the submit handler and the button's disabled
// prop change.
export function LineWalkForm({ lines }: { lines: string[] }) {
  const nextId = useRef(2)
  const [sections, setSections] = useState<LineWalkSection[]>([
    newSection('section-1'),
  ])

  function addSection() {
    const id = `section-${nextId.current}`
    nextId.current += 1
    setSections((current) => [...current, newSection(id)])
  }

  function removeSection(id: string) {
    setSections((current) => current.filter((section) => section.id !== id))
  }

  function updateSection(id: string, patch: Partial<LineWalkSection>) {
    setSections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    )
  }

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
        {sections.map((section, index) => {
          const position = index + 1
          // The count fields only make sense once the row names a real
          // (date, line, brand, pack style) record, which is also the key the
          // future lookup and save will use.
          const complete =
            section.line !== null &&
            section.brand.trim() !== '' &&
            section.packStyle.trim() !== ''

          return (
            <section
              key={section.id}
              aria-label={`รายการที่ ${position}`}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">รายการที่ {position}</p>
                {sections.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`ลบรายการที่ ${position}`}
                    onClick={() => removeSection(section.id)}>
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                <label htmlFor={`walk-date-${section.id}`}>
                  วันที่ รายการที่ {position}
                </label>
                <DatePicker
                  id={`walk-date-${section.id}`}
                  label={`วันที่ รายการที่ ${position}`}
                  value={section.walkDate}
                  onChange={(value) =>
                    updateSection(section.id, { walkDate: value })
                  }
                />
              </div>

              <label className="flex flex-col gap-1.5 text-sm">
                <span>
                  ไลน์ผลิต <span className="text-destructive">*</span>
                </span>
                <Select
                  value={section.line}
                  onValueChange={(value) =>
                    updateSection(section.id, { line: value })
                  }>
                  <SelectTrigger
                    className="w-full"
                    aria-label={`ไลน์ผลิต รายการที่ ${position}`}>
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
                <label htmlFor={`walk-brand-${section.id}`}>
                  ชื่อแบรนด์ <span className="text-destructive">*</span>
                </label>
                <Input
                  id={`walk-brand-${section.id}`}
                  value={section.brand}
                  onChange={(event) =>
                    updateSection(section.id, { brand: event.target.value })
                  }
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                <label htmlFor={`walk-pack-${section.id}`}>
                  Pack style <span className="text-destructive">*</span>
                </label>
                <Input
                  id={`walk-pack-${section.id}`}
                  value={section.packStyle}
                  onChange={(event) =>
                    updateSection(section.id, {
                      packStyle: event.target.value,
                    })
                  }
                  autoComplete="off"
                />
              </div>

              {complete ? (
                <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 text-sm">
                    <label htmlFor={`walk-people-${section.id}`}>
                      จำนวนคน <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id={`walk-people-${section.id}`}
                      inputMode="numeric"
                      value={section.people}
                      onChange={(event) =>
                        updateSection(section.id, {
                          people: event.target.value.replace(/\D/g, ''),
                        })
                      }
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 text-sm">
                    <label htmlFor={`walk-amount-${section.id}`}>
                      ยอดสินค้า <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id={`walk-amount-${section.id}`}
                      inputMode="numeric"
                      value={section.amount}
                      onChange={(event) =>
                        updateSection(section.id, {
                          amount: event.target.value.replace(/\D/g, ''),
                        })
                      }
                      autoComplete="off"
                    />
                  </div>
                </div>
              ) : null}
            </section>
          )
        })}

        {/* The dashed add card closes the list, the same shape as the add
            cells in the order-image form. */}
        <TileButton
          type="button"
          label="เพิ่มรายการ"
          hint="เพิ่มอีกหนึ่งรายการเดินไลน์"
          onClick={addSection}
          className="w-full"
        />

        <Button type="submit" disabled>
          บันทึกทั้งหมด
        </Button>
        <p className="text-xs text-muted-foreground">
          ฟอร์มนี้อยู่ระหว่างพัฒนา ยังไม่บันทึกข้อมูล
        </p>
      </form>
    </FormPage>
  )
}
