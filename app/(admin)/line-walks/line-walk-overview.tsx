'use client'

import { useState } from 'react'

import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import type { LineWalkOverview, TrendGrain } from '@/lib/db/types'
import { formatTrendPeriod } from '@/lib/trend'
import { cn } from '@/lib/utils'

import { LineWalkSummaryCards } from './line-walk-summary'
import { LineWalkTrend, type LineWalkMetric } from './line-walk-trend'

const GRAIN_ITEMS: { value: TrendGrain; label: string }[] = [
  { value: 'day', label: 'วัน' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
]

const METRIC_ITEMS: { value: LineWalkMetric; label: string }[] = [
  { value: 'amount', label: 'ยอดสินค้า' },
  { value: 'people', label: 'จำนวนคน' },
]

// One card holds the KPI cells and the trend chart. The window and the metric
// are view state; the three windows arrive precomputed, so switching is
// instant. The card ignores the table filters by design.
export function LineWalkOverview({
  overview,
  today,
}: {
  overview: LineWalkOverview
  today: string
}) {
  const [grain, setGrain] = useState<TrendGrain>('day')
  const [metric, setMetric] = useState<LineWalkMetric>('amount')
  const [open, setOpen] = useState(false)
  const range = overview[grain]

  return (
    <section
      aria-label="ภาพรวมการเดินไลน์"
      className="shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <p className="text-sm font-medium">ภาพรวม</p>
          <Select
            items={GRAIN_ITEMS}
            value={grain}
            onValueChange={(value: string | null) => {
              if (value === 'day' || value === 'month' || value === 'year') {
                setGrain(value)
              }
            }}>
            <SelectTrigger className="w-24" aria-label="ช่วงภาพรวม">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRAIN_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            aria-label="ตัวชี้วัดกราฟ"
            value={[metric]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === 'amount' || next === 'people') setMetric(next)
            }}
            variant="outline"
            spacing={0}
            className="w-fit">
            {METRIC_ITEMS.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                className="aria-pressed:bg-primary! aria-pressed:text-primary-foreground!">
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

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

        <LineWalkSummaryCards summary={range.summary} />

        <CollapsibleContent>
          <LineWalkTrend
            grain={grain}
            points={range.points}
            metric={metric}
            period={formatTrendPeriod(grain, today)}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
