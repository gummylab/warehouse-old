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
import {
  orderListHref,
  type OrderListFilters,
  type OrderPeriod,
} from '@/lib/order-images/filters'
import {
  isValidCalendarDate,
  todayBangkok,
} from '@/lib/order-images/validation'
import { cn } from '@/lib/utils'

// The filter bar writes its state into the URL and lets the server page read
// it. The period turns one anchor date into a day, month or year range.
//
// Base UI's Select.Value renders the raw value unless the Root receives
// `items`, so both selects pass their options in that shape: the trigger then
// shows the Thai label after a pick instead of "day" or "all".
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

export function OrderFilters({
  lines,
  filters,
}: {
  lines: string[]
  filters: OrderListFilters
}) {
  const router = useRouter()
  const mobile = useIsMobile()
  const [pending, startTransition] = useTransition()
  const [line, setLine] = useState(filters.line ?? 'all')
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

  // The clear action only makes sense once the view differs from the clean
  // default: today, by day, every line, no search.
  const isDefaultView =
    filters.period === 'day' &&
    filters.date === todayBangkok() &&
    filters.line === null &&
    filters.query === null

  const currentYear = Number(todayBangkok().slice(0, 4))
  const years = Array.from(
    new Set([
      ...Array.from({ length: 30 }, (_, index) => currentYear - index),
      Number(year),
    ]),
  ).sort((a, b) => b - a)

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

    const next: OrderListFilters = {
      ...filters,
      period,
      date: isValidCalendarDate(anchor) ? anchor : filters.date,
      page: 1,
      line: line === 'all' ? null : line,
      query: query || null,
    }
    startTransition(() => router.push(orderListHref(next, 1)))
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

  function changeYear(value: string | null) {
    if (!value) return
    setYear(value)
    setDate(`${value}-01-01`)
  }

  return (
    <form
      aria-label="ตัวกรองออเดอร์"
      onSubmit={handleSubmit}
      className="flex shrink-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground md:flex-row md:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        ค้นหาเลขออเดอร์
        <Input
          type="search"
          name="q"
          defaultValue={filters.query ?? ''}
          placeholder="เช่น 12345"
          autoComplete="off"
          disabled={pending}
        />
      </label>

      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        {period === 'day' ? 'วันที่' : period === 'month' ? 'เดือน' : 'ปี'}
        {period === 'day' ? (
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || filters.date)}
            disabled={pending}
          />
        ) : period === 'month' ? (
          <Input
            type="month"
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
            disabled={pending}
          />
        ) : (
          <Select value={year} onValueChange={changeYear} disabled={pending}>
            <SelectTrigger className="w-full" aria-label="ปี">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </label>

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

      <div className="flex shrink-0 flex-col gap-1.5 text-sm">
        <span>ช่วงเวลา</span>
        <ToggleGroup
          aria-label="ช่วงเวลา"
          value={[period]}
          onValueChange={(value) => changePeriod(value[0] ?? null)}
          variant="outline"
          spacing={0}
          size="default"
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

      <div className={cn('flex items-center gap-2', mobile ? 'w-full' : 'shrink-0')}>
        <Button
          type="submit"
          disabled={pending}
          className={cn(mobile && 'flex-1')}>
          <SearchIcon />
          {pending ? 'กำลังค้นหา...' : 'ค้นหา'}
        </Button>
        {!isDefaultView ? (
          <ButtonLink
            href="/order-images"
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
