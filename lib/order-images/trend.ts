// The calendar windows the KPI strip and the trend chart share. Both read the
// same window, so the number above the chart and the chart itself cannot
// disagree.
//
// Every window counts the stored business date (`order_date`), the same date
// the table and its filters use. Nothing here reads `created_at`: the chips
// answer "how many orders belong to this period", not "when were they typed".
//
// Every function here is pure: the data layer supplies the counts, and the UI
// supplies the anchor day.

import type { TrendGrain, TrendPoint } from '@/lib/db/types'

import { formatThaiMonthYear, formatThaiYear, thaiMonthName } from './date'
import { formatThaiDate } from './format'

export const TREND_GRAINS = ['day', 'month', 'year'] as const

// "day" is a week of daily buckets: a single day has no trend to draw.
const DAYS = 7
const MONTHS = 12

export type TrendWindow = {
  from: string
  to: string
  buckets: string[]
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function addDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + delta))
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

// Three calendar windows anchored on today:
// day = the last seven days, one bucket per day; month = every day of this
// month; year = every month of this year. Future buckets stay in the list and
// render as zero, so the axis does not move during the period.
export function trendWindow(grain: TrendGrain, today: string): TrendWindow {
  if (grain === 'day') {
    const buckets = Array.from({ length: DAYS }, (_, index) =>
      addDays(today, index - (DAYS - 1)),
    )
    return { from: buckets[0], to: today, buckets }
  }

  const [year, month] = today.split('-').map(Number)

  if (grain === 'month') {
    // Date.UTC with day 0 gives the last day of the month, leap year included.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const buckets = Array.from(
      { length: lastDay },
      (_, index) => `${today.slice(0, 8)}${pad2(index + 1)}`,
    )
    return { from: `${today.slice(0, 8)}01`, to: today, buckets }
  }

  const buckets = Array.from(
    { length: MONTHS },
    (_, index) => `${year}-${pad2(index + 1)}`,
  )
  return { from: `${year}-01-01`, to: today, buckets }
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

// The x axis label: the day and month for the daily windows, the month name
// for the year window.
export function formatTrendTick(grain: TrendGrain, bucket: string): string {
  if (grain === 'year') {
    return thaiMonthName(Number(bucket.slice(5, 7)) - 1)
  }
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(utcDate(bucket))
}

// The tooltip title: the full date for a daily bucket, the month and Buddhist
// year for a month bucket.
export function formatTrendLabel(grain: TrendGrain, bucket: string): string {
  if (grain === 'year') return formatThaiMonthYear(bucket)
  return formatThaiDate(bucket)
}

// The period the card is showing, used by the chart's accessible name:
// "7 วันล่าสุดถึง 5 พ.ย. 2569", "พ.ย. 2569" or "2569".
export function formatTrendPeriod(grain: TrendGrain, today: string): string {
  if (grain === 'day') return `7 วันล่าสุดถึง ${formatThaiDate(today)}`
  if (grain === 'month') return formatThaiMonthYear(today.slice(0, 7))
  return formatThaiYear(Number(today.slice(0, 4)))
}
