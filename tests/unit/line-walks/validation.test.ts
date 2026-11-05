import { describe, expect, it } from 'vitest'

import {
  lineWalkKey,
  parseLineWalkEntry,
  parseWholeNumber,
} from '@/lib/line-walks/validation'

describe('lineWalkKey', () => {
  it('builds the key from trimmed text', () => {
    expect(
      lineWalkKey({
        walkDate: '2026-11-05',
        shift: 'day',
        line: 'line-a',
        brand: '  แบรนด์  ',
        packStyle: ' box ',
      }),
    ).toBe('2026-11-05|day|line-a|แบรนด์|box')
  })

  it('returns null until every key field is filled', () => {
    const base = {
      walkDate: '2026-11-05',
      line: 'line-a',
      brand: 'brand',
      packStyle: 'box',
    }

    expect(lineWalkKey({ ...base, shift: null })).toBeNull()
    expect(lineWalkKey({ ...base, shift: 'day', line: null })).toBeNull()
    expect(lineWalkKey({ ...base, shift: 'day', brand: '   ' })).toBeNull()
    expect(lineWalkKey({ ...base, shift: 'day', packStyle: '' })).toBeNull()
  })

  it('treats the two shifts as different keys', () => {
    const base = {
      walkDate: '2026-11-05',
      line: 'line-a',
      brand: 'brand',
      packStyle: 'box',
    }

    expect(lineWalkKey({ ...base, shift: 'day' })).not.toBe(
      lineWalkKey({ ...base, shift: 'night' }),
    )
  })
})

describe('parseWholeNumber', () => {
  it('accepts whole numbers, including surrounding spaces and zero', () => {
    expect(parseWholeNumber('0')).toBe(0)
    expect(parseWholeNumber(' 12 ')).toBe(12)
  })

  it('rejects empty, fractional, mixed and negative values', () => {
    expect(parseWholeNumber('')).toBeNull()
    expect(parseWholeNumber('   ')).toBeNull()
    expect(parseWholeNumber('1.5')).toBeNull()
    expect(parseWholeNumber('12a3')).toBeNull()
    expect(parseWholeNumber('-1')).toBeNull()
  })
})

describe('parseLineWalkEntry', () => {
  it('trims the text fields and returns the stored shape', () => {
    expect(
      parseLineWalkEntry({
        walkDate: '2026-11-05',
        shift: 'night',
        line: ' line-a ',
        brand: ' แบรนด์ ',
        packStyle: ' box ',
        people: 3,
        amount: 40,
      }),
    ).toEqual({
      ok: true,
      entry: {
        walkDate: '2026-11-05',
        shift: 'night',
        line: 'line-a',
        brand: 'แบรนด์',
        packStyle: 'box',
        people: 3,
        amount: 40,
      },
    })
  })

  it('rejects an invalid date, shift, blank text or count', () => {
    const valid = {
      walkDate: '2026-11-05',
      shift: 'day',
      line: 'line-a',
      brand: 'brand',
      packStyle: 'box',
      people: 3,
      amount: 40,
    }

    expect(parseLineWalkEntry({ ...valid, walkDate: '2026-02-30' })).toEqual({
      ok: false,
      error: 'invalid-date',
    })
    expect(parseLineWalkEntry({ ...valid, shift: 'midnight' })).toEqual({
      ok: false,
      error: 'invalid-shift',
    })
    expect(parseLineWalkEntry({ ...valid, brand: '   ' })).toEqual({
      ok: false,
      error: 'invalid-brand',
    })
    expect(parseLineWalkEntry({ ...valid, people: -1 })).toEqual({
      ok: false,
      error: 'invalid-people',
    })
    expect(parseLineWalkEntry({ ...valid, amount: 1.5 })).toEqual({
      ok: false,
      error: 'invalid-amount',
    })
  })
})
