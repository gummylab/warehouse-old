import { describe, expect, it } from 'vitest'

import {
  dateToIso,
  formatThaiMonthYear,
  formatThaiYear,
  isoMonthParts,
  isoToDate,
  isoYear,
} from '@/lib/order-images/date'

describe('isoToDate / dateToIso', () => {
  it('round-trips a calendar date without shifting the day', () => {
    const parsed = isoToDate('2026-01-01')
    expect(parsed).toBeInstanceOf(Date)
    expect(dateToIso(parsed!)).toBe('2026-01-01')
  })

  it('round-trips the last day of a month', () => {
    const parsed = isoToDate('2026-02-28')
    expect(parsed).toBeInstanceOf(Date)
    expect(dateToIso(parsed!)).toBe('2026-02-28')
  })

  it('rejects a date the constructor would roll over', () => {
    expect(isoToDate('2026-02-30')).toBeUndefined()
    expect(isoToDate('2026-13-01')).toBeUndefined()
  })

  it('rejects a value that is not an ISO date', () => {
    expect(isoToDate('')).toBeUndefined()
    expect(isoToDate('1/1/2026')).toBeUndefined()
  })
})

describe('month and year parts', () => {
  it('splits an ISO month', () => {
    expect(isoMonthParts('2026-11')).toEqual({ year: 2026, month: 11 })
  })

  it('rejects an impossible month', () => {
    expect(isoMonthParts('2026-00')).toBeUndefined()
    expect(isoMonthParts('2026-13')).toBeUndefined()
    expect(isoMonthParts('2026-11-01')).toBeUndefined()
  })

  it('reads an ISO year', () => {
    expect(isoYear('2026')).toBe(2026)
    expect(isoYear('26')).toBeUndefined()
  })
})

describe('Thai display formatting', () => {
  it('uses the Buddhist era for a year', () => {
    expect(formatThaiYear(2026)).toBe('2569')
  })

  it('renders a month label with the Buddhist era', () => {
    expect(formatThaiMonthYear('2026-11')).toContain('2569')
    expect(formatThaiMonthYear('2026-11')).not.toContain('2026')
  })
})
