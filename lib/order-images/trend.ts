// The calendar windows the KPI strip and the trend chart share. Both read the
// same window, so the number above the chart and the chart itself cannot
// disagree.
//
// The day window is an entry-time window: `order_date` carries no time, so an
// hourly breakdown can only come from `created_at`. The month and year windows
// stay on `order_date`, the business date the table and the filters use.
//
// Every function here is pure: the data layer supplies the counts, and the UI
// supplies the anchor day.

import type { TrendGrain, TrendPoint } from '@/lib/db/types'

import { formatThaiMonthYear, formatThaiYear, thaiMonthName } from './date'
import { formatThaiDate } from './format'

export const TREND_GRAINS = ['day', 'month', 'year'] as const

const HOURS = 24
const MONTHS = 12
const DAY_MS = 24 * 60 * 60 * 1000

// `created` filters a timestamp column with an exclusive `to`. `order` filters
// the stored calendar date with an inclusive `to`.
export type TrendWindow = {
  kind: 'created' | 'order'
  from: string
  to: string
  buckets: string[]
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

// Bangkok midnight to the next midnight, expressed as UTC instants so they can
// be compared with the stored `created_at` text (also UTC ISO).
function bangkokDayRange(today: string): { from: string; to: string } {
  const from = new Date(`${today}T00:00:00+07:00`)
  const to = new Date(from.getTime() + DAY_MS)
  return { from: from.toISOString(), to: to.toISOString() }
}

// Three calendar windows anchored on today:
// day = the 24 hours of today, month = every day of this month, year = every
// month of this year. Future buckets stay in the list and render as zero, so
// the axis does not move during the day.
export function trendWindow(grain: TrendGrain, today: string): TrendWindow {
  const [year, month] = today.split('-').map(Number)

  if (grain === 'day') {
    const { from, to } = bangkokDayRange(today)
    const buckets = Array.from(
      { length: HOURS },
      (_, hour) => `${today}T${pad2(hour)}`,
    )
    return { kind: 'created', from, to, buckets }
  }

  if (grain === 'month') {
    // Date.UTC with day 0 gives the last day of the month, leap year included.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const buckets = Array.from(
      { length: lastDay },
      (_, index) => `${today.slice(0, 8)}${pad2(index + 1)}`,
    )
    return {
      kind: 'order',
      from: `${today.slice(0, 8)}01`,
      to: today,
      buckets,
    }
  }

  const buckets = Array.from(
    { length: MONTHS },
    (_, index) => `${year}-${pad2(index + 1)}`,
  )
  return { kind: 'order', from: `${year}-01-01`, to: today, buckets }
}

// SQL only returns buckets that have orders. The chart needs every bucket in
// the window, in order, so a gap is a zero and the x axis stays continuous.
export function fillTrend(
  buckets: string[],
  rows: TrendPoint[],
): TrendPoint[] {
  const counts = new Map(rows.map((row) => [row.bucket, row.count]))
  return buckets.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }))
}

// The x axis label: the hour for a day, the day and month for a month, the
// month name for a year.
export function formatTrendTick(grain: TrendGrain, bucket: string): string {
  if (grain === 'day') return `${bucket.slice(11, 13)}:00`
  if (grain === 'month') {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
    }).format(utcDate(bucket))
  }
  return thaiMonthName(Number(bucket.slice(5, 7)) - 1)
}

// The tooltip title: the full date and hour, the full date, or the month and
// Buddhist year.
export function formatTrendLabel(grain: TrendGrain, bucket: string): string {
  if (grain === 'day') {
    return `${formatThaiDate(bucket.slice(0, 10))} ${bucket.slice(11, 13)}:00`
  }
  if (grain === 'month') return formatThaiDate(bucket)
  return formatThaiMonthYear(bucket)
}

// The period the card is showing, used by the chart's accessible name:
// "5 พ.ย. 2569", "พ.ย. 2569" or "2569".
export function formatTrendPeriod(grain: TrendGrain, today: string): string {
  if (grain === 'day') return formatThaiDate(today)
  if (grain === 'month') return formatThaiMonthYear(today.slice(0, 7))
  return formatThaiYear(Number(today.slice(0, 4)))
}
