import { describe, expect, it } from 'vitest'

import {
  hasOrderFilters,
  ORDER_PAGE_SIZE,
  orderListHref,
  parseOrderListParams,
} from '@/lib/order-images/filters'
import { todayBangkok } from '@/lib/order-images/validation'

describe('parseOrderListParams', () => {
  it('defaults to today by day', () => {
    const today = todayBangkok()
    expect(parseOrderListParams({})).toEqual({
      period: 'day',
      date: today,
      from: today,
      to: today,
      line: null,
      query: null,
      page: 1,
      pageSize: ORDER_PAGE_SIZE,
    })
  })

  it('keeps a selected day', () => {
    expect(
      parseOrderListParams({ period: 'day', date: '2026-10-19' }),
    ).toMatchObject({
      period: 'day',
      date: '2026-10-19',
      from: '2026-10-19',
      to: '2026-10-19',
    })
  })

  it('turns a selected month into its first and last day', () => {
    expect(
      parseOrderListParams({ period: 'month', date: '2026-02-15' }),
    ).toMatchObject({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('handles a leap February', () => {
    expect(
      parseOrderListParams({ period: 'month', date: '2028-02-15' }),
    ).toMatchObject({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('turns a selected year into its full range', () => {
    expect(
      parseOrderListParams({ period: 'year', date: '2026-10-19' }),
    ).toMatchObject({
      from: '2026-01-01',
      to: '2026-12-31',
    })
  })

  it('falls back to day for an unknown period and to today for an invalid date', () => {
    const today = todayBangkok()
    expect(
      parseOrderListParams({ period: 'week', date: '2026-02-30' }),
    ).toMatchObject({
      period: 'day',
      date: today,
      from: today,
      to: today,
    })
  })

  it('takes the first value of a repeated param and trims it', () => {
    expect(
      parseOrderListParams({ q: ['  12345  ', 'other'] }),
    ).toMatchObject({ query: '12345' })
  })

  it('caps a very long query', () => {
    expect(parseOrderListParams({ q: 'x'.repeat(150) }).query).toHaveLength(100)
  })

  it('falls back to page 1 for a bad page value', () => {
    expect(parseOrderListParams({ page: '0' }).page).toBe(1)
    expect(parseOrderListParams({ page: 'abc' }).page).toBe(1)
    expect(parseOrderListParams({ page: '3' }).page).toBe(3)
  })
})

describe('hasOrderFilters', () => {
  it('ignores the period and date view controls', () => {
    expect(
      hasOrderFilters(parseOrderListParams({ period: 'year', date: '2026-10-19' })),
    ).toBe(false)
  })

  it('is true when the line or query is set', () => {
    expect(hasOrderFilters(parseOrderListParams({ line: 'ดอกแค' }))).toBe(true)
    expect(hasOrderFilters(parseOrderListParams({ q: '123' }))).toBe(true)
  })
})

describe('orderListHref', () => {
  it('omits the default day and today', () => {
    expect(orderListHref(parseOrderListParams({}), 1)).toBe('/order-images')
  })

  it('keeps a custom day', () => {
    expect(
      orderListHref(
        parseOrderListParams({ period: 'day', date: '2026-10-19' }),
        1,
      ),
    ).toBe('/order-images?period=day&date=2026-10-19')
  })

  it('keeps a month or year selection', () => {
    expect(
      orderListHref(
        parseOrderListParams({ period: 'month', date: '2026-10-01' }),
        1,
      ),
    ).toBe('/order-images?period=month&date=2026-10-01')
  })

  it('preserves line, query and page', () => {
    const filters = parseOrderListParams({ line: 'ดอกแค', q: '12 34' })
    expect(orderListHref(filters, 2)).toBe(
      '/order-images?line=%E0%B8%94%E0%B8%AD%E0%B8%81%E0%B9%81%E0%B8%84&q=12+34&page=2',
    )
  })
})
