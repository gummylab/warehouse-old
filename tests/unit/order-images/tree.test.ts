import { describe, expect, it } from 'vitest'

import type { ImageRecord, OrderDetail, OrderItemNode } from '@/lib/db/types'
import {
  insertItemNode,
  reduceImages,
  reduceOrderDetail,
  removeItemNode,
} from '@/lib/order-images/tree'

function image(overrides: Partial<ImageRecord> = {}): ImageRecord {
  return {
    id: 'image-1',
    itemId: 'item-1',
    orderId: 'order-1',
    seq: 1,
    package: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function item(overrides: Partial<OrderItemNode> = {}): OrderItemNode {
  return {
    id: 'item-1',
    orderId: 'order-1',
    parentItemId: null,
    itemNumber: 100,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    images: [],
    children: [],
    ...overrides,
  }
}

function detail(items: OrderItemNode[]): OrderDetail {
  return {
    order: {
      id: 'order-1',
      orderNumber: 'A-1',
      orderDate: '2026-01-01',
      line: 'line-1',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    items,
  }
}

describe('insertItemNode', () => {
  it('adds a top-level item and keeps the list sorted by item number', () => {
    const current = detail([item({ id: 'pack-100', itemNumber: 100 })])

    const next = insertItemNode(
      current,
      item({ id: 'pack-200', itemNumber: 200 }),
    )

    expect(next.items.map((node) => node.itemNumber)).toEqual([100, 200])
  })

  it('adds a variety under its pack', () => {
    const current = detail([item({ id: 'pack-100', itemNumber: 100 })])

    const next = insertItemNode(
      current,
      item({ id: 'variety-110', itemNumber: 110, parentItemId: 'pack-100' }),
    )

    expect(next.items[0]?.children.map((child) => child.itemNumber)).toEqual([110])
  })

  it('leaves the tree unchanged when the parent is not in this order', () => {
    const current = detail([item({ id: 'pack-100', itemNumber: 100 })])

    const next = insertItemNode(
      current,
      item({ id: 'variety-110', itemNumber: 110, parentItemId: 'missing' }),
    )

    expect(next).toEqual(current)
  })
})

describe('removeItemNode', () => {
  it('removes a pack together with its varieties', () => {
    const current = detail([
      item({
        id: 'pack-100',
        itemNumber: 100,
        children: [item({ id: 'variety-110', itemNumber: 110, parentItemId: 'pack-100' })],
      }),
      item({ id: 'pack-200', itemNumber: 200 }),
    ])

    const next = removeItemNode(current, 'pack-100')

    expect(next.items.map((node) => node.id)).toEqual(['pack-200'])
  })

  it('removes one variety and leaves its pack in place', () => {
    const current = detail([
      item({
        id: 'pack-100',
        itemNumber: 100,
        children: [
          item({ id: 'variety-110', itemNumber: 110, parentItemId: 'pack-100' }),
          item({ id: 'variety-120', itemNumber: 120, parentItemId: 'pack-100' }),
        ],
      }),
    ])

    const next = removeItemNode(current, 'variety-110')

    expect(next.items[0]?.id).toBe('pack-100')
    expect(next.items[0]?.children.map((child) => child.id)).toEqual(['variety-120'])
  })

  it('leaves the tree unchanged for an unknown id', () => {
    const current = detail([item({ id: 'pack-100', itemNumber: 100 })])

    expect(removeItemNode(current, 'missing')).toEqual(current)
  })
})

describe('reduceOrderDetail', () => {
  it('dispatches add and remove', () => {
    const added = reduceOrderDetail(detail([]), {
      type: 'add',
      node: item({ id: 'pack-100', itemNumber: 100 }),
    })
    expect(added.items).toHaveLength(1)

    const removed = reduceOrderDetail(added, { type: 'remove', id: 'pack-100' })
    expect(removed.items).toEqual([])
  })
})

describe('reduceImages', () => {
  it('changes the package on the matching image only', () => {
    const images = [image({ id: 'a' }), image({ id: 'b' })]

    const next = reduceImages(images, { type: 'package', id: 'a', package: 'Inner Box' })

    expect(next[0]?.package).toBe('Inner Box')
    expect(next[1]?.package).toBeNull()
  })

  it('replaces an image with the server row', () => {
    const images = [image({ id: 'a', package: null })]

    const next = reduceImages(images, {
      type: 'replace',
      image: image({ id: 'a', package: 'Tray' }),
    })

    expect(next[0]?.package).toBe('Tray')
  })

  it('removes the matching image and keeps the order', () => {
    const images = [image({ id: 'a' }), image({ id: 'b' })]

    const next = reduceImages(images, { type: 'remove', id: 'a' })

    expect(next.map((entry) => entry.id)).toEqual(['b'])
  })
})
