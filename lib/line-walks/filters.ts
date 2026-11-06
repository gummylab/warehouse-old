// URL parsing for the admin line-walk list. Pure and client-safe, like the
// order list filters: the filter bar imports the type and the href builder,
// while the page sends the parsed object to the data layer.

import type {
  LineWalkListFilters,
  LineWalkShift,
  OrderPeriod,
} from '@/lib/db/types'
import { periodRange } from '@/lib/date-range'
import { isLineWalkShift } from '@/lib/line-walks/validation'
import { isValidCalendarDate, todayBangkok } from '@/lib/order-images/validation'

export const LINE_WALK_PAGE_SIZE = 25

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function parsePeriod(value: string): OrderPeriod {
  return value === 'month' || value === 'year' ? value : 'day'
}

function parseShift(value: string): LineWalkShift | null {
  return isLineWalkShift(value) ? value : null
}

// No date parameters means "today, by day". An invalid hand-edited date also
// falls back to today instead of showing an error page.
export function parseLineWalkListParams(
  params: SearchParams,
): LineWalkListFilters {
  const period = parsePeriod(first(params.period))
  const dateValue = first(params.date)
  const date = isValidCalendarDate(dateValue) ? dateValue : todayBangkok()
  const { from, to } = periodRange(period, date)

  const query = first(params.q).slice(0, 100)
  const pageValue = Number.parseInt(first(params.page), 10)
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1

  return {
    period,
    date,
    from,
    to,
    line: first(params.line) || null,
    shift: parseShift(first(params.shift)),
    query: query || null,
    page,
    pageSize: LINE_WALK_PAGE_SIZE,
  }
}

// The period and date select the view, not a filter the user typed. Only the
// line, shift and search decide whether the empty state says "no matches".
export function hasLineWalkFilters(filters: LineWalkListFilters): boolean {
  return Boolean(filters.line || filters.shift || filters.query)
}

// Page 1 and the default today/day view keep the clean /line-walks URL.
export function lineWalkListHref(
  filters: LineWalkListFilters,
  page: number,
): string {
  const params = new URLSearchParams()
  if (filters.period !== 'day' || filters.date !== todayBangkok()) {
    params.set('period', filters.period)
    params.set('date', filters.date)
  }
  if (filters.line) params.set('line', filters.line)
  if (filters.shift) params.set('shift', filters.shift)
  if (filters.query) params.set('q', filters.query)
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return `/line-walks${query ? `?${query}` : ''}`
}
