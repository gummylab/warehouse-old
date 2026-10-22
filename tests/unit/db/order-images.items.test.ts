import { describe, expect, it } from 'vitest'

import {
  addItem,
  deleteItemCascade,
  findOrCreateOrder,
  getItemDetail,
  getOrderDetail,
  itemExists,
} from '@/lib/db/order-images'

import { isolateTestData } from '../setup/db'

// Item numbering and the item tree. The numbering rules themselves are unit
// tested in tests/unit/order-images/item-number.test.ts; these cases cover
// what the data layer does with them (allocation, guards, nesting).
isolateTestData()

const LINE = 'line-a'
const CREATED_BY = 'U-1'

function newOrder(orderNumber: string) {
  return findOrCreateOrder({
    orderNumber,
    orderDate: '2026-10-19',
    line: LINE,
    createdBy: CREATED_BY,
  })
}

function addTop(orderId: string) {
  const result = addItem(orderId, null, CREATED_BY)
  if (!result.ok) throw new Error(`expected a top-level item, got ${result.error}`)
  return result.item
}

function addVariety(orderId: string, parentItemId: string) {
  const result = addItem(orderId, parentItemId, CREATED_BY)
  if (!result.ok) throw new Error(`expected a variety, got ${result.error}`)
  return result.item
}

describe('addItem: top-level singles', () => {
  it('numbers them 100, 200, 300', () => {
    const order = newOrder('1000')

    expect([addTop(order.id).itemNumber, addTop(order.id).itemNumber, addTop(order.id).itemNumber]).toEqual([
      100, 200, 300,
    ])
  })

  it('ignores varieties when picking the next single', () => {
    const order = newOrder('1100')
    const pack = addTop(order.id)
    addVariety(order.id, pack.id)
    addVariety(order.id, pack.id)

    // Varieties live under their pack; only real singles move the counter.
    expect(addTop(order.id).itemNumber).toBe(200)
  })

  it('records who created the item', () => {
    const order = newOrder('1200')

    expect(addTop(order.id).createdBy).toBe(CREATED_BY)
  })
})

describe('addItem: varieties', () => {
  it('numbers them +10 under their own pack', () => {
    const order = newOrder('1300')
    const first = addTop(order.id)
    const second = addTop(order.id)

    expect(addVariety(order.id, first.id).itemNumber).toBe(110)
    expect(addVariety(order.id, first.id).itemNumber).toBe(120)
    expect(addVariety(order.id, second.id).itemNumber).toBe(210)
  })

  it('refuses a variety under a variety', () => {
    const order = newOrder('1400')
    const variety = addVariety(order.id, addTop(order.id).id)

    expect(addItem(order.id, variety.id, CREATED_BY)).toEqual({
      ok: false,
      error: 'variety-of-variety',
    })
  })

  it('refuses an unknown parent', () => {
    const order = newOrder('1500')

    expect(addItem(order.id, 'no-such-item', CREATED_BY)).toEqual({
      ok: false,
      error: 'parent-missing',
    })
  })

  it('refuses a parent that belongs to another order', () => {
    const orderA = newOrder('1600')
    const orderB = newOrder('1700')
    const foreignItem = addTop(orderA.id)

    // A crafted request must not be able to graft an item onto another
    // order's tree.
    expect(addItem(orderB.id, foreignItem.id, CREATED_BY)).toEqual({
      ok: false,
      error: 'parent-missing',
    })
  })

  it('fills a pack up to nine varieties, then reports it full', () => {
    const order = newOrder('1800')
    const pack = addTop(order.id)

    const numbers = Array.from({ length: 9 }, () => addVariety(order.id, pack.id).itemNumber)

    expect(numbers).toEqual([110, 120, 130, 140, 150, 160, 170, 180, 190])
    expect(addItem(order.id, pack.id, CREATED_BY)).toEqual({ ok: false, error: 'pack-full' })
  })
})

describe('getOrderDetail', () => {
  it('nests varieties under their pack', () => {
    const order = newOrder('1900')
    const pack = addTop(order.id)
    addVariety(order.id, pack.id)
    addVariety(order.id, pack.id)
    addTop(order.id)

    const detail = getOrderDetail(order.id)

    expect(detail?.items.map((node) => node.itemNumber)).toEqual([100, 200])
    expect(detail?.items[0].children.map((node) => node.itemNumber)).toEqual([110, 120])
    expect(detail?.items[1].children).toEqual([])
  })

  it('returns undefined for an unknown order', () => {
    expect(getOrderDetail('no-such-id')).toBeUndefined()
  })
})

describe('getItemDetail', () => {
  it('returns the item together with the order it belongs to', () => {
    const order = newOrder('2000')
    const variety = addVariety(order.id, addTop(order.id).id)

    const detail = getItemDetail(variety.id)

    expect(detail?.order.id).toBe(order.id)
    expect(detail?.item.itemNumber).toBe(110)
    expect(detail?.images).toEqual([])
  })

  it('returns undefined for an unknown item', () => {
    expect(getItemDetail('no-such-id')).toBeUndefined()
  })
})

describe('itemExists', () => {
  it('finds a created item and rejects an unknown id', () => {
    const order = newOrder('2100')
    const item = addTop(order.id)

    expect(itemExists(item.id)).toBe(true)
    expect(itemExists('no-such-id')).toBe(false)
  })
})

describe('deleteItemCascade', () => {
  it('removes a pack together with its varieties', () => {
    const order = newOrder('2200')
    const pack = addTop(order.id)
    const first = addVariety(order.id, pack.id)
    const second = addVariety(order.id, pack.id)

    expect(deleteItemCascade(pack.id)).toBe(true)
    expect(getItemDetail(pack.id)).toBeUndefined()
    expect(getItemDetail(first.id)).toBeUndefined()
    expect(getItemDetail(second.id)).toBeUndefined()
    expect(getOrderDetail(order.id)?.items).toEqual([])
  })

  it('removes a single variety without touching its pack', () => {
    const order = newOrder('2300')
    const pack = addTop(order.id)
    const variety = addVariety(order.id, pack.id)

    expect(deleteItemCascade(variety.id)).toBe(true)

    const detail = getOrderDetail(order.id)
    expect(detail?.items.map((node) => node.itemNumber)).toEqual([100])
    expect(detail?.items[0].children).toEqual([])
  })

  it('reports a miss for an unknown id', () => {
    expect(deleteItemCascade('no-such-id')).toBe(false)
  })
})
