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

export type LineWalkMetric = 'people' | 'amount'

// Both metrics share the same grey line colour; the switch changes the series,
// not the palette. `--chart-2` is the readable mid grey in the luma theme.
const chartConfig = {
  people: { label: 'จำนวนคน', color: 'var(--chart-2)' },
  amount: { label: 'ยอดสินค้า', color: 'var(--chart-2)' },
} satisfies ChartConfig

const GRAIN_LABEL: Record<TrendGrain, string> = {
  day: 'รายวัน',
  month: 'รายวัน',
  year: 'รายเดือน',
}

const METRIC_LABEL: Record<LineWalkMetric, string> = {
  people: 'จำนวนคน',
  amount: 'ยอดสินค้า',
}

// The chart body of the overview card. The metric switch lives in the card
// header, so this component only draws the selected series.
export function LineWalkTrend({
  grain,
  points,
  metric,
  period,
}: {
  grain: TrendGrain
  points: LineWalkPoint[]
  metric: LineWalkMetric
  period: string
}) {
  const empty = points.every((point) => point[metric] === 0)

  return (
    <div className="relative border-t px-2 pb-4 pt-3 sm:px-4">
      <ChartContainer
        config={chartConfig}
        className="h-[180px] w-full"
        role="img"
        aria-label={`กราฟ${METRIC_LABEL[metric]}${GRAIN_LABEL[grain]} ${period}`}>
        <AreaChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            {(['people', 'amount'] as const).map((key) => (
              <linearGradient
                key={key}
                id={`fill-line-walk-${key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <stop
                  offset="5%"
                  stopColor={`var(--color-${key})`}
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${key})`}
                  stopOpacity={0.05}
                />
              </linearGradient>
            ))}
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
            dataKey={metric}
            type="natural"
            fill={`url(#fill-line-walk-${metric})`}
            stroke={`var(--color-${metric})`}
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
