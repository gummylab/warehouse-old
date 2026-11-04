// Conversions between the stored calendar-date strings and the Date objects
// the calendar component works with.
//
// The stored value has no time and no timezone: 'YYYY-MM-DD' means that
// calendar day in Bangkok. Building and reading the Date with local getters
// keeps the day intact on every machine; `new Date(iso)` (UTC parse) or
// `toISOString()` (UTC output) would shift it for any timezone west of UTC.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_MONTH = /^(\d{4})-(\d{2})$/
const ISO_YEAR = /^(\d{4})$/

export function isoToDate(iso: string): Date | undefined {
  const match = ISO_DATE.exec(iso)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  // Local construction rolls invalid days over (2026-02-30 becomes March 2),
  // so verify the parts survived instead of trusting the constructor.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

export function dateToIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isoMonthParts(
  value: string,
): { year: number; month: number } | undefined {
  const match = ISO_MONTH.exec(value)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return undefined

  return { year, month }
}

export function isoYear(value: string): number | undefined {
  const match = ISO_YEAR.exec(value)
  return match ? Number(match[1]) : undefined
}

// The app displays every date in Thai Buddhist era (the default calendar of
// th-TH), so the pickers must use the same formatting as formatThaiDate.
export function thaiMonthName(
  monthIndex: number,
  style: 'short' | 'long' = 'short',
): string {
  // The year is only a carrier for the month name; 2026 keeps 29 February out
  // of the way and has no effect on the label.
  return new Intl.DateTimeFormat('th-TH', { month: style }).format(
    new Date(2026, monthIndex, 1),
  )
}

export function formatThaiMonthYear(value: string): string {
  const parts = isoMonthParts(value)
  if (!parts) return value

  return new Intl.DateTimeFormat('th-TH', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(parts.year, parts.month - 1, 1))
}

export function formatThaiYear(year: number): string {
  const formatter = new Intl.DateTimeFormat('th-TH', { year: 'numeric' })
  const parts = formatter.formatToParts(new Date(year, 0, 1))
  // A year on its own renders as "พ.ศ. 2569"; the calendar's grid and range
  // labels only need the digits, matching the "พ.ย. 2569" month label.
  return parts.find((part) => part.type === 'year')?.value ?? String(year)
}

// react-day-picker calls this for the month caption above the day grid.
export function formatThaiMonthYearCaption(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}
