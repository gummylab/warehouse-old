import { describe, expect, it } from 'vitest'

import {
  fillTrend,
  formatTrendLabel,
  formatTrendPeriod,
  formatTrendTick,
  trendWindow,
} from '@/lib/order-images/trend'

// The windows are anchored on today: the day window is today's 24 hours (an
// entry-time range), the month window is every day of this month, and the year
// window is every month of this year. Buckets that have not arrived yet stay
// in the list and render as zero.
describe('trendWindow', () => {
  it('covers the Bangkok day as a UTC instant range', () => {
    const window = trendWindow('day', '2026-11-05')

    expect(window.kind).toBe('created')
    // 00:00 in Bangkok is 17:00 UTC the evening before.
    expect(window.from).toBe('2026-11-04T17:00:00.000Z')
    expect(window.to).toBe('2026-11-05T17:00:00.000Z')
    expect(window.buckets).toHaveLength(24)
    expect(window.buckets[0]).toBe('2026-11-05T00')
    expect(window.buckets.at(-1)).toBe('2026-11-05T23')
  })

  it('covers every day of the current month', () => {
    const window = trendWindow('month', '2026-11-05')

    expect(window.kind).toBe('order')
    expect(window.from).toBe('2026-11-01')
    expect(window.to).toBe('2026-11-05')
    expect(window.buckets).toHaveLength(30)
    expect(window.buckets[0]).toBe('2026-11-01')
    expect(window.buckets.at(-1)).toBe('2026-11-30')
  })

  it('keeps 29 February in a leap-year month', () => {
    const window = trendWindow('month', '2028-02-10')

    expect(window.buckets).toHaveLength(29)
    expect(window.buckets).toContain('2028-02-29')
  })

  it('covers every month of the current year', () => {
    const window = trendWindow('year', '2026-11-05')

    expect(window.kind).toBe('order')
    expect(window.from).toBe('2026-01-01')
    expect(window.to).toBe('2026-11-05')
    expect(window.buckets).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ])
  })
})

describe('fillTrend', () => {
  it('keeps the window order and fills missing buckets with zero', () => {
    expect(
      fillTrend(['2026-11-03', '2026-11-04', '2026-11-05'], [
        { bucket: '2026-11-05', count: 2 },
        { bucket: '2026-11-03', count: 1 },
      ]),
    ).toEqual([
      { bucket: '2026-11-03', count: 1 },
      { bucket: '2026-11-04', count: 0 },
      { bucket: '2026-11-05', count: 2 },
    ])
  })

  it('drops a row that falls outside the window', () => {
    expect(
      fillTrend(['2026-11-05'], [{ bucket: '2026-11-04', count: 9 }]),
    ).toEqual([{ bucket: '2026-11-05', count: 0 }])
  })
})

describe('trend labels', () => {
  it('shows the hour on a day axis and the date and hour in the tooltip', () => {
    expect(formatTrendTick('day', '2026-11-05T09')).toBe('09:00')
    expect(formatTrendLabel('day', '2026-11-05T09')).toContain('09:00')
    expect(formatTrendLabel('day', '2026-11-05T09')).toContain('2569')
  })

  it('shows the day on a month axis and the month name on a year axis', () => {
    expect(formatTrendTick('month', '2026-11-05')).toBe('5 พ.ย.')
    expect(formatTrendLabel('month', '2026-11-05')).toContain('2569')
    expect(formatTrendTick('year', '2026-11')).toBe('พ.ย.')
    expect(formatTrendLabel('year', '2026-11')).toContain('2569')
  })

  it('describes the period for the chart accessible name', () => {
    expect(formatTrendPeriod('day', '2026-11-05')).toContain('2569')
    expect(formatTrendPeriod('month', '2026-11-05')).toContain('2569')
    expect(formatTrendPeriod('year', '2026-11-05')).toBe('2569')
  })
})
