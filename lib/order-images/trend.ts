// The rolling windows the KPI strip and the trend chart share. Both read the
// same window, so the number above the chart and the chart itself cannot
// disagree.
//
// Every key is a Bangkok calendar date string, the same shape as the stored
// `order_date`, so the SQL never converts a timezone. The functions here are
// pure: the data layer supplies the counts, and the UI supplies the anchor day.

import type { TrendGrain, TrendPoint } from '@/lib/db/types'

import { formatThaiMonthYear, formatThaiYear, thaiMonthName } from './date'
import { formatThaiDate } from './format'

export const TREND_GRAINS = ['day', 'month', 'year'] as const

const DAYS = 30
const MONTHS = 12
const YEARS = 5

export type TrendWindow = {
  from: string
  to: string
  // One key per bar or point. Missing days are filled with zero so the area
  // chart keeps a closed row and a quiet day does not disappear.
  buckets: string[]
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

// The bucket a stored order_date belongs to, for the selected grain. The data
// layer uses the same shape in SQL (`substr`), so the keys line up exactly.
export function bucketKey(grain: TrendGrain, isoDate: string): string {
  if (grain === 'day') return isoDate
  if (grain === 'month') return isoDate.slice(0, 7)
  return isoDate.slice(0, 4)
}

// Calendar windows, not fixed day counts: 30 consecutive days, the current
// month plus the eleven before it, the current year plus the four before it.
// `to` is always the anchor day rather than the end of the month or year, so
// the strip and the chart stop at today and future-dated orders stay out.
export function trendWindow(grain: TrendGrain, today: string): TrendWindow {
  const end = parseIsoDate(today)

  if (grain === 'day') {
    const buckets: string[] = []
    for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
      const date = new Date(end)
      date.setUTCDate(date.getUTCDate() - offset)
      buckets.push(toIsoDate(date))
    }
    return { from: buckets[0], to: today, buckets }
  }

  if (grain === 'month') {
    const buckets: string[] = []
    for (let offset = MONTHS - 1; offset >= 0; offset -= 1) {
      const date = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - offset, 1),
      )
      buckets.push(toIsoDate(date).slice(0, 7))
    }
    return { from: `${buckets[0]}-01`, to: today, buckets }
  }

  const buckets: string[] = []
  for (let offset = YEARS - 1; offset >= 0; offset -= 1) {
    buckets.push(String(end.getUTCFullYear() - offset))
  }
  return { from: `${buckets[0]}-01-01`, to: today, buckets }
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

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

// The x axis label. A 30-point axis only has room for the day and month, while
// the month and year grains can state the whole bucket.
export function formatTrendTick(grain: TrendGrain, bucket: string): string {
  if (grain === 'day') {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
    }).format(utcDate(bucket))
  }
  if (grain === 'month') {
    return thaiMonthName(Number(bucket.slice(5, 7)) - 1)
  }
  return formatThaiYear(Number(bucket))
}

// The tooltip title: the full date for a day, the month for a month bucket and
// the Buddhist year for a year bucket.
export function formatTrendLabel(grain: TrendGrain, bucket: string): string {
  if (grain === 'day') return formatThaiDate(bucket)
  if (grain === 'month') return formatThaiMonthYear(bucket)
  return formatThaiYear(Number(bucket))
}

// "7 ต.ค. 2569 ถึง 5 พ.ย. 2569": the exact window under the switch, so the
// operator never has to work out what "30 วัน" covers.
export function formatTrendRange(
  grain: TrendGrain,
  from: string,
  to: string,
): string {
  if (grain === 'day') {
    return `${formatThaiDate(from)} ถึง ${formatThaiDate(to)}`
  }
  if (grain === 'month') {
    return `${formatThaiMonthYear(from.slice(0, 7))} ถึง ${formatThaiMonthYear(to.slice(0, 7))}`
  }
  return `${formatThaiYear(Number(from.slice(0, 4)))} ถึง ${formatThaiYear(Number(to.slice(0, 4)))}`
}
