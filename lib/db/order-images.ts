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
  OrderListFilters,
  OrderListResult,
  OrderListRow,
  OrderOverview,
  OrderRecord,
  OrderSummary,
  TrendGrain,
  TrendPoint,
} from './types'
import { nextSingleNumber, nextVarietyNumber } from '../order-images/item-number'
import {
  fillTrend,
  TREND_GRAINS,
  trendWindow,
} from '../order-images/trend'
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
  OrderListFilters,
  OrderListResult,
  OrderListRow,
  OrderOverview,
  OrderPeriod,
  OrderRecord,
  OrderSummary,
  TrendGrain,
  TrendPoint,
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

type OrderListRowSql = OrderRow & {
  item_count: number
  creator_name: string | null
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

function toOrderListRow(row: OrderListRowSql): OrderListRow {
  return {
    ...toOrder(row),
    itemCount: row.item_count,
    creatorName:
      row.creator_name ??
      (row.created_by === 'local-device' ? 'เครื่องนี้' : null),
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

// The production line catalog, read by the form's dropdown and by the admin
// order filter. A plain read: the catalog is seeded when the database is
// opened (see lib/db/index.ts) and only an admin edit changes it.
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
// Admin order list
// ---------------------------------------------------------------------------

// Shared WHERE for the admin list: the table narrows by period, line and
// order-number search. The KPI strip does not use it; it follows its own
// day/month/year window (getOrderOverview).
function buildOrderWhere(filters: OrderListFilters): {
  whereSql: string
  params: (string | number)[]
} {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.from) {
    where.push('o.order_date >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    where.push('o.order_date <= ?')
    params.push(filters.to)
  }
  if (filters.line) {
    where.push('o.line = ?')
    params.push(filters.line)
  }
  if (filters.query) {
    // The escape character is a single backslash, written as a JS escape.
    where.push("o.order_number LIKE ? ESCAPE '\\'")
    params.push(`%${escapeLike(filters.query)}%`)
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  }
}

// The KPI strip and the trend chart share one window, so the summary takes
// that range and nothing else. A line or a search term belongs to the table
// below, not to the overview.
export function getOrderSummary(range: {
  from: string
  to: string
}): OrderSummary {
  const row = getDb()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM orders o
            WHERE o.order_date BETWEEN ? AND ?) AS orders,
         (SELECT COUNT(*) FROM items i
            JOIN orders o ON o.id = i.order_id
            WHERE o.order_date BETWEEN ? AND ?) AS items,
         (SELECT COUNT(*) FROM images img
            JOIN orders o ON o.id = img.order_id
            WHERE o.order_date BETWEEN ? AND ?) AS images`,
    )
    .get(
      range.from,
      range.to,
      range.from,
      range.to,
      range.from,
      range.to,
    ) as {
    orders: number
    items: number
    images: number
  }

  return {
    orders: row.orders,
    items: row.items,
    images: row.images,
  }
}

// The daily windows group by the stored date; the year window groups by its
// month prefix. Every grain counts `order_date`, the date the table uses.
function getTrendPoints(
  grain: TrendGrain,
  from: string,
  to: string,
): TrendPoint[] {
  const bucketSql =
    grain === 'year' ? 'substr(o.order_date, 1, 7)' : 'o.order_date'

  return getDb()
    .prepare(
      `SELECT ${bucketSql} AS bucket, COUNT(*) AS count
       FROM orders o
       WHERE o.order_date BETWEEN ? AND ?
       GROUP BY bucket
       ORDER BY bucket`,
    )
    .all(from, to) as TrendPoint[]
}

// Everything the overview needs for all three grains in one call, so the page
// can hand the whole thing to the client and the switch needs no refetch.
export function getOrderOverview(today: string): OrderOverview {
  const overview = {} as OrderOverview

  for (const grain of TREND_GRAINS) {
    const window = trendWindow(grain, today)
    overview[grain] = {
      points: fillTrend(
        window.buckets,
        getTrendPoints(grain, window.from, window.to),
      ),
      summary: getOrderSummary(window),
    }
  }

  return overview
}

// LIKE treats % and _ as wildcards; a user typing them means the literal
// character, so escape them before wrapping the value in %...%.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export function listOrders(filters: OrderListFilters): OrderListResult {
  const db = getDb()
  const pageSize = Math.max(1, Math.min(100, Math.floor(filters.pageSize)))
  const { whereSql, params } = buildOrderWhere(filters)
  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`).get(...params) as {
      total: number
    }
  ).total

  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0
  const page = Math.min(Math.max(1, Math.floor(filters.page)), Math.max(1, pageCount))

  const rows = db
    .prepare(
      `SELECT
         o.id, o.order_number, o.order_date, o.line, o.created_by, o.created_at,
         (SELECT COUNT(*) FROM items i WHERE i.order_id = o.id) AS item_count,
         u.display_name AS creator_name
       FROM orders o
       LEFT JOIN users u ON u.line_user_id = o.created_by
       ${whereSql}
       ORDER BY o.order_date DESC, o.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as OrderListRowSql[]

  return { rows: rows.map(toOrderListRow), total, page, pageCount }
}

// ---------------------------------------------------------------------------
// Orders + items
// ---------------------------------------------------------------------------

function findOrder(
  orderNumber: string,
  orderDate: string,
  line: string,
): OrderRecord | undefined {
  const row = getDb()
    .prepare(
      'SELECT * FROM orders WHERE order_number = ? AND order_date = ? AND line = ?',
    )
    .get(orderNumber, orderDate, line) as OrderRow | undefined
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
// UNIQUE guards on (order_number, order_date, line), (order_id, item_number)
// and (item_id, seq) reject the loser, and re-running the whole transaction
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

// Step 1 of the form: find the order by number+date+line, creating it on
// first sight. The same number and date on another line is a different order,
// so a changed dropdown starts a fresh one instead of rewriting the old row.
// No item logic runs here: items are created exclusively in step 2 through
// addItem's auto-numbering.
export function findOrCreateOrder(input: {
  orderNumber: string
  orderDate: string
  line: string
  createdBy: string
}): OrderRecord {
  const run = getDb().transaction(
    () =>
      findOrder(input.orderNumber, input.orderDate, input.line) ??
      createOrder(input),
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

// Deletes the order; the FK cascade removes its items and image rows. The
// storage keys are read inside the transaction, then the files are unlinked
// after the commit (best effort, same rule as deleteItemCascade).
export function deleteOrderCascade(orderId: string): boolean {
  const db = getDb()
  const run = db.transaction((): { storage_key: string }[] | null => {
    const keys = db
      .prepare('SELECT storage_key FROM images WHERE order_id = ?')
      .all(orderId) as { storage_key: string }[]
    const info = db.prepare('DELETE FROM orders WHERE id = ?').run(orderId)
    return info.changes > 0 ? keys : null
  })

  const keys = run()
  if (!keys) return false
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
