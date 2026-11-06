'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { LineWalkPoint, TrendGrain } from '@/lib/db/types'
import { formatTrendLabel, formatTrendTick } from '@/lib/trend'

// Two series with very different scales, so each gets its own Y axis: amount
// on the left, people on the right. A shared axis would flatten the people
// line against zero.
const chartConfig = {
  amount: { label: 'ยอดสินค้า', color: 'var(--chart-2)' },
  people: { label: 'จำนวนคน', color: 'var(--info)' },
} satisfies ChartConfig

const SERIES = [
  { key: 'amount', label: 'ยอดสินค้า', color: 'var(--chart-2)' },
  { key: 'people', label: 'จำนวนคน', color: 'var(--info)' },
] as const

const GRAIN_LABEL: Record<TrendGrain, string> = {
  day: 'รายวัน',
  month: 'รายวัน',
  year: 'รายเดือน',
}

// The chart body of the overview card. The grain switch lives in the card
// header; this component draws both metrics for the selected window.
export function LineWalkTrend({
  grain,
  points,
  period,
}: {
  grain: TrendGrain
  points: LineWalkPoint[]
  period: string
}) {
  const empty = points.every(
    (point) => point.people === 0 && point.amount === 0,
  )

  return (
    <div className="relative border-t px-2 pb-4 pt-3 sm:px-4">
      <div
        data-slot="line-walk-chart-legend"
        className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-[2px]"
              style={{ backgroundColor: series.color }}
            />
            {series.label}
          </span>
        ))}
      </div>

      <ChartContainer
        config={chartConfig}
        className="h-[180px] w-full"
        role="img"
        aria-label={`กราฟจำนวนคนและยอดสินค้า${GRAIN_LABEL[grain]} ${period}`}>
        <AreaChart data={points} margin={{ left: 0, right: 0, top: 8 }}>
          <defs>
            <linearGradient
              id="fill-line-walk-amount"
              x1="0"
              y1="0"
              x2="0"
              y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-amount)"
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor="var(--color-amount)"
                stopOpacity={0.04}
              />
            </linearGradient>
            <linearGradient
              id="fill-line-walk-people"
              x1="0"
              y1="0"
              x2="0"
              y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-people)"
                stopOpacity={0.25}
              />
              <stop
                offset="95%"
                stopColor="var(--color-people)"
                stopOpacity={0.02}
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
            yAxisId="amount"
            orientation="left"
            width={36}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            allowDecimals={false}
            domain={[0, 'auto']}
          />
          <YAxis
            yAxisId="people"
            orientation="right"
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
            yAxisId="amount"
            dataKey="amount"
            type="monotone"
            fill="url(#fill-line-walk-amount)"
            stroke="var(--color-amount)"
            strokeWidth={2}
          />
          <Area
            yAxisId="people"
            dataKey="people"
            type="monotone"
            fill="url(#fill-line-walk-people)"
            stroke="var(--color-people)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>

      {empty ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted-foreground">
          ช่วงนี้ยังไม่มีข้อมูล
        </p>
      ) : null}
    </div>
  )
}
