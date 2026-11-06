import { describe, expect, it } from 'vitest'

import { fillLineWalkTrend } from '@/lib/line-walks/trend'

describe('fillLineWalkTrend', () => {
  it('keeps the window order and fills missing buckets with zeros', () => {
    expect(
      fillLineWalkTrend(['2026-11-03', '2026-11-04', '2026-11-05'], [
        { bucket: '2026-11-05', people: 2, amount: 20 },
        { bucket: '2026-11-03', people: 1, amount: 10 },
      ]),
    ).toEqual([
      { bucket: '2026-11-03', people: 1, amount: 10 },
      { bucket: '2026-11-04', people: 0, amount: 0 },
      { bucket: '2026-11-05', people: 2, amount: 20 },
    ])
  })

  it('drops a row that falls outside the window', () => {
    expect(
      fillLineWalkTrend(['2026-11-05'], [
        { bucket: '2026-11-04', people: 9, amount: 90 },
      ]),
    ).toEqual([{ bucket: '2026-11-05', people: 0, amount: 0 }])
  })
})
