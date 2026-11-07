import { describe, expect, it } from 'vitest'

import {
  findLineWalk,
  getLineWalkOverview,
  getLineWalkSummary,
  listLineWalks,
  saveLineWalks,
} from '@/lib/db/line-walks'
import type { LineWalkListFilters } from '@/lib/db/types'

import { isolateTestData } from '../setup/db'

isolateTestData()

const KEY = {
  walkDate: '2026-11-05',
  shift: 'day' as const,
  line: 'line-a',
  brand: 'brand',
  packStyle: 'box',
}

function filters(
  overrides: Partial<LineWalkListFilters> = {},
): LineWalkListFilters {
  return {
    period: 'day',
    date: '2026-11-05',
    from: '2026-11-01',
    to: '2026-11-05',
    line: null,
    shift: null,
    brand: null,
    packStyle: null,
    page: 1,
    pageSize: 25,
    ...overrides,
  }
}

function seedRows() {
  saveLineWalks(
    [
      {
        ...KEY,
        walkDate: '2026-11-05',
        shift: 'day',
        line: 'line-a',
        brand: 'Alpha',
        packStyle: 'box',
        people: 3,
        amount: 40,
      },
      {
        ...KEY,
        walkDate: '2026-11-04',
        shift: 'night',
        line: 'line-b',
        brand: 'Beta',
        packStyle: 'bag',
        people: 2,
        amount: 10,
      },
    ],
    'U-1',
  )
}

describe('saveLineWalks', () => {
  it('creates a row and finds it by its key', () => {
    const [row] = saveLineWalks([{ ...KEY, people: 3, amount: 40 }], 'U-1')

    expect(row).toMatchObject({ ...KEY, people: 3, amount: 40 })
    expect(findLineWalk(KEY)).toEqual(row)
  })

  it('updates the counts and keeps the identity on a second save', () => {
    const [first] = saveLineWalks([{ ...KEY, people: 3, amount: 40 }], 'U-1')
    const [second] = saveLineWalks([{ ...KEY, people: 5, amount: 60 }], 'U-2')

    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.people).toBe(5)
    expect(second.amount).toBe(60)
  })

  it('treats another shift as another record', () => {
    const [day] = saveLineWalks([{ ...KEY, people: 1, amount: 10 }], 'U-1')
    const [night] = saveLineWalks(
      [{ ...KEY, shift: 'night', people: 2, amount: 20 }],
      'U-1',
    )

    expect(night.id).not.toBe(day.id)
    expect(findLineWalk({ ...KEY, shift: 'day' })?.people).toBe(1)
    expect(findLineWalk({ ...KEY, shift: 'night' })?.people).toBe(2)
  })
})

describe('listLineWalks', () => {
  it('returns the rows newest first with the creator name', () => {
    seedRows()

    const result = listLineWalks(filters())

    expect(result.total).toBe(2)
    expect(result.pageCount).toBe(1)
    expect(result.rows.map((row) => row.walkDate)).toEqual([
      '2026-11-05',
      '2026-11-04',
    ])
    expect(result.rows[0].creatorName).toBe('U-1')
  })

  it('filters by line, shift, brand and pack style', () => {
    seedRows()

    expect(listLineWalks(filters({ line: 'line-a' })).total).toBe(1)
    expect(listLineWalks(filters({ shift: 'night' })).total).toBe(1)
    expect(listLineWalks(filters({ brand: 'alph' })).total).toBe(1)
    expect(listLineWalks(filters({ packStyle: 'bag' })).total).toBe(1)
    expect(listLineWalks(filters({ brand: 'zzz' })).total).toBe(0)
  })

  it('requires a row to match both searches', () => {
    seedRows()

    // Alpha is box only, so pairing the brand with the other pack style finds
    // nothing. The two fields are ANDed, not ORed like the old single search.
    expect(
      listLineWalks(filters({ brand: 'Alpha', packStyle: 'bag' })).total,
    ).toBe(0)
    expect(
      listLineWalks(filters({ brand: 'Alpha', packStyle: 'box' })).total,
    ).toBe(1)
  })

  it('narrows by the date range and pages the result', () => {
    seedRows()

    expect(
      listLineWalks(filters({ from: '2026-11-05', to: '2026-11-05' })).total,
    ).toBe(1)

    const first = listLineWalks(filters({ pageSize: 1, page: 1 }))
    const second = listLineWalks(filters({ pageSize: 1, page: 2 }))

    expect(first.pageCount).toBe(2)
    expect(first.rows[0].walkDate).toBe('2026-11-05')
    expect(second.rows[0].walkDate).toBe('2026-11-04')
  })
})

describe('getLineWalkSummary', () => {
  it('sums the records, people and amount in the range', () => {
    seedRows()

    expect(
      getLineWalkSummary({ from: '2026-11-01', to: '2026-11-05' }),
    ).toEqual({ records: 2, people: 5, amount: 50 })
  })

  it('returns zeros for an empty range', () => {
    expect(
      getLineWalkSummary({ from: '1999-01-01', to: '1999-12-31' }),
    ).toEqual({ records: 0, people: 0, amount: 0 })
  })
})

describe('getLineWalkOverview', () => {
  it('returns the three windows and sums the buckets', () => {
    seedRows()

    const overview = getLineWalkOverview('2026-11-05')

    expect(overview.day.points).toHaveLength(7)
    expect(overview.month.points).toHaveLength(30)
    expect(overview.year.points).toHaveLength(12)

    expect(
      overview.day.points.find((point) => point.bucket === '2026-11-05'),
    ).toEqual({ bucket: '2026-11-05', people: 3, amount: 40 })
    expect(
      overview.day.points.find((point) => point.bucket === '2026-11-04'),
    ).toEqual({ bucket: '2026-11-04', people: 2, amount: 10 })
    expect(
      overview.day.points.find((point) => point.bucket === '2026-11-03'),
    ).toEqual({ bucket: '2026-11-03', people: 0, amount: 0 })

    expect(
      overview.year.points.find((point) => point.bucket === '2026-11'),
    ).toEqual({ bucket: '2026-11', people: 5, amount: 50 })

    expect(overview.day.summary).toEqual({ records: 2, people: 5, amount: 50 })
    expect(overview.month.summary).toEqual({
      records: 2,
      people: 5,
      amount: 50,
    })
    expect(overview.year.summary).toEqual({
      records: 2,
      people: 5,
      amount: 50,
    })
  })

  it('returns zeros when the window has no records', () => {
    const overview = getLineWalkOverview('2026-11-05')

    expect(overview.day.summary).toEqual({ records: 0, people: 0, amount: 0 })
    expect(overview.year.summary).toEqual({ records: 0, people: 0, amount: 0 })
  })
})
