import { describe, expect, it } from 'vitest'

import {
  fillTrend,
  formatTrendLabel,
  formatTrendPeriod,
  formatTrendTick,
  trendWindow,
} from '@/lib/order-images/trend'

// The windows are anchored on today: day is the last seven days, month is
// every day of this month, and year is every month of this year. Buckets that
// have not arrived yet stay in the list and render as zero.
describe('trendWindow', () => {
  it('returns seven consecutive days ending today', () => {
    const window = trendWindow('day', '2026-11-05')

    expect(window.from).toBe('2026-10-30')
    expect(window.to).toBe('2026-11-05')
    expect(window.buckets).toHaveLength(7)
    expect(window.buckets[0]).toBe('2026-10-30')
    expect(window.buckets.at(-1)).toBe('2026-11-05')
    expect(new Set(window.buckets).size).toBe(7)
  })

  it('crosses a month boundary without losing a day', () => {
    const window = trendWindow('day', '2026-11-02')

    expect(window.buckets).toEqual([
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })

  it('covers every day of the current month', () => {
    const window = trendWindow('month', '2026-11-05')

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
  it('shows the day and month on the daily axes and the full date in the tooltip', () => {
    expect(formatTrendTick('day', '2026-11-05')).toBe('5 พ.ย.')
    expect(formatTrendTick('month', '2026-11-05')).toBe('5 พ.ย.')
    expect(formatTrendLabel('day', '2026-11-05')).toContain('2569')
    expect(formatTrendLabel('month', '2026-11-05')).toContain('2569')
  })

  it('shows the month name on the year axis', () => {
    expect(formatTrendTick('year', '2026-11')).toBe('พ.ย.')
    expect(formatTrendLabel('year', '2026-11')).toContain('2569')
  })

  it('describes the period for the chart accessible name', () => {
    expect(formatTrendPeriod('day', '2026-11-05')).toContain('7 วันล่าสุด')
    expect(formatTrendPeriod('month', '2026-11-05')).toContain('2569')
    expect(formatTrendPeriod('year', '2026-11-05')).toBe('2569')
  })
})
