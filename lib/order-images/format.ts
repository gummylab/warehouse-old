// Display formatting for stored date strings. orderDate is a plain
// 'YYYY-MM-DD' with no timezone attached, so formatting anchors it at UTC
// midnight — the string is a calendar date, and rendering must show exactly
// those numbers in Thai, Buddhist era (th-TH's default calendar).
export function formatThaiDate(orderDate: string): string {
  const parsed = new Date(`${orderDate}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return orderDate
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}
