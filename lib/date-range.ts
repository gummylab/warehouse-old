// The day/month/year anchor turns one calendar date into the inclusive range a
// list query filters on. Shared by the order list and the line-walk list so the
// two pages cannot disagree about what "this month" means.

import type { OrderPeriod } from '@/lib/db/types'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function periodRange(
  period: OrderPeriod,
  date: string,
): { from: string; to: string } {
  if (period === 'day') return { from: date, to: date }

  const [year, month] = date.split('-').map(Number)
  if (period === 'month') {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return {
      from: `${year}-${pad2(month)}-01`,
      to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
    }
  }

  return { from: `${year}-01-01`, to: `${year}-12-31` }
}
