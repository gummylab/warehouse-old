'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Trimmed shadcn chart primitive: the container, the config-to-CSS-variable
// bridge and the tooltip. The app has one single-series chart, so the legend
// and the multi-series tooltip formatter are left out until something needs
// them (YAGNI).
//
// `ChartContainer` wraps `ResponsiveContainer`, so every chart fills the card
// and resizes with it. The caller owns the height.
export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    // A CSS colour, usually `var(--chart-N)` from globals.css. It becomes
    // `--color-<key>`, which the series and the tooltip then read.
    color?: string
  }
}

const ChartContext = React.createContext<ChartConfig | null>(null)

function useChartConfig(): ChartConfig {
  const config = React.useContext(ChartContext)
  if (!config) {
    throw new Error('ChartContainer must wrap every chart component')
  }
  return config
}

function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ReactElement
}) {
  // The variables are set on the container instead of an injected <style>
  // block: the values come from our own config, and this keeps the component
  // free of dangerouslySetInnerHTML.
  const colors = Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => item.color)
      .map(([key, item]) => [`--color-${key}`, item.color]),
  ) as React.CSSProperties

  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        className={cn(
          'flex aspect-video justify-center text-xs',
          // Recharts draws with its own default strokes; these rules keep the
          // grid, axis text and cursor inside the app's tokens.
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
          '[&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
          '[&_.recharts-layer]:outline-hidden',
          '[&_.recharts-surface]:outline-hidden',
          className,
        )}
        style={{ ...colors, ...style }}
        {...props}>
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

// The shape recharts hands to a custom tooltip. Kept local so the component
// does not depend on recharts' generic payload types.
type TooltipItem = {
  dataKey?: string | number
  value?: number | string
  color?: string
}

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  className,
}: {
  active?: boolean
  payload?: TooltipItem[]
  label?: React.ReactNode
  labelFormatter?: (value: React.ReactNode) => React.ReactNode
  className?: string
}) {
  const config = useChartConfig()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        'grid min-w-32 gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl',
        className,
      )}>
      {label != null ? (
        <p className="font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? index)
        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              {config[key]?.label ?? key}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {typeof item.value === 'number'
                ? item.value.toLocaleString('th-TH')
                : item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
