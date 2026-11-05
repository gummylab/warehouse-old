// Pure rules for the line-walk log, shared by the form and the API routes.
//
// The identity is (date, shift, line, brand, pack style). Brand and pack style
// are free text, so the only normalisation is trimming: those trimmed values
// are what the key and the database store.

import type { LineWalkInput, LineWalkShift } from '@/lib/db/types'
import { isValidCalendarDate } from '@/lib/order-images/validation'

export function isLineWalkShift(value: unknown): value is LineWalkShift {
  return value === 'day' || value === 'night'
}

export function normalizeLineWalkText(value: string): string {
  return value.trim()
}

// The count fields hold strings. An empty or fractional value is not a count.
export function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const number = Number(trimmed)
  return Number.isSafeInteger(number) ? number : null
}

// Null means the row is not complete yet, which is also when the form hides
// the count block and skips the lookup.
export function lineWalkKey(input: {
  walkDate: string
  shift: LineWalkShift | null
  line: string | null
  brand: string
  packStyle: string
}): string | null {
  if (!input.shift || !input.line) return null

  const brand = normalizeLineWalkText(input.brand)
  const packStyle = normalizeLineWalkText(input.packStyle)
  if (!brand || !packStyle) return null

  return [input.walkDate, input.shift, input.line, brand, packStyle].join('|')
}

// Validates a wire entry and returns the normalized row the data layer stores.
// The route checks the line against the catalog separately, because that needs
// the database.
export function parseLineWalkEntry(input: {
  walkDate: string
  shift: string
  line: string
  brand: string
  packStyle: string
  people: number
  amount: number
}):
  | { ok: true; entry: LineWalkInput }
  | { ok: false; error: string } {
  if (!isValidCalendarDate(input.walkDate)) {
    return { ok: false, error: 'invalid-date' }
  }
  if (!isLineWalkShift(input.shift)) {
    return { ok: false, error: 'invalid-shift' }
  }

  const line = normalizeLineWalkText(input.line)
  if (!line) return { ok: false, error: 'unknown-line' }

  const brand = normalizeLineWalkText(input.brand)
  if (!brand || brand.length > 100) {
    return { ok: false, error: 'invalid-brand' }
  }

  const packStyle = normalizeLineWalkText(input.packStyle)
  if (!packStyle || packStyle.length > 100) {
    return { ok: false, error: 'invalid-pack-style' }
  }

  if (!Number.isInteger(input.people) || input.people < 0) {
    return { ok: false, error: 'invalid-people' }
  }
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    return { ok: false, error: 'invalid-amount' }
  }

  return {
    ok: true,
    entry: {
      walkDate: input.walkDate,
      shift: input.shift,
      line,
      brand,
      packStyle,
      people: input.people,
      amount: input.amount,
    },
  }
}
