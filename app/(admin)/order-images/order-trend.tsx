'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { TrendGrain, TrendPoint } from '@/lib/db/types'
import {
  formatTrendLabel,
  formatTrendTick,
} from '@/lib/order-images/trend'

// One series, so the config carries a single entry. `--chart-2` is the mid
// grey in the luma palette; `--chart-1` is too light to read as a line on the
// card background.
const chartConfig = {
  count: {
    label: 'ออเดอร์',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const GRAIN_LABEL: Record<TrendGrain, string> = {
  day: 'รายวัน',
  month: 'รายวัน',
  year: 'รายเดือน',
}

// The chart body of the overview card, under the KPI cells. It owns no header,
// no card and no switch: the card header above carries the window control and
// the collapse button, so the two halves of the overview cannot drift apart.
export function OrderTrend({
  grain,
  points,
  period,
}: {
  grain: TrendGrain
  points: TrendPoint[]
  // The formatted period, used as the chart's accessible name.
  period: string
}) {
  const empty = points.every((point) => point.count === 0)

  return (
    <div className="relative border-t px-2 pb-4 pt-3 sm:px-4">
      <ChartContainer
        config={chartConfig}
        className="h-[180px] w-full"
        role="img"
        aria-label={`กราฟออเดอร์${GRAIN_LABEL[grain]} ${period}`}>
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

      {/* A flat zero line is honest but silent. The caption says the window is
          empty rather than letting the user think it broke. */}
      {empty ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted-foreground">
          ช่วงนี้ยังไม่มีออเดอร์
        </p>
      ) : null}
    </div>
  )
}
