'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  SearchIcon,
  SunIcon,
  XIcon,
} from 'lucide-react'

import { Button, ButtonLink } from '@/components/ui/button'
import {
  DatePicker,
  MonthPicker,
  YearPicker,
} from '@/components/ui/date-picker'
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
import type { LineWalkListFilters, OrderPeriod } from '@/lib/db/types'
import { lineWalkListHref } from '@/lib/line-walks/filters'
import {
  isValidCalendarDate,
  todayBangkok,
} from '@/lib/order-images/validation'
import { cn } from '@/lib/utils'

// The filter bar writes its state into the URL and lets the server page read
// it. The period turns one anchor date into a day, month or year range.
const PERIOD_ITEMS = [
  { value: 'day', label: 'รายวัน' },
  { value: 'month', label: 'รายเดือน' },
  { value: 'year', label: 'รายปี' },
] as const

const PERIOD_ICONS = {
  day: SunIcon,
  month: CalendarDaysIcon,
  year: CalendarRangeIcon,
} as const

const SHIFT_ITEMS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'day', label: 'กลางวัน' },
  { value: 'night', label: 'กลางคืน' },
]

export function LineWalkFilters({
  lines,
  filters,
}: {
  lines: string[]
  filters: LineWalkListFilters
}) {
  const router = useRouter()
  const mobile = useIsMobile()
  const [pending, startTransition] = useTransition()
  const [line, setLine] = useState(filters.line ?? 'all')
  const [shift, setShift] = useState(filters.shift ?? 'all')
  const [period, setPeriod] = useState<OrderPeriod>(filters.period)
  const [date, setDate] = useState(filters.date)
  const [month, setMonth] = useState(filters.date.slice(0, 7))
  const [year, setYear] = useState(filters.date.slice(0, 4))

  // "ทั้งหมด" is the null filter, so it needs its own entry ahead of the
  // catalog lines.
  const lineItems = [
    { value: 'all', label: 'ทั้งหมด' },
    ...lines.map((name) => ({ value: name, label: name })),
  ]

  const isDefaultView =
    filters.period === 'day' &&
    filters.date === todayBangkok() &&
    filters.line === null &&
    filters.shift === null &&
    filters.query === null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const query = text(form.get('q'))

    const anchor =
      period === 'day'
        ? date
        : period === 'month'
          ? `${month}-01`
          : `${year}-01-01`

    const next: LineWalkListFilters = {
      ...filters,
      period,
      date: isValidCalendarDate(anchor) ? anchor : filters.date,
      page: 1,
      line: line === 'all' ? null : line,
      shift: shift === 'day' || shift === 'night' ? shift : null,
      query: query || null,
    }
    startTransition(() => router.push(lineWalkListHref(next, 1)))
  }

  function changePeriod(value: string | null) {
    if (value !== 'day' && value !== 'month' && value !== 'year') return
    setPeriod(value)
    if (value === 'month') setMonth(date.slice(0, 7))
    if (value === 'year') setYear(date.slice(0, 4))
  }

  function changeMonth(value: string) {
    setMonth(value)
    if (/^\d{4}-\d{2}$/.test(value)) setDate(`${value}-01`)
  }

  function changeYear(value: string) {
    setYear(value)
    setDate(`${value}-01-01`)
  }

  return (
    <form
      aria-label="ตัวกรองบันทึกการเดินไลน์"
      onSubmit={handleSubmit}
      className="flex shrink-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground md:flex-row md:flex-wrap md:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        ค้นหาแบรนด์หรือ pack style
        <Input
          type="search"
          name="q"
          defaultValue={filters.query ?? ''}
          placeholder="เช่น แบรนด์"
          autoComplete="off"
          disabled={pending}
        />
      </label>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        <span>
          {period === 'day' ? 'วันที่' : period === 'month' ? 'เดือน' : 'ปี'}
        </span>
        {period === 'day' ? (
          <DatePicker
            label="วันที่"
            value={date}
            onChange={(next) => setDate(next || filters.date)}
            disabled={pending}
          />
        ) : period === 'month' ? (
          <MonthPicker
            label="เดือน"
            value={month}
            onChange={changeMonth}
            disabled={pending}
          />
        ) : (
          <YearPicker
            label="ปี"
            value={year}
            onChange={changeYear}
            disabled={pending}
          />
        )}
      </div>

      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        ไลน์ผลิต
        <Select
          items={lineItems}
          value={line}
          onValueChange={(value: string | null) => setLine(value ?? 'all')}
          disabled={pending}>
          <SelectTrigger className="w-full" aria-label="ไลน์ผลิต">
            <SelectValue placeholder="ทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            {lineItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex min-w-0 flex-col gap-1.5 text-sm md:w-36">
        กะ
        <Select
          items={SHIFT_ITEMS}
          value={shift}
          onValueChange={(value: string | null) => setShift(value ?? 'all')}
          disabled={pending}>
          <SelectTrigger className="w-full" aria-label="กะ">
            <SelectValue placeholder="ทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            {SHIFT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="flex shrink-0 flex-col gap-1.5 text-sm">
        <span>ช่วงเวลา</span>
        <ToggleGroup
          aria-label="ช่วงเวลา"
          value={[period]}
          onValueChange={(value) => changePeriod(value[0] ?? null)}
          variant="outline"
          spacing={0}
          disabled={pending}
          className={cn('w-fit', mobile && 'w-full')}>
          {PERIOD_ITEMS.map((item) => {
            const Icon = PERIOD_ICONS[item.value]
            return (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                aria-label={item.label}
                title={item.label}
                disabled={pending}
                className={cn('px-0', mobile && 'flex-1')}>
                <Icon />
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      <div
        className={cn(
          'flex items-center gap-2',
          mobile ? 'w-full' : 'shrink-0',
        )}>
        <Button
          type="submit"
          disabled={pending}
          className={cn(mobile && 'flex-1')}>
          <SearchIcon />
          {pending ? 'กำลังค้นหา…' : 'ค้นหา'}
        </Button>
        {!isDefaultView ? (
          <ButtonLink
            href="/line-walks"
            variant="ghost"
            size="icon"
            aria-label="ล้างตัวกรอง"
            title="ล้างตัวกรอง">
            <XIcon />
          </ButtonLink>
        ) : null}
      </div>
    </form>
  )
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}
