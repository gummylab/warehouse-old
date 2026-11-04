import { describe, expect, it } from 'vitest'

import {
  isValidCalendarDate,
  isValidOrderNumber,
  normalizeOrderNumber,
  ORDER_NUMBER_LENGTH,
  todayBangkok,
} from '@/lib/order-images/validation'

// The form validates with these helpers before submitting and the lookup
// route validates with them again after auth, so a mismatch here would show
// up as an error message the server disagrees with.
describe('order-image validation', () => {
  describe('order number', () => {
    it('trims so " 123456789 " and "123456789" are the same order key', () => {
      expect(normalizeOrderNumber(' 123456789 ')).toBe('123456789')
      expect(normalizeOrderNumber('123456789')).toBe('123456789')
    })

    it('accepts exactly nine digits, including leading zeros', () => {
      expect(isValidOrderNumber('123456789')).toBe(true)
      expect(isValidOrderNumber('000000001')).toBe(true)
      expect(isValidOrderNumber(' 123456789 ')).toBe(true)
    })

    it('rejects empty and whitespace-only input', () => {
      expect(isValidOrderNumber('')).toBe(false)
      expect(isValidOrderNumber('   ')).toBe(false)
    })

    it('rejects anything shorter or longer than nine digits', () => {
      const shorter = '1'.repeat(ORDER_NUMBER_LENGTH - 1)
      const longer = '1'.repeat(ORDER_NUMBER_LENGTH + 1)
      expect(isValidOrderNumber(shorter)).toBe(false)
      expect(isValidOrderNumber(longer)).toBe(false)
    })

    it('rejects letters, separators, dots and full-width digits', () => {
      expect(isValidOrderNumber('12345678a')).toBe(false)
      expect(isValidOrderNumber('1234-5678')).toBe(false)
      expect(isValidOrderNumber('1234 5678')).toBe(false)
      expect(isValidOrderNumber('...')).toBe(false)
      expect(isValidOrderNumber('１２３４５６７８９')).toBe(false)
    })
  })

  describe('calendar date', () => {
    it('accepts a plain YYYY-MM-DD date', () => {
      expect(isValidCalendarDate('2026-10-19')).toBe(true)
    })

    it('accepts a leap day in a leap year', () => {
      expect(isValidCalendarDate('2028-02-29')).toBe(true)
    })

    it('rejects a date that would roll over into the next month', () => {
      expect(isValidCalendarDate('2026-02-30')).toBe(false)
    })

    it('rejects a non-leap-year 29 February', () => {
      expect(isValidCalendarDate('2026-02-29')).toBe(false)
    })

    it('rejects an impossible month', () => {
      expect(isValidCalendarDate('2026-13-01')).toBe(false)
    })

    it('rejects other formats, including one with a time attached', () => {
      expect(isValidCalendarDate('2026-1-5')).toBe(false)
      expect(isValidCalendarDate('19/10/2026')).toBe(false)
      expect(isValidCalendarDate('2026-10-19T00:00:00Z')).toBe(false)
      expect(isValidCalendarDate('2026-10-19 ')).toBe(false)
    })
  })

  describe('todayBangkok', () => {
    it('rolls over to the next day once Bangkok has passed midnight', () => {
      // 18:00 UTC is 01:00 the next day in Bangkok (+07:00).
      expect(todayBangkok(new Date('2026-10-19T18:00:00Z'))).toBe('2026-10-20')
    })

    it('stays on the same day before Bangkok midnight', () => {
      expect(todayBangkok(new Date('2026-10-19T16:59:00Z'))).toBe('2026-10-19')
    })

    it('does not depend on the machine timezone', () => {
      expect(todayBangkok(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01')
    })
  })
})
