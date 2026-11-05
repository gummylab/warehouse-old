'use client'

import { useState } from 'react'

import { ChevronDownIcon } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { TrendGrain, TrendPoint } from '@/lib/db/types'
import {
  formatTrendLabel,
  formatTrendRange,
  formatTrendTick,
} from '@/lib/order-images/trend'
import { cn } from '@/lib/utils'

// One series, so the config carries a single entry. `--chart-2` is the mid
// grey in the luma palette; `--chart-1` is too light to read as a line on the
// card background.
const chartConfig = {
  count: {
    label: 'ออเดอร์',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const AGGREGATION: Record<TrendGrain, string> = {
  day: 'ออเดอร์ต่อวัน',
  month: 'ออเดอร์ต่อเดือน',
  year: 'ออเดอร์ต่อปี',
}

// The trend card sits between the KPI strip and the filter bar. It is
// collapsible so the table can have the height back on a short screen, and it
// never owns the day/month/year switch: the overview toggle above drives both
// this chart and the KPI numbers.
export function OrderTrend({
  grain,
  points,
  from,
  to,
}: {
  grain: TrendGrain
  points: TrendPoint[]
  from: string
  to: string
}) {
  const [open, setOpen] = useState(true)
  const empty = points.every((point) => point.count === 0)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="shrink-0 overflow-hidden rounded-xl border bg-card text-card-foreground">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">แนวโน้มออเดอร์</p>
          <p className="truncate text-xs text-muted-foreground">
            {AGGREGATION[grain]} · {formatTrendRange(grain, from, to)}
          </p>
        </div>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={open ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
              title={open ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
            />
          }>
          <ChevronDownIcon
            className={cn('transition-transform', !open && '-rotate-90')}
          />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="relative px-2 pb-4 sm:px-4">
          <ChartContainer
            config={chartConfig}
            className="h-[180px] w-full"
            role="img"
            aria-label={`กราฟออเดอร์ต่อ${grain === 'day' ? 'วัน' : grain === 'month' ? 'เดือน' : 'ปี'} ${formatTrendRange(grain, from, to)}`}>
            <AreaChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fill-order-count" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) => formatTrendTick(grain, String(value))}
              />
              <YAxis
                width={28}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                allowDecimals={false}
                domain={[0, 'auto']}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      formatTrendLabel(grain, String(value))
                    }
                  />
                }
              />
              <Area
                dataKey="count"
                type="natural"
                fill="url(#fill-order-count)"
                stroke="var(--color-count)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>

          {/* A flat zero line is honest but silent. The caption says the
              window is empty rather than letting the user think it broke. */}
          {empty ? (
            <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted-foreground">
              ช่วงนี้ยังไม่มีออเดอร์
            </p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
