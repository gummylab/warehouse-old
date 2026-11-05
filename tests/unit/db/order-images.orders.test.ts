import { describe, expect, it } from 'vitest'

import { getDb } from '@/lib/db'
import {
  findOrCreateOrder,
  lineExists,
  listLines,
  orderExists,
} from '@/lib/db/order-images'

import { isolateTestData } from '../setup/db'

// Lines catalog and orders. Order identity is the
// (order_number, order_date, line) triple, which is also the unique index, so
// most of these cases are about what happens on the second visit to the same
// order.
isolateTestData()

const LINE = 'line-a'
const OTHER_LINE = 'line-b'

function countRows(table: 'lines' | 'orders'): number {
  return (getDb().prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c
}

describe('lines catalog', () => {
  it('seeds the eu-shipment catalog when the database is opened', () => {
    // The seeding happens at open time (lib/db/index.ts), not on read: a
    // write inside a read path would make the catalog uncacheable.
    const lines = listLines()

    expect(lines).toHaveLength(27)
    expect(new Set(lines).size).toBe(lines.length)
  })

  it('seeds before any read happens, so lineExists works on the first call', () => {
    // lineExists is the validation path the order route uses; it must not
    // depend on the list having been read first.
    expect(lineExists('definitely-not-a-line')).toBe(false)
    expect(countRows('lines')).toBe(27)
  })

  it('does not re-seed over an existing catalog', () => {
    listLines()
    listLines()

    expect(countRows('lines')).toBe(27)
  })

  it('rejects an empty line name', () => {
    expect(lineExists('')).toBe(false)
  })
})

describe('findOrCreateOrder', () => {
  it('creates the order on first sight with the LINE identity recorded', () => {
    const order = findOrCreateOrder({
      orderNumber: '1234',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: 'U-1',
    })

    expect(order.orderNumber).toBe('1234')
    expect(order.orderDate).toBe('2026-10-19')
    expect(order.line).toBe(LINE)
    expect(order.createdBy).toBe('U-1')
    expect(Number.isNaN(Date.parse(order.createdAt))).toBe(false)
  })

  it('returns the existing order instead of creating a second one', () => {
    const first = findOrCreateOrder({
      orderNumber: '2000',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: 'U-1',
    })
    const second = findOrCreateOrder({
      orderNumber: '2000',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: 'U-2',
    })

    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    expect(countRows('orders')).toBe(1)
  })

  it('creates a separate order when the same number and date use another line', () => {
    const first = findOrCreateOrder({
      orderNumber: '3000',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: 'U-1',
    })
    const second = findOrCreateOrder({
      orderNumber: '3000',
      orderDate: '2026-10-19',
      line: OTHER_LINE,
      createdBy: 'U-1',
    })

    // The line is part of the identity, so the same printed number on another
    // production line is its own order with its own items and photos.
    expect(second.id).not.toBe(first.id)
    expect(second.line).toBe(OTHER_LINE)
    expect(countRows('orders')).toBe(2)
  })

  it('treats the same number on another date as another order', () => {
    const monday = findOrCreateOrder({
      orderNumber: '4000',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: 'U-1',
    })
    const tuesday = findOrCreateOrder({
      orderNumber: '4000',
      orderDate: '2026-10-20',
      line: LINE,
      createdBy: 'U-1',
    })

    expect(tuesday.id).not.toBe(monday.id)
    expect(countRows('orders')).toBe(2)
  })
})

describe('orderExists', () => {
  it('finds a created order and rejects an unknown id', () => {
    const order = findOrCreateOrder({
      orderNumber: '5000',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: 'U-1',
    })

    expect(orderExists(order.id)).toBe(true)
    expect(orderExists('no-such-id')).toBe(false)
  })
})
