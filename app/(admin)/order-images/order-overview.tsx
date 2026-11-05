'use client'

import { useState } from 'react'

import { PlusIcon } from 'lucide-react'

import { ButtonLink } from '@/components/ui/button'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import type { OrderOverview, TrendGrain } from '@/lib/db/types'
import { formatTrendRange } from '@/lib/order-images/trend'

import { OrderTrend } from './order-trend'
import { SummaryCards } from './summary-cards'

// "วัน / เดือน / ปี" collides with the table's period control, which picks one
// day, month or year. These labels state the window instead, so the two
// controls on the page cannot be confused for each other.
const RANGE_ITEMS: { value: TrendGrain; label: string }[] = [
  { value: 'day', label: '30 วัน' },
  { value: 'month', label: '12 เดือน' },
  { value: 'year', label: '5 ปี' },
]

// One switch drives the KPI strip and the trend chart: they read the same
// window, so the numbers above and the shape below always tell one story. The
// three windows arrive precomputed from the server, which makes the switch
// instant and keeps it out of the URL.
export function OrderOverview({ overview }: { overview: OrderOverview }) {
  const [grain, setGrain] = useState<TrendGrain>('day')
  const range = overview[grain]

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-muted-foreground">ภาพรวม</span>
          <ToggleGroup
            aria-label="ช่วงภาพรวม"
            value={[grain]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === 'day' || next === 'month' || next === 'year') {
                setGrain(next)
              }
            }}
            variant="outline"
            spacing={0}>
            {RANGE_ITEMS.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-xs text-muted-foreground">
            {formatTrendRange(grain, range.from, range.to)}
          </span>
        </div>
        <ButtonLink
          href="/liff/forms/order-image"
          target="_blank"
          rel="noreferrer"
          className="ml-auto">
          <PlusIcon />
          สร้างออเดอร์
        </ButtonLink>
      </div>

      <SummaryCards summary={range.summary} />
      <OrderTrend
        grain={grain}
        points={range.points}
        from={range.from}
        to={range.to}
      />
    </>
  )
}
