import { describe, expect, it } from 'vitest'

import {
  hasLineWalkFilters,
  LINE_WALK_PAGE_SIZE,
  lineWalkListHref,
  parseLineWalkListParams,
} from '@/lib/line-walks/filters'
import { todayBangkok } from '@/lib/order-images/validation'

describe('parseLineWalkListParams', () => {
  it('defaults to today, by day, all lines and shifts', () => {
    const today = todayBangkok()

    expect(parseLineWalkListParams({})).toEqual({
      period: 'day',
      date: today,
      from: today,
      to: today,
      line: null,
      shift: null,
      query: null,
      page: 1,
      pageSize: LINE_WALK_PAGE_SIZE,
    })
  })

  it('turns a selected month into its first and last day', () => {
    expect(
      parseLineWalkListParams({ period: 'month', date: '2026-02-15' }),
    ).toMatchObject({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('handles a leap February', () => {
    expect(
      parseLineWalkListParams({ period: 'month', date: '2028-02-15' }),
    ).toMatchObject({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('reads a shift, line and trimmed query', () => {
    expect(
      parseLineWalkListParams({
        shift: 'night',
        line: 'line-a',
        q: '  ab  ',
      }),
    ).toMatchObject({ shift: 'night', line: 'line-a', query: 'ab' })
  })

  it('drops an unknown shift and caps a long query', () => {
    expect(parseLineWalkListParams({ shift: 'midnight' }).shift).toBeNull()
    expect(
      parseLineWalkListParams({ q: 'x'.repeat(150) }).query,
    ).toHaveLength(100)
  })
})

describe('hasLineWalkFilters', () => {
  it('ignores the period and date view controls', () => {
    expect(
      hasLineWalkFilters(
        parseLineWalkListParams({ period: 'year', date: '2026-10-19' }),
      ),
    ).toBe(false)
  })

  it('is true when the line, shift or query is set', () => {
    expect(
      hasLineWalkFilters(parseLineWalkListParams({ line: 'line-a' })),
    ).toBe(true)
    expect(
      hasLineWalkFilters(parseLineWalkListParams({ shift: 'day' })),
    ).toBe(true)
    expect(hasLineWalkFilters(parseLineWalkListParams({ q: '12' }))).toBe(
      true,
    )
  })
})

describe('lineWalkListHref', () => {
  it('omits the default day and today', () => {
    expect(lineWalkListHref(parseLineWalkListParams({}), 1)).toBe(
      '/line-walks',
    )
  })

  it('keeps a custom day', () => {
    expect(
      lineWalkListHref(
        parseLineWalkListParams({ period: 'day', date: '2026-11-05' }),
        1,
      ),
    ).toBe('/line-walks?period=day&date=2026-11-05')
  })

  it('preserves line, shift, query and page', () => {
    const filters = parseLineWalkListParams({
      line: 'line-a',
      shift: 'night',
      q: 'ab',
    })

    expect(lineWalkListHref(filters, 2)).toBe(
      '/line-walks?line=line-a&shift=night&q=ab&page=2',
    )
  })
})
