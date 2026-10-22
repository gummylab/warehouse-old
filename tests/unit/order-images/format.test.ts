import { describe, expect, it } from 'vitest'

import { formatThaiDate } from '@/lib/order-images/format'

// The stored order_date is a plain calendar string with no timezone, so the
// formatter must not shift it while rendering it in Thai (Buddhist era).
describe('formatThaiDate', () => {
  it('renders the Buddhist era year', () => {
    // 2026 CE is 2569 BE; asserting only the year keeps the test independent
    // of the exact Thai month abbreviation ICU ships with.
    expect(formatThaiDate('2026-10-19')).toContain('2569')
  })

  it('formats the same calendar day it was given', () => {
    expect(formatThaiDate('2026-10-19')).toContain('19')
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(formatThaiDate('not-a-date')).toBe('not-a-date')
    expect(formatThaiDate('')).toBe('')
  })
})
