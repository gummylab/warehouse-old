// Data layer for the order-image form: lines catalog, orders, items and
// images. Raw SQL + better-sqlite3 like lib/db/users.ts (ADR 0002).
// Image row and file on disk are treated as one unit of storage here: the
// save/delete functions own both, because SQLite transactions in
// better-sqlite3 are synchronous and can therefore wrap sync file IO
// atomically (see saveImage).
import 'server-only'

import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'

import { getDb } from './index'
import type {
  ImageRecord,
  ItemDetail,
  ItemRecord,
  OrderDetail,
  OrderItemNode,
  OrderRecord,
} from './types'
import { nextSingleNumber, nextVarietyNumber } from '../order-images/item-number'
import {
  buildKey,
  ensureDirForFile,
  isInsideRoot,
  removeStoredFile,
  toAbsolute,
} from '../order-images/storage'

// The domain types live in lib/db/types.ts, apart from this module, so the
// client components can import the shapes without importing the database
// driver. They are re-exported here because the data layer is where the
// server code looks for them.
export type {
  ImageRecord,
  ItemDetail,
  ItemRecord,
  OrderDetail,
  OrderItemNode,
  OrderRecord,
} from './types'

// Expected failures of the auto-numbered add; unexpected failures still
// throw and surface as a generic 500.
export type AddItemResult =
  | { ok: true; item: ItemRecord }
  | { ok: false; error: 'parent-missing' | 'variety-of-variety' | 'pack-full' }

type OrderRow = {
  id: string
  order_number: string
  order_date: string
  line: string
  created_by: string
  created_at: string
}

type ItemRow = {
  id: string
  order_id: string
  parent_item_id: string | null
  item_number: number
  created_by: string
  created_at: string
}

type ImageRow = {
  id: string
  item_id: string
  order_id: string
  seq: number
  package: string | null
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  storage_key: string
  created_by: string
  created_at: string
}

function toOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    line: row.line,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function toItem(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    parentItemId: row.parent_item_id,
    itemNumber: row.item_number,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function toImage(row: ImageRow): ImageRecord {
  return {
    id: row.id,
    itemId: row.item_id,
    orderId: row.order_id,
    seq: row.seq,
    package: row.package,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// Lines catalog
// ---------------------------------------------------------------------------

// The production line catalog the form's dropdown offers. A plain read: the
// catalog is seeded when the database is opened (see lib/db/index.ts) and
// only an admin edit changes it.
//
// Not cached with 'use cache'. The read would run during the build and
// bake whatever the build machine's database holds into the static shell,
// and an admin edit to a line name would then need an explicit invalidation
// to show up. The pages that read it are 'instant = false' anyway (the
// LIFF gate withholds their children), so a cached shell would buy nothing.
export function listLines(): string[] {
  const rows = getDb().prepare('SELECT name FROM lines ORDER BY rowid').all() as {
    name: string
  }[]
  return rows.map((row) => row.name)
}

// Sync variant for request validation in route handlers (which are dynamic
// anyway and must not pull in the cacheComponents io()).
export function lineExists(name: string): boolean {
  return (
    getDb().prepare('SELECT 1 FROM lines WHERE name = ?').get(name) !== undefined
  )
}

// ---------------------------------------------------------------------------
// Orders + items
// ---------------------------------------------------------------------------

function findOrder(orderNumber: string, orderDate: string): OrderRecord | undefined {
  const row = getDb()
    .prepare('SELECT * FROM orders WHERE order_number = ? AND order_date = ?')
    .get(orderNumber, orderDate) as OrderRow | undefined
  return row ? toOrder(row) : undefined
}

function createOrder(input: {
  orderNumber: string
  orderDate: string
  line: string
  createdBy: string
}): OrderRecord {
  const order: OrderRecord = {
    id: randomUUID(),
    orderNumber: input.orderNumber,
    orderDate: input.orderDate,
    line: input.line,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  }
  getDb()
    .prepare(
      'INSERT INTO orders (id, order_number, order_date, line, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(order.id, order.orderNumber, order.orderDate, order.line, order.createdBy, order.createdAt)
  return order
}

function getItem(id: string): ItemRecord | undefined {
  const row = getDb().prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow | undefined
  return row ? toItem(row) : undefined
}

function insertItem(input: {
  orderId: string
  itemNumber: number
  parentItemId: string | null
  createdBy: string
}): ItemRecord {
  const item: ItemRecord = {
    id: randomUUID(),
    orderId: input.orderId,
    parentItemId: input.parentItemId,
    itemNumber: input.itemNumber,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  }
  getDb()
    .prepare(
      'INSERT INTO items (id, order_id, parent_item_id, item_number, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(item.id, item.orderId, item.parentItemId, item.itemNumber, item.createdBy, item.createdAt)
  return item
}

// Cross-process insert race (dev + prod server open on the same file): the
// UNIQUE guards on (order_number, order_date), (order_id, item_number) and
// (item_id, seq) reject the loser, and re-running the whole transaction
// re-reads the existing row or the next free number — the same idea as
// eu-shipment's withRetry around Prisma P2002. In-process races cannot
// happen: better-sqlite3 executes transactions synchronously.
function withRetry<T>(fn: () => T): T {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return fn()
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      if (code !== 'SQLITE_CONSTRAINT_UNIQUE' && code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw error
      }
      lastError = error
    }
  }
  throw lastError
}

// Step 1 of the form: find the order by number+date, creating it on first
// sight. An existing order keeps its original line — the line input only
// matters at creation time. No item logic runs here: items are created
// exclusively in step 2 through addItem's auto-numbering.
export function findOrCreateOrder(input: {
  orderNumber: string
  orderDate: string
  line: string
  createdBy: string
}): OrderRecord {
  const run = getDb().transaction(
    () => findOrder(input.orderNumber, input.orderDate) ?? createOrder(input),
  )
  return withRetry(run)
}

// Step 2 "add item" buttons: auto-numbered next single (+100) or next
// variety under a pack (+10, max 9 / +90). The route maps each error code
// to a Thai message; the form pre-disables the buttons from the tree it
// already has, so these are backstops against crafted requests.
export function addItem(
  orderId: string,
  parentItemId: string | null,
  createdBy: string,
): AddItemResult {
  const db = getDb()
  const run = db.transaction((): AddItemResult => {
    if (parentItemId === null) {
      const tops = db
        .prepare('SELECT item_number FROM items WHERE order_id = ? AND parent_item_id IS NULL')
        .all(orderId) as { item_number: number }[]
      return {
        ok: true,
        item: insertItem({
          orderId,
          itemNumber: nextSingleNumber(tops.map((row) => row.item_number)),
          parentItemId: null,
          createdBy,
        }),
      }
    }

    const parent = getItem(parentItemId)
    if (!parent || parent.orderId !== orderId) return { ok: false, error: 'parent-missing' }
    if (parent.parentItemId !== null) return { ok: false, error: 'variety-of-variety' }
    const children = db
      .prepare('SELECT item_number FROM items WHERE parent_item_id = ?')
      .all(parentItemId) as { item_number: number }[]
    const next = nextVarietyNumber(
      parent.itemNumber,
      children.map((row) => row.item_number),
    )
    if (next === null) return { ok: false, error: 'pack-full' }
    return {
      ok: true,
      item: insertItem({ orderId, itemNumber: next, parentItemId, createdBy }),
    }
  })
  return withRetry(run)
}

export function orderExists(id: string): boolean {
  return getDb().prepare('SELECT 1 FROM orders WHERE id = ?').get(id) !== undefined
}

export function getOrderDetail(orderId: string): OrderDetail | undefined {
  const db = getDb()
  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
    | OrderRow
    | undefined
  if (!orderRow) return undefined

  const itemRows = db
    .prepare('SELECT * FROM items WHERE order_id = ? ORDER BY item_number')
    .all(orderId) as ItemRow[]
  const imageRows = db
    .prepare('SELECT * FROM images WHERE order_id = ? ORDER BY seq')
    .all(orderId) as ImageRow[]

  const nodes = new Map(
    itemRows.map((row) => [row.id, { ...toItem(row), images: [], children: [] } as OrderItemNode]),
  )
  const tops: OrderItemNode[] = []
  for (const row of itemRows) {
    const node = nodes.get(row.id)
    if (!node) continue
    const parent = row.parent_item_id ? nodes.get(row.parent_item_id) : undefined
    // An unknown parent id should be impossible (same order + cascade);
    // show the item at top level rather than lose it.
    if (parent) parent.children.push(node)
    else tops.push(node)
  }
  for (const row of imageRows) nodes.get(row.item_id)?.images.push(toImage(row))

  return { order: toOrder(orderRow), items: tops }
}

// Scoped read for the item-images page: the order (for its header and the
// back link), the item itself and its photos in seq order. The client
// refetches this after every mutation on that page.
export function getItemDetail(itemId: string): ItemDetail | undefined {
  const db = getDb()
  const itemRow = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as ItemRow | undefined
  if (!itemRow) return undefined
  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(itemRow.order_id) as
    | OrderRow
    | undefined
  if (!orderRow) return undefined
  const imageRows = db
    .prepare('SELECT * FROM images WHERE item_id = ? ORDER BY seq')
    .all(itemId) as ImageRow[]
  return {
    order: toOrder(orderRow),
    item: toItem(itemRow),
    images: imageRows.map(toImage),
  }
}

export function itemExists(id: string): boolean {
  return getDb().prepare('SELECT 1 FROM items WHERE id = ?').get(id) !== undefined
}

// Deletes the item row; children and image rows follow via ON DELETE
// CASCADE. Files are unlinked afterwards, best effort. The form only ever
// creates one variety level (a variety cannot parent another), so item +
// direct children cover every descendant image.
export function deleteItemCascade(itemId: string): boolean {
  const db = getDb()
  const keys = db
    .prepare(
      "SELECT storage_key FROM images WHERE item_id = ? OR item_id IN (SELECT id FROM items WHERE parent_item_id = ?)",
    )
    .all(itemId, itemId) as { storage_key: string }[]
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(itemId)
  if (info.changes === 0) return false
  for (const row of keys) removeStoredFile(toAbsolute(row.storage_key))
  return true
}

// ---------------------------------------------------------------------------
// Images (row + file together)
// ---------------------------------------------------------------------------

// Allocates the next per-item seq, writes the file and inserts the row in
// one synchronous transaction: a failed write rolls the row back too. In a
// cross-process seq race the orphan file from the losing attempt is the
// accepted cost (withRetry then re-runs with the next seq).
export function saveImage(input: {
  itemId: string
  package: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  createdBy: string
  buffer: Buffer
}): ImageRecord {
  const db = getDb()
  const run = db.transaction((): ImageRecord => {
    const target = db
      .prepare(
        `SELECT i.item_number, o.id AS order_id, o.order_number, o.order_date, o.line
           FROM items i JOIN orders o ON o.id = i.order_id
          WHERE i.id = ?`,
      )
      .get(input.itemId) as
      | {
          item_number: number
          order_id: string
          order_number: string
          order_date: string
          line: string
        }
      | undefined
    if (!target) throw new Error('saveImage: item not found')

    const seq = (
      db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM images WHERE item_id = ?').get(
        input.itemId,
      ) as { next: number }
    ).next
    // The three formats the form accepts; anything else is rejected by the
    // route before reaching here, so the fallback is jpeg (old chat flow).
    const ext =
      input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/webp' ? 'webp' : 'jpg'
    const key = buildKey(
      target.order_date,
      target.order_number,
      target.line,
      target.item_number,
      seq,
      input.package,
      ext,
    )
    const absolute = toAbsolute(key)
    // The write path needs the same guard as the read path: a key that
    // resolves outside the storage root would drop a file anywhere on the
    // disk. buildKey() already makes every segment a plain name, so this is
    // the second line of defence rather than the only one.
    if (!isInsideRoot(absolute)) {
      throw new Error('saveImage: storage key escapes the storage root')
    }
    ensureDirForFile(absolute)
    writeFileSync(absolute, input.buffer)

    const row: ImageRow = {
      id: randomUUID(),
      item_id: input.itemId,
      order_id: target.order_id,
      seq,
      package: input.package,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      storage_key: key,
      created_by: input.createdBy,
      created_at: new Date().toISOString(),
    }
    db.prepare(
      `INSERT INTO images (id, item_id, order_id, seq, package, file_name, mime_type, file_size, storage_key, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      row.id,
      row.item_id,
      row.order_id,
      row.seq,
      row.package,
      row.file_name,
      row.mime_type,
      row.file_size,
      row.storage_key,
      row.created_by,
      row.created_at,
    )
    return toImage(row)
  })
  return withRetry(run)
}

// Minimal shape for the file-serving route. storage_key deliberately stays
// out of ImageRecord so API responses never leak filesystem layout.
export function getImageFile(
  id: string,
): { storageKey: string; mimeType: string | null } | undefined {
  const row = getDb()
    .prepare('SELECT storage_key, mime_type FROM images WHERE id = ?')
    .get(id) as { storage_key: string; mime_type: string | null } | undefined
  return row ? { storageKey: row.storage_key, mimeType: row.mime_type } : undefined
}

export function getImage(id: string): ImageRecord | undefined {
  const row = getDb().prepare('SELECT * FROM images WHERE id = ?').get(id) as ImageRow | undefined
  return row ? toImage(row) : undefined
}

// Row first, file second: the database stays the source of truth and a
// failed unlink only leaves a harmless orphan on disk.
export function deleteImage(id: string): boolean {
  const row = getDb()
    .prepare('SELECT storage_key FROM images WHERE id = ?')
    .get(id) as { storage_key: string } | undefined
  if (!row) return false
  const info = getDb().prepare('DELETE FROM images WHERE id = ?').run(id)
  if (info.changes === 0) return false
  removeStoredFile(toAbsolute(row.storage_key))
  return true
}

export function setImagePackage(id: string, pkg: string | null): boolean {
  const info = getDb().prepare('UPDATE images SET package = ? WHERE id = ?').run(pkg, id)
  return info.changes > 0
}
