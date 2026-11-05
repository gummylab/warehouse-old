import { existsSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  addItem,
  deleteOrderCascade,
  findOrCreateOrder,
  getImageFile,
  getOrderDetail,
  getOrderOverview,
  getOrderSummary,
  listOrders,
  saveImage,
} from '@/lib/db/order-images'
import { toAbsolute } from '@/lib/order-images/storage'

import { isolateTestData } from '../setup/db'

isolateTestData()

const LINE = 'line-a'
const ORDER_DATE = '2026-10-19'
const CREATED_BY = 'U-1'

function newOrder(orderNumber: string, orderDate = ORDER_DATE, createdBy = CREATED_BY) {
  return findOrCreateOrder({
    orderNumber,
    orderDate,
    line: LINE,
    createdBy,
  })
}

function addPack(orderId: string, createdBy = CREATED_BY) {
  const result = addItem(orderId, null, createdBy)
  if (!result.ok) throw new Error(`expected a pack, got ${result.error}`)
  return result.item
}

function addVariety(orderId: string, parentItemId: string, createdBy = CREATED_BY) {
  const result = addItem(orderId, parentItemId, createdBy)
  if (!result.ok) throw new Error(`expected a variety, got ${result.error}`)
  return result.item
}

function upload(itemId: string, size = 4, createdBy = CREATED_BY) {
  const bytes = Buffer.alloc(size, 7)
  return saveImage({
    itemId,
    package: null,
    fileName: 'photo.png',
    mimeType: 'image/png',
    fileSize: bytes.length,
    createdBy,
    buffer: bytes,
  })
}

function filters(overrides: Partial<Parameters<typeof listOrders>[0]> = {}) {
  return {
    period: 'day' as const,
    date: ORDER_DATE,
    // Wide enough for the fixtures; the range-specific tests override it.
    from: '2000-01-01',
    to: '2999-12-31',
    line: null,
    query: null,
    page: 1,
    pageSize: 25,
    ...overrides,
  }
}

describe('getOrderSummary', () => {
  it('counts orders, items and images in the range', () => {
    const order = newOrder('A-1')
    const pack = addPack(order.id)
    const variety = addVariety(order.id, pack.id)
    addPack(order.id)
    upload(pack.id, 4)
    upload(variety.id, 6)

    expect(getOrderSummary({ from: ORDER_DATE, to: ORDER_DATE })).toEqual({
      orders: 1,
      items: 3,
      images: 2,
    })
  })

  it('counts only the orders inside the range', () => {
    const first = newOrder('S-1', '2026-10-19')
    newOrder('S-2', '2026-10-20')
    newOrder('S-3', '2099-01-01')
    const pack = addPack(first.id)
    const variety = addVariety(first.id, pack.id)
    upload(pack.id, 4)
    upload(variety.id, 6)

    expect(getOrderSummary({ from: '2026-10-19', to: '2026-10-19' })).toEqual({
      orders: 1,
      items: 2,
      images: 2,
    })
    expect(getOrderSummary({ from: '2026-10-19', to: '2026-10-20' })).toEqual({
      orders: 2,
      items: 2,
      images: 2,
    })
  })

  it('returns zeros for a range with no orders', () => {
    newOrder('Z-1', '2026-10-19')
    expect(getOrderSummary({ from: '1999-01-01', to: '1999-12-31' })).toEqual({
      orders: 0,
      items: 0,
      images: 0,
    })
  })
})

describe('getOrderOverview', () => {
  it('returns the three windows ending on the given day', () => {
    const overview = getOrderOverview('2026-11-05')

    expect(overview.day.from).toBe('2026-10-07')
    expect(overview.day.to).toBe('2026-11-05')
    expect(overview.day.points).toHaveLength(30)

    expect(overview.month.from).toBe('2025-12-01')
    expect(overview.month.points).toHaveLength(12)

    expect(overview.year.from).toBe('2022-01-01')
    expect(overview.year.points).toHaveLength(5)
  })

  it('counts orders into their bucket and fills quiet days with zero', () => {
    newOrder('T-1', '2026-11-05')
    newOrder('T-2', '2026-11-05')
    newOrder('T-3', '2026-11-03')

    const overview = getOrderOverview('2026-11-05')
    const day = Object.fromEntries(
      overview.day.points.map((point) => [point.bucket, point.count]),
    )

    expect(day['2026-11-05']).toBe(2)
    expect(day['2026-11-03']).toBe(1)
    expect(day['2026-11-04']).toBe(0)
    expect(overview.month.points.at(-1)).toEqual({
      bucket: '2026-11',
      count: 3,
    })
    expect(overview.year.points.at(-1)).toEqual({ bucket: '2026', count: 3 })
  })

  it('summarizes the same range as the points', () => {
    const order = newOrder('U-1', '2026-11-05')
    const pack = addPack(order.id)
    upload(pack.id)

    const overview = getOrderOverview('2026-11-05')

    expect(overview.day.summary).toEqual({ orders: 1, items: 1, images: 1 })
  })

  it('leaves future-dated orders out of every window', () => {
    newOrder('F-1', '2026-11-06')

    const overview = getOrderOverview('2026-11-05')

    expect(overview.day.summary.orders).toBe(0)
    expect(overview.month.summary.orders).toBe(0)
    expect(overview.year.summary.orders).toBe(0)
  })
})

describe('listOrders', () => {
  it('returns the item count and creator for each order', () => {
    const order = newOrder('B-1')
    const pack = addPack(order.id)
    const variety = addVariety(order.id, pack.id)
    upload(pack.id, 4)
    upload(variety.id, 6)

    const result = listOrders(filters())

    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.pageCount).toBe(1)
    expect(result.rows[0]).toMatchObject({
      id: order.id,
      orderNumber: 'B-1',
      itemCount: 2,
      creatorName: null,
    })
  })

  it('labels a local-device creator instead of exposing the raw marker', () => {
    newOrder('B-2', ORDER_DATE, 'local-device')
    expect(listOrders(filters()).rows[0].creatorName).toBe('เครื่องนี้')
  })

  it('filters by order number, line and date range', () => {
    newOrder('C-1')
    newOrder('C-2', '2026-10-20')
    newOrder('D-1', '2026-10-21')

    expect(listOrders(filters({ query: 'C-' })).total).toBe(2)
    expect(listOrders(filters({ from: '2026-10-20', to: '2026-10-20' })).total).toBe(1)
    expect(listOrders(filters({ line: 'no-such-line' })).total).toBe(0)
  })

  it('escapes LIKE wildcards in the query', () => {
    newOrder('E-1')
    expect(listOrders(filters({ query: '%' })).total).toBe(0)
  })

  it('paginates and clamps a page beyond the end', () => {
    newOrder('F-1', '2026-10-19')
    newOrder('F-2', '2026-10-20')
    newOrder('F-3', '2026-10-21')

    const second = listOrders(filters({ page: 2, pageSize: 2 }))
    expect(second.total).toBe(3)
    expect(second.pageCount).toBe(2)
    expect(second.page).toBe(2)
    expect(second.rows).toHaveLength(1)

    const beyond = listOrders(filters({ page: 99, pageSize: 2 }))
    expect(beyond.page).toBe(2)
    expect(beyond.rows).toHaveLength(1)
  })
})

describe('deleteOrderCascade', () => {
  it('removes the order, its rows and every stored file', () => {
    const order = newOrder('H-1')
    const pack = addPack(order.id)
    const variety = addVariety(order.id, pack.id)
    const packImage = upload(pack.id)
    const varietyImage = upload(variety.id)

    const files = [packImage, varietyImage].map((image) =>
      toAbsolute(getImageFile(image.id)?.storageKey ?? ''),
    )
    for (const file of files) expect(existsSync(file)).toBe(true)

    expect(deleteOrderCascade(order.id)).toBe(true)

    expect(getOrderDetail(order.id)).toBeUndefined()
    for (const file of files) expect(existsSync(file)).toBe(false)
    expect(getOrderSummary({ from: ORDER_DATE, to: ORDER_DATE })).toMatchObject({
      orders: 0,
      items: 0,
      images: 0,
    })
  })

  it('reports a miss for an unknown order', () => {
    expect(deleteOrderCascade('no-such-order')).toBe(false)
  })
})
