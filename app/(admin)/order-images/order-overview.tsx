'use client'

import { useState } from 'react'

import { ChevronDownIcon, PlusIcon } from 'lucide-react'

import { Button, ButtonLink } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OrderOverview, TrendGrain } from '@/lib/db/types'
import { formatTrendPeriod } from '@/lib/order-images/trend'
import { cn } from '@/lib/utils'

import { OrderTrend } from './order-trend'
import { SummaryCards } from './summary-cards'

// Day is today's hours, month is this month's days, year is this year's
// months. The exact dates stay out of the card; the axis names the buckets,
// and the switch itself only picks the shape.
const RANGE_ITEMS: { value: TrendGrain; label: string }[] = [
  { value: 'day', label: 'วัน' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
]

// One card holds the KPI cells and the trend chart, and one switch drives
// both: they read the same window, so the numbers and the shape always tell
// one story. The three windows arrive precomputed from the server, which makes
// the switch instant and keeps it out of the URL.
//
// The chart starts collapsed: the numbers are the reason the card is on the
// page, and the table keeps their height until the operator asks for the
// trend.
export function OrderOverview({
  overview,
  today,
}: {
  overview: OrderOverview
  today: string
}) {
  const [grain, setGrain] = useState<TrendGrain>('day')
  const [open, setOpen] = useState(false)
  const range = overview[grain]

  return (
    <>
      <div className="flex shrink-0 justify-end">
        <ButtonLink
          href="/liff/forms/order-image"
          target="_blank"
          rel="noreferrer">
          <PlusIcon />
          สร้างออเดอร์
        </ButtonLink>
      </div>

      <section
        aria-label="ภาพรวมออเดอร์"
        className="shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <p className="text-sm font-medium">ภาพรวม</p>
            <Select
              items={RANGE_ITEMS}
              value={grain}
              onValueChange={(value: string | null) => {
                if (value === 'day' || value === 'month' || value === 'year') {
                  setGrain(value)
                }
              }}>
              <SelectTrigger className="w-28" aria-label="ช่วงภาพรวม">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label={open ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
                  title={open ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
                />
              }>
              <ChevronDownIcon
                className={cn('transition-transform', !open && '-rotate-90')}
              />
            </CollapsibleTrigger>
          </div>

          <SummaryCards summary={range.summary} />

          <CollapsibleContent>
            <OrderTrend
              grain={grain}
              points={range.points}
              period={formatTrendPeriod(grain, today)}
            />
          </CollapsibleContent>
        </Collapsible>
      </section>
    </>
  )
}
