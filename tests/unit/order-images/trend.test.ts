import { describe, expect, it } from 'vitest'

import {
  bucketKey,
  fillTrend,
  formatTrendLabel,
  formatTrendRange,
  formatTrendTick,
  trendWindow,
} from '@/lib/order-images/trend'

// The windows are calendar based and end on the anchor day, never on the end
// of the month or year: the KPI strip and the chart must stop at today and
// leave future-dated orders out.
describe('trendWindow', () => {
  it('returns 30 consecutive days ending today', () => {
    const window = trendWindow('day', '2026-11-05')

    expect(window.from).toBe('2026-10-07')
    expect(window.to).toBe('2026-11-05')
    expect(window.buckets).toHaveLength(30)
    expect(window.buckets[0]).toBe('2026-10-07')
    expect(window.buckets.at(-1)).toBe('2026-11-05')
    expect(new Set(window.buckets).size).toBe(30)
  })

  it('crosses a year boundary without losing a day', () => {
    const window = trendWindow('day', '2026-01-15')

    expect(window.from).toBe('2025-12-17')
    expect(window.buckets).toContain('2026-01-01')
    expect(window.buckets).toHaveLength(30)
  })

  it('keeps 29 February in a leap-year window', () => {
    const window = trendWindow('day', '2028-03-01')

    expect(window.from).toBe('2028-02-01')
    expect(window.buckets).toContain('2028-02-29')
    expect(window.buckets).toHaveLength(30)
  })

  it('returns 12 calendar months ending with the current one', () => {
    const window = trendWindow('month', '2026-11-05')

    expect(window.from).toBe('2025-12-01')
    expect(window.to).toBe('2026-11-05')
    expect(window.buckets).toEqual([
      '2025-12',
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
    ])
  })

  it('returns five calendar years ending with the current one', () => {
    const window = trendWindow('year', '2026-11-05')

    expect(window.from).toBe('2022-01-01')
    expect(window.to).toBe('2026-11-05')
    expect(window.buckets).toEqual(['2022', '2023', '2024', '2025', '2026'])
  })
})

describe('bucketKey', () => {
  it('cuts a date down to the selected grain', () => {
    expect(bucketKey('day', '2026-11-05')).toBe('2026-11-05')
    expect(bucketKey('month', '2026-11-05')).toBe('2026-11')
    expect(bucketKey('year', '2026-11-05')).toBe('2026')
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
  it('shows the day and month on a day axis and the full date in the tooltip', () => {
    expect(formatTrendTick('day', '2026-11-05')).toBe('5 พ.ย.')
    expect(formatTrendLabel('day', '2026-11-05')).toContain('2569')
  })

  it('shows the month name for a month bucket and the year for a year bucket', () => {
    expect(formatTrendTick('month', '2026-11')).toBe('พ.ย.')
    expect(formatTrendLabel('month', '2026-11')).toContain('2569')
    expect(formatTrendTick('year', '2026')).toBe('2569')
    expect(formatTrendLabel('year', '2026')).toBe('2569')
  })

  it('describes the whole range in Thai', () => {
    expect(formatTrendRange('day', '2026-10-07', '2026-11-05')).toContain(
      'ถึง',
    )
    expect(formatTrendRange('month', '2025-12-01', '2026-11-05')).toContain(
      '2568',
    )
    expect(formatTrendRange('year', '2022-01-01', '2026-11-05')).toBe(
      '2565 ถึง 2569',
    )
  })
})
