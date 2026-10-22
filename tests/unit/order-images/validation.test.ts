import { describe, expect, it } from 'vitest'

import {
  isDotOnlySegment,
  isValidCalendarDate,
  isValidOrderNumber,
  MAX_ORDER_NUMBER_LENGTH,
  normalizeOrderNumber,
  todayBangkok,
} from '@/lib/order-images/validation'

// The form validates with these helpers before submitting and the lookup
// route validates with them again after auth, so a mismatch here would show
// up as an error message the server disagrees with.
describe('order-image validation', () => {
  describe('order number', () => {
    it('trims so " 1234 " and "1234" are the same order key', () => {
      expect(normalizeOrderNumber(' 1234 ')).toBe('1234')
      expect(normalizeOrderNumber('1234')).toBe('1234')
    })

    it('rejects empty and whitespace-only input', () => {
      expect(isValidOrderNumber('')).toBe(false)
      expect(isValidOrderNumber('   ')).toBe(false)
    })

    it('accepts the maximum length and rejects one character more', () => {
      expect(isValidOrderNumber('a'.repeat(MAX_ORDER_NUMBER_LENGTH))).toBe(true)
      expect(isValidOrderNumber('a'.repeat(MAX_ORDER_NUMBER_LENGTH + 1))).toBe(false)
    })

    it('accepts a padded value because the length check runs after trimming', () => {
      expect(isValidOrderNumber(' 1234 ')).toBe(true)
    })

    it('rejects an order number made only of dots', () => {
      // "." and ".." are path instructions, not names. The storage key is
      // built from the order number, so allowing them would write a photo
      // into the parent folder and let two such orders overwrite each other.
      expect(isValidOrderNumber('.')).toBe(false)
      expect(isValidOrderNumber('..')).toBe(false)
      expect(isValidOrderNumber('...')).toBe(false)
      expect(isValidOrderNumber('  ..  ')).toBe(false)
    })

    it('accepts an order number that merely contains dots', () => {
      // Only a segment made entirely of dots is a path instruction.
      expect(isValidOrderNumber('1234.5')).toBe(true)
      expect(isValidOrderNumber('.1234')).toBe(true)
      expect(isValidOrderNumber('12..34')).toBe(true)
    })
  })

  describe('isDotOnlySegment', () => {
    it('matches only a segment of nothing but dots', () => {
      expect(isDotOnlySegment('.')).toBe(true)
      expect(isDotOnlySegment('..')).toBe(true)
      expect(isDotOnlySegment('...')).toBe(true)
      expect(isDotOnlySegment('a')).toBe(false)
      expect(isDotOnlySegment('')).toBe(false)
      expect(isDotOnlySegment('..a')).toBe(false)
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
