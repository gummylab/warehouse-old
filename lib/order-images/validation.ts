// Input checks shared by the form (inline, before submit) and the lookup
// route (authoritative, after auth). One implementation means the client
// and server can never disagree about what is valid.

export const MAX_ORDER_NUMBER_LENGTH = 60

// Trimming happens in one place so "1234 " and "1234" are the same order
// key client-side and server-side.
export function normalizeOrderNumber(value: string): string {
  return value.trim()
}

export function isValidOrderNumber(value: string): boolean {
  const normalized = normalizeOrderNumber(value)
  return normalized.length > 0 && normalized.length <= MAX_ORDER_NUMBER_LENGTH
}

// 'YYYY-MM-DD' that is also a real calendar date: 2026-02-30 must fail
// outright, not roll over into March. Matches the native date input's
// format, so no locale parsing is involved anywhere.
export function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

// Today's calendar date in Asia/Bangkok as 'YYYY-MM-DD' for the date
// input's default. en-CA formats in ISO order directly and Intl applies
// the +07:00 offset itself — no manual timezone arithmetic.
export function todayBangkok(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
