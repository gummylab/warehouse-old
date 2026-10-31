// URL parsing for the admin order list. Pure and client-safe: the filter bar
// imports the type and the href builder, while the page sends the parsed
// object to the data layer.
import type { OrderListFilters, OrderPeriod } from '@/lib/db/types'

import { isValidCalendarDate, todayBangkok } from './validation'

export type { OrderListFilters, OrderPeriod } from '@/lib/db/types'

export const ORDER_PAGE_SIZE = 25

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

// The anchor date is always a real calendar date. The selected period turns
// it into the inclusive range the SQL query filters on.
export function periodRange(
  period: OrderPeriod,
  date: string,
): { from: string; to: string } {
  if (period === 'day') return { from: date, to: date }

  const [year, month] = date.split('-').map(Number)
  if (period === 'month') {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return {
      from: `${year}-${pad2(month)}-01`,
      to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
    }
  }

  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

function parsePeriod(value: string): OrderPeriod {
  return value === 'month' || value === 'year' ? value : 'day'
}

// No date parameters means "today, by day". An invalid hand-edited date also
// falls back to today instead of showing an error page.
export function parseOrderListParams(params: SearchParams): OrderListFilters {
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
    query: query || null,
    page,
    pageSize: ORDER_PAGE_SIZE,
  }
}

// The period and date select the view, not a filter the user typed. Only the
// line and the order-number search decide whether the empty state says
// "no matching orders".
export function hasOrderFilters(filters: OrderListFilters): boolean {
  return Boolean(filters.line || filters.query)
}

// Page 1 and the default today/day view keep the clean /order-images URL.
export function orderListHref(filters: OrderListFilters, page: number): string {
  const params = new URLSearchParams()
  if (filters.period !== 'day' || filters.date !== todayBangkok()) {
    params.set('period', filters.period)
    params.set('date', filters.date)
  }
  if (filters.line) params.set('line', filters.line)
  if (filters.query) params.set('q', filters.query)
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return `/order-images${query ? `?${query}` : ''}`
}
