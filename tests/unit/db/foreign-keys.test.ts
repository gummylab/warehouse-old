import { describe, expect, it } from 'vitest'

import { getDb } from '@/lib/db'
import { addItem, findOrCreateOrder, saveImage } from '@/lib/db/order-images'

import { isolateTestData } from '../setup/db'

// SQLite leaves foreign key enforcement OFF by default, which would make
// every ON DELETE CASCADE in the schema silently inert: the delete would
// report success while the child rows piled up forever. These cases pin the
// pragmas that prevent that.
isolateTestData()

const LINE = 'line-a'
const CREATED_BY = 'U-1'

function countWhere(table: 'items' | 'images', column: 'order_id', id: string): number {
  return (
    getDb().prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${column} = ?`).get(id) as {
      c: number
    }
  ).c
}

describe('schema pragmas', () => {
  it('enables foreign key enforcement', () => {
    expect(getDb().pragma('foreign_keys')).toEqual([{ foreign_keys: 1 }])
  })

  it('runs in WAL mode so admin reads do not block a write', () => {
    expect(getDb().pragma('journal_mode')).toEqual([{ journal_mode: 'wal' }])
  })

  it('absorbs a short writer window instead of throwing SQLITE_BUSY', () => {
    expect(getDb().pragma('busy_timeout')).toEqual([{ timeout: 5000 }])
  })
})

describe('order delete cascade', () => {
  it('takes the order items and images with it', () => {
    const order = findOrCreateOrder({
      orderNumber: '4000',
      orderDate: '2026-10-19',
      line: LINE,
      createdBy: CREATED_BY,
    })
    const added = addItem(order.id, null, CREATED_BY)
    if (!added.ok) throw new Error(`expected an item, got ${added.error}`)
    saveImage({
      itemId: added.item.id,
      package: null,
      fileName: 'photo.png',
      mimeType: 'image/png',
      fileSize: 8,
      createdBy: CREATED_BY,
      buffer: Buffer.from('89504e47', 'hex'),
      web: Buffer.from('web'),
      thumb: Buffer.from('thumb'),
    })

    expect(countWhere('items', 'order_id', order.id)).toBe(1)
    expect(countWhere('images', 'order_id', order.id)).toBe(1)

    // The app has no delete-order feature yet, so raw SQL is the only way to
    // exercise the constraint the schema declares (ADR 0002, tests only).
    getDb().prepare('DELETE FROM orders WHERE id = ?').run(order.id)

    expect(countWhere('items', 'order_id', order.id)).toBe(0)
    expect(countWhere('images', 'order_id', order.id)).toBe(0)
  })
})
