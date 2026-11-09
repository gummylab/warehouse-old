'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  MoonIcon,
  SunIcon,
  Trash2Icon,
} from 'lucide-react'

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
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { useIsMobile } from '@/hooks/use-mobile'
import type {
  LineWalkInput,
  LineWalkRecord,
  LineWalkShift,
} from '@/lib/db/types'
import {
  lineWalkKey,
  parseWholeNumber,
} from '@/lib/line-walks/validation'
import { todayBangkok } from '@/lib/order-images/validation'
import { PAGE_TITLES } from '@/lib/page-titles'
import { cn } from '@/lib/utils'

import { useLiffSession } from '../../liff-session-context'
import { FormNavbar } from '../../form-navbar'
import {
  errorMessage,
  lookupLineWalk,
  saveLineWalks,
  setSessionToken,
} from './line-walk-api'

const SHIFT_ITEMS: {
  value: LineWalkShift
  label: string
  icon: React.ComponentType
}[] = [
  { value: 'day', label: 'กลางวัน', icon: SunIcon },
  { value: 'night', label: 'กลางคืน', icon: MoonIcon },
]

// One line-walk entry. The date lives on the entry, not on the form, because a
// single visit can log work from more than one day.
type Section = {
  id: string
  walkDate: string
  shift: LineWalkShift | null
  line: string | null
  brand: string
  packStyle: string
  people: string
  amount: string
}

type LookupStatus = 'idle' | 'loading' | 'found' | 'new' | 'error'

const KEY_FIELDS: (keyof Section)[] = [
  'walkDate',
  'shift',
  'line',
  'brand',
  'packStyle',
]

// Ids are generated from a counter instead of randomUUID so the server and the
// client render the same first section and hydration stays quiet.
function newSection(id: string): Section {
  return {
    id,
    walkDate: todayBangkok(),
    shift: null,
    line: null,
    brand: '',
    packStyle: '',
    people: '',
    amount: '',
  }
}

// The line-walk form. Each section is one record keyed by date, shift, line,
// brand and pack style; completing that key looks the record up, and saving
// upserts every section in one request.
export function LineWalkForm({ lines }: { lines: string[] }) {
  const { token } = useLiffSession()
  const mobile = useIsMobile()
  const nextId = useRef(2)

  const [sections, setSections] = useState<Section[]>([
    newSection('section-1'),
  ])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState<LineWalkRecord[] | null>(null)

  // The cookie exchange is shared with the order-image endpoints.
  useEffect(() => {
    setSessionToken(token)
  }, [token])

  const updateSection = useCallback((id: string, patch: Partial<Section>) => {
    const clearsCounts = KEY_FIELDS.some((field) => field in patch)
    setSections((current) =>
      current.map((section) =>
        section.id === id
          ? {
              ...section,
              ...patch,
              // A changed key is a different record, so counts entered for the
              // old one must not survive.
              ...(clearsCounts ? { people: '', amount: '' } : {}),
            }
          : section,
      ),
    )
  }, [])

  const prefillCounts = useCallback((id: string, people: number, amount: number) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id
          ? { ...section, people: String(people), amount: String(amount) }
          : section,
      ),
    )
  }, [])

  const clearCounts = useCallback((id: string) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, people: '', amount: '' } : section,
      ),
    )
  }, [])

  function addSection() {
    const id = `section-${nextId.current}`
    nextId.current += 1
    setSections((current) => [...current, newSection(id)])
  }

  function removeSection(id: string) {
    setSections((current) => current.filter((section) => section.id !== id))
  }

  // The route keeps its client state while it is hidden, so leaving the
  // success screen without clearing it would show the same screen the next
  // time the form is opened. Resetting here makes the exit a fresh start.
  function resetForm() {
    setSaved(null)
    setSaveError(null)
    nextId.current = 2
    setSections([newSection('section-1')])
  }

  // The first complete row owns a key; a later row with the same key is a
  // duplicate and never runs a lookup.
  const keys = sections.map((section) => lineWalkKey(section))
  const duplicateOf = (() => {
    const first = new Map<string, number>()
    return keys.map((key, index) => {
      if (!key) return -1
      const seen = first.get(key)
      if (seen !== undefined) return seen
      first.set(key, index)
      return -1
    })
  })()

  const canSave =
    sections.length > 0 &&
    sections.every(
      (section, index) =>
        keys[index] !== null &&
        duplicateOf[index] === -1 &&
        parseWholeNumber(section.people) !== null &&
        parseWholeNumber(section.amount) !== null,
    )

  async function handleSave() {
    if (!canSave || saving) return
    setSaveError(null)

    const entries: LineWalkInput[] = []
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index]
      const people = parseWholeNumber(section.people)
      const amount = parseWholeNumber(section.amount)

      if (!section.shift || !section.line || keys[index] === null) {
        setSaveError(`รายการที่ ${index + 1} ยังกรอกไม่ครบ`)
        return
      }
      if (duplicateOf[index] !== -1) {
        setSaveError(
          `รายการที่ ${index + 1} ซ้ำกับรายการที่ ${duplicateOf[index] + 1}`,
        )
        return
      }
      if (people === null || amount === null) {
        setSaveError(`รายการที่ ${index + 1} ยังกรอกจำนวนไม่ครบ`)
        return
      }

      entries.push({
        walkDate: section.walkDate,
        shift: section.shift,
        line: section.line,
        brand: section.brand.trim(),
        packStyle: section.packStyle.trim(),
        people,
        amount,
      })
    }

    setSaving(true)
    const result = await saveLineWalks(entries)
    setSaving(false)

    if (!result.ok) {
      setSaveError(errorMessage(result.error, result.status))
      return
    }
    setSaved(result.data.entries)
  }

  if (saved) {
    const totalPeople = saved.reduce((sum, entry) => sum + entry.people, 0)
    const totalAmount = saved.reduce((sum, entry) => sum + entry.amount, 0)

    return (
      <FormPage
        width="full"
        header={
          <FormNavbar
            width="full"
            title="บันทึกสำเร็จ"
            action={
              <ButtonLink
                variant="ghost"
                size="icon"
                aria-label="กลับไปหน้าแบบฟอร์ม"
                href="/liff/forms"
                onClick={resetForm}>
                <ChevronLeftIcon />
              </ButtonLink>
            }
          />
        }>
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2Icon className="size-12 text-success" />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-medium">
              บันทึกแล้ว {saved.length} รายการ
            </p>
            <p className="text-sm text-muted-foreground">
              จำนวนคน {totalPeople.toLocaleString('th-TH')} • ยอดสินค้า{' '}
              {totalAmount.toLocaleString('th-TH')}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button type="button" onClick={() => setSaved(null)}>
              ตรวจสอบ
            </Button>
            <ButtonLink
              href="/liff/forms"
              variant="outline"
              onClick={resetForm}>
              กลับไปหน้าหลัก
            </ButtonLink>
          </div>
        </div>
      </FormPage>
    )
  }

  return (
    <FormPage
      width="full"
      header={
        <FormNavbar
          width="full"
          title={PAGE_TITLES['/liff/forms/line-walk']}
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
        {sections.map((section, index) => (
          <LineWalkSectionCard
            key={section.id}
            section={section}
            index={index}
            lines={lines}
            mobile={mobile}
            duplicateOf={duplicateOf[index]}
            canRemove={sections.length > 1}
            onUpdate={updateSection}
            onRemove={removeSection}
            onPrefill={prefillCounts}
            onClearCounts={clearCounts}
          />
        ))}

        {/* The dashed add card closes the list, the same shape as the add
            cells in the order-image form. */}
        <TileButton
          type="button"
          label="เพิ่มรายการ"
          hint="เพิ่มอีกหนึ่งรายการเดินไลน์"
          onClick={addSection}
          className="w-full"
        />

        {saveError ? (
          <p className="text-sm text-destructive">{saveError}</p>
        ) : null}

        <Button type="button" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'กำลังบันทึก…' : 'บันทึกทั้งหมด'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {canSave
            ? 'ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก'
            : 'กรอกให้ครบทุกช่องเพื่อบันทึก'}
        </p>
      </form>
    </FormPage>
  )
}

function LineWalkSectionCard({
  section,
  index,
  lines,
  mobile,
  duplicateOf,
  canRemove,
  onUpdate,
  onRemove,
  onPrefill,
  onClearCounts,
}: {
  section: Section
  index: number
  lines: string[]
  mobile: boolean
  duplicateOf: number
  canRemove: boolean
  onUpdate: (id: string, patch: Partial<Section>) => void
  onRemove: (id: string) => void
  onPrefill: (id: string, people: number, amount: number) => void
  onClearCounts: (id: string) => void
}) {
  const position = index + 1
  const key = lineWalkKey(section)
  const duplicate = duplicateOf !== -1

  const [lookup, setLookup] = useState<{
    key: string | null
    status: LookupStatus
  }>({ key: null, status: 'idle' })
  const sectionRef = useRef(section)

  // The lookup reads the latest section when its debounce fires. Updating the
  // ref in an effect (not during render) keeps the compiler and the refs lint
  // rule happy; this effect is declared before the lookup one so the timer
  // always sees the values that produced the current key.
  useEffect(() => {
    sectionRef.current = section
  }, [section])

  // The lookup is debounced so typing the free-text brand and pack style does
  // not fire a request per keystroke. A finished response is ignored when the
  // key has moved on, and duplicates never reach the network at all.
  useEffect(() => {
    if (!key || duplicate) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const current = sectionRef.current
      if (lineWalkKey(current) !== key) return

      setLookup({ key, status: 'loading' })
      const result = await lookupLineWalk(
        {
          walkDate: current.walkDate,
          shift: current.shift!,
          line: current.line!,
          brand: current.brand,
          packStyle: current.packStyle,
        },
        controller.signal,
      )
      if (controller.signal.aborted) return

      if (!result.ok) {
        setLookup({ key, status: 'error' })
        return
      }
      if (result.data.entry) {
        onPrefill(
          current.id,
          result.data.entry.people,
          result.data.entry.amount,
        )
        setLookup({ key, status: 'found' })
      } else {
        onClearCounts(current.id)
        setLookup({ key, status: 'new' })
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, duplicate, onPrefill, onClearCounts])

  const status: LookupStatus | 'duplicate' = duplicate
    ? 'duplicate'
    : key
      ? lookup.key === key
        ? lookup.status
        : 'loading'
      : 'idle'

  const statusText =
    status === 'duplicate'
      ? `รายการซ้ำกับรายการที่ ${duplicateOf + 1}`
      : status === 'loading'
        ? 'กำลังตรวจข้อมูลเดิม…'
        : status === 'found'
          ? 'มีข้อมูลเดิม'
          : status === 'new'
            ? 'ยังไม่มีข้อมูล'
            : status === 'error'
              ? 'ตรวจข้อมูลเดิมไม่สำเร็จ กรอกเองได้'
              : null

  return (
    <section
      aria-label={`รายการที่ ${position}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">รายการที่ {position}</p>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`ลบรายการที่ ${position}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemove(section.id)}>
            <Trash2Icon />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={`walk-date-${section.id}`}>วันที่</label>
        <DatePicker
          id={`walk-date-${section.id}`}
          label={`วันที่ รายการที่ ${position}`}
          value={section.walkDate}
          onChange={(value) => onUpdate(section.id, { walkDate: value })}
        />
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span>
          กะ <span className="text-destructive">*</span>
        </span>
        <ToggleGroup
          aria-label={`กะ รายการที่ ${position}`}
          value={section.shift ? [section.shift] : []}
          onValueChange={(value) => {
            const next = value[0]
            onUpdate(section.id, {
              shift: next === 'day' || next === 'night' ? next : null,
            })
          }}
          variant="outline"
          spacing={0}
          className={cn('w-fit', mobile && 'w-full')}>
          {SHIFT_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                className={cn(
                  mobile && 'flex-1',
                  // The outline variant only dims the pressed state; day and
                  // night get their own colour so the chosen shift reads.
                  item.value === 'day' &&
                    'aria-pressed:bg-warning! aria-pressed:text-warning-foreground!',
                  item.value === 'night' &&
                    'aria-pressed:bg-info! aria-pressed:text-info-foreground!',
                )}>
                <Icon />
                {item.label}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span>
          ไลน์ผลิต <span className="text-destructive">*</span>
        </span>
        <Select
          value={section.line}
          onValueChange={(value) => onUpdate(section.id, { line: value })}>
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
          type="text"
          value={section.brand}
          onChange={(event) =>
            onUpdate(section.id, { brand: event.target.value })
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
          type="text"
          value={section.packStyle}
          onChange={(event) =>
            onUpdate(section.id, { packStyle: event.target.value })
          }
          autoComplete="off"
        />
      </div>

      {key ? (
        <div className="flex flex-col gap-2 border-t pt-3">
          {statusText ? (
            <p
              className={cn(
                'text-xs',
                status === 'duplicate' || status === 'error'
                  ? 'text-destructive'
                  : status === 'found'
                    ? 'text-success'
                    : 'text-muted-foreground',
              )}>
              {statusText}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 text-sm">
              <label htmlFor={`walk-people-${section.id}`}>
                จำนวนคน <span className="text-destructive">*</span>
              </label>
              <Input
                id={`walk-people-${section.id}`}
                inputMode="numeric"
                value={section.people}
                disabled={status === 'loading' || status === 'duplicate'}
                onChange={(event) =>
                  onUpdate(section.id, {
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
                disabled={status === 'loading' || status === 'duplicate'}
                onChange={(event) =>
                  onUpdate(section.id, {
                    amount: event.target.value.replace(/\D/g, ''),
                  })
                }
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
