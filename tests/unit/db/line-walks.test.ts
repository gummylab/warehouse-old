import { describe, expect, it } from 'vitest'

import { findLineWalk, saveLineWalks } from '@/lib/db/line-walks'

import { isolateTestData } from '../setup/db'

isolateTestData()

const KEY = {
  walkDate: '2026-11-05',
  shift: 'day' as const,
  line: 'line-a',
  brand: 'brand',
  packStyle: 'box',
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
