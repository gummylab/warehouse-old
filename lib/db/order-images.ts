// Data layer for the order-image form: lines catalog, orders, items and
// images (ADR 0013: Drizzle on top of better-sqlite3).
// Image row and file on disk are treated as one unit of storage here: the
// save/delete functions own both, because SQLite transactions in
// better-sqlite3 are synchronous and can therefore wrap sync file IO
// atomically (see saveImage).
import 'server-only'

import { cache } from 'react'
import { unstable_cache, revalidateTag } from 'next/cache'

import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'

import { and, between, eq, inArray, or, sql, type SQL } from 'drizzle-orm'

import { getOrm } from './index'
import { images, items, lines, orders, users } from './schema'
import { escapeLike } from './sql'
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
import type { PackageName } from '../order-images/packages'
import { fillTrend, TREND_GRAINS, trendWindow } from '@/lib/trend'
import {
  buildKey,
  derivativePath,
  ensureDirForFile,
  isInsideRoot,
  originalPath,
  removeStoredFiles,
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

type OrderRows = typeof orders.$inferSelect
type ItemRows = typeof items.$inferSelect
type ImageRows = typeof images.$inferSelect

function toOrder(row: OrderRows): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    orderDate: row.orderDate,
    line: row.line,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

// The admin row: the order plus its item count and the creator's name. A row
// saved on this machine has no users entry, so it falls back to the local
// label instead of showing the raw 'local-device' string.
function toOrderListRow(
  row: OrderRows,
  itemCount: number,
  creatorName: string | null,
): OrderListRow {
  return {
    ...toOrder(row),
    itemCount,
    creatorName:
      creatorName ?? (row.createdBy === 'local-device' ? 'แอดมิน' : null),
  }
}

function toItem(row: ItemRows): ItemRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    parentItemId: row.parentItemId,
    itemNumber: row.itemNumber,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

function toImage(row: ImageRows): ImageRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    orderId: row.orderId,
    seq: row.seq,
    package: row.package,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Lines catalog
// ---------------------------------------------------------------------------

// The production line catalog, read by the form's dropdown and by the admin
// order filter. A plain read: the catalog is seeded when the database is
// opened (see lib/db/index.ts) and only an admin edit changes it.
//
// Ordered by rowid so the list keeps the seeding order; that is the order the
// operator is used to in the dropdown.
//
// Not cached with 'use cache'. The read would run during the build and
// bake whatever the build machine's database holds into the static shell,
// and an admin edit to a line name would then need an explicit invalidation
// to show up. The pages that read it are 'instant = false' anyway (the
// LIFF gate withholds their children), so a cached shell would buy nothing.
function _listLines(): string[] {
  return getOrm()
    .select({ name: lines.name })
    .from(lines)
    .orderBy(sql`rowid`)
    .all()
    .map((row) => row.name)
}

// Sync variant for request validation in route handlers (which are dynamic
// anyway and must not pull in the cacheComponents io()).
export function lineExists(name: string): boolean {
  return (
    getOrm()
      .select({ name: lines.name })
      .from(lines)
      .where(eq(lines.name, name))
      .get() !== undefined
  )
}

// ---------------------------------------------------------------------------
// Admin order list
// ---------------------------------------------------------------------------

// Shared WHERE for the admin list: the table narrows by period, line and
// order-number search. The KPI strip does not use it; it follows its own
// day/month/year window (getOrderOverview).
function buildOrderWhere(filters: OrderListFilters): SQL | undefined {
  const conditions: SQL[] = []

  if (filters.from) {
    conditions.push(sql`${orders.orderDate} >= ${filters.from}`)
  }
  if (filters.to) {
    conditions.push(sql`${orders.orderDate} <= ${filters.to}`)
  }
  if (filters.line) {
    conditions.push(eq(orders.line, filters.line))
  }
  if (filters.query) {
    // The escape character is a single backslash, written as a JS escape.
    const like = `%${escapeLike(filters.query)}%`
    conditions.push(sql`${orders.orderNumber} LIKE ${like} ESCAPE '\\'`)
  }

  return conditions.length ? and(...conditions) : undefined
}

// The KPI strip and the trend chart share one window, so the summary takes
// that range and nothing else. A line or a search term belongs to the table
// below, not to the overview.
//
// Three small counts instead of one statement with three scalar subqueries:
// the queries are readable on their own, and SQLite answers them from the
// same indexes in the same process.
function _getOrderSummary(range: {
  from: string
  to: string
}): OrderSummary {
  const orm = getOrm()
  const window = between(orders.orderDate, range.from, range.to)

  const orderCount =
    orm.select({ count: sql<number>`count(*)` }).from(orders).where(window).get()
      ?.count ?? 0
  const itemCount =
    orm
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .innerJoin(orders, eq(orders.id, items.orderId))
      .where(window)
      .get()?.count ?? 0
  const imageCount =
    orm
      .select({ count: sql<number>`count(*)` })
      .from(images)
      .innerJoin(orders, eq(orders.id, images.orderId))
      .where(window)
      .get()?.count ?? 0

  return { orders: orderCount, items: itemCount, images: imageCount }
}

// The daily windows group by the stored date; the year window groups by its
// month prefix. Every grain counts `order_date`, the date the table uses.
function getTrendPoints(
  grain: TrendGrain,
  from: string,
  to: string,
): TrendPoint[] {
  const bucket =
    grain === 'year'
      ? sql<string>`substr(${orders.orderDate}, 1, 7)`
      : sql<string>`${orders.orderDate}`

  return getOrm()
    .select({
      bucket,
      count: sql<number>`count(distinct ${orders.id})`,
      itemCount: sql<number>`count(${items.id})`,
    })
    .from(orders)
    .leftJoin(items, eq(items.orderId, orders.id))
    .where(between(orders.orderDate, from, to))
    .groupBy(bucket)
    .orderBy(bucket)
    .all()
}

// Everything the overview needs for all three grains in one call, so the page
// can hand the whole thing to the client and the switch needs no refetch.
function _getOrderOverview(today: string): OrderOverview {
  const overview = {} as OrderOverview

  for (const grain of TREND_GRAINS) {
    const window = trendWindow(grain, today)
    overview[grain] = {
      points: fillTrend(
        window.buckets,
        getTrendPoints(grain, window.from, window.to),
      ),
      summary: _getOrderSummary(window),
    }
  }

  return overview
}

function _listOrders(filters: OrderListFilters): OrderListResult {
  const orm = getOrm()
  const pageSize = Math.max(1, Math.min(100, Math.floor(filters.pageSize)))
  const where = buildOrderWhere(filters)

  const total = orm
    .select({ total: sql<number>`count(*)` })
    .from(orders)
    .where(where)
    .get()?.total ?? 0

  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0
  const page = Math.min(
    Math.max(1, Math.floor(filters.page)),
    Math.max(1, pageCount),
  )

  const rows = orm
    .select({
      order: orders,
      // Counting in the same statement avoids one query per row on a page
      // that shows 25 of them.
      itemCount: sql<number>`(SELECT count(*) FROM ${items} WHERE ${items.orderId} = ${orders.id})`,
      creatorName: users.displayName,
    })
    .from(orders)
    .leftJoin(users, eq(users.lineUserId, orders.createdBy))
    .where(where)
    .orderBy(sql`${orders.orderDate} DESC`, sql`${orders.createdAt} DESC`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()

  return {
    rows: rows.map((row) =>
      toOrderListRow(row.order, row.itemCount, row.creatorName),
    ),
    total,
    page,
    pageCount,
  }
}

// ---------------------------------------------------------------------------
// Orders + items
// ---------------------------------------------------------------------------

function findOrder(
  orderNumber: string,
  orderDate: string,
  line: string,
): OrderRecord | undefined {
  const row = getOrm()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, orderNumber),
        eq(orders.orderDate, orderDate),
        eq(orders.line, line),
      ),
    )
    .get()
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
  getOrm()
    .insert(orders)
    .values({
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      line: order.line,
      createdBy: order.createdBy,
      createdAt: order.createdAt,
    })
    .run()
  return order
}

function getItem(id: string): ItemRecord | undefined {
  const row = getOrm().select().from(items).where(eq(items.id, id)).get()
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
  getOrm()
    .insert(items)
    .values({
      id: item.id,
      orderId: item.orderId,
      parentItemId: item.parentItemId,
      itemNumber: item.itemNumber,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
    })
    .run()
  return item
}

// True when the error, or anything it wraps, is a rejected UNIQUE insert.
// Drizzle wraps some failures in a DrizzleQueryError; better-sqlite3 puts the
// SQLite code on the error it throws, so both shapes are checked.
function isUniqueViolation(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = (current as { code?: string }).code
    if (
      code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
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
      if (!isUniqueViolation(error)) throw error
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
  // Fast path: read-only lookup outside a transaction. Most calls find an
  // existing order, so we avoid opening a write transaction (and acquiring
  // the SQLite write lock) on every request. This is the single biggest
  // reduction in write contention under concurrent load.
  const existing = findOrder(input.orderNumber, input.orderDate, input.line)
  if (existing) return existing

  // Slow path: create, guarded by withRetry for cross-process races.
  // Re-check inside the transaction in case another process created it
  // between our read and the write.
  return withRetry(() =>
    getOrm().transaction(() => {
      const found = findOrder(input.orderNumber, input.orderDate, input.line)
      if (found) return found
      return createOrder(input)
    }),
  )
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
  const orm = getOrm()
  // withRetry re-runs the whole transaction, so the callback is built fresh
  // for every attempt instead of capturing variables from a previous run.
  return withRetry(() =>
    orm.transaction((): AddItemResult => {
      if (parentItemId === null) {
        const tops = orm
          .select({ itemNumber: items.itemNumber })
          .from(items)
          .where(and(eq(items.orderId, orderId), sql`${items.parentItemId} IS NULL`))
          .all()
        return {
          ok: true,
          item: insertItem({
            orderId,
            itemNumber: nextSingleNumber(tops.map((row) => row.itemNumber)),
            parentItemId: null,
            createdBy,
          }),
        }
      }

      const parent = getItem(parentItemId)
      if (!parent || parent.orderId !== orderId) {
        return { ok: false, error: 'parent-missing' }
      }
      if (parent.parentItemId !== null) {
        return { ok: false, error: 'variety-of-variety' }
      }
      const children = orm
        .select({ itemNumber: items.itemNumber })
        .from(items)
        .where(eq(items.parentItemId, parentItemId))
        .all()
      const next = nextVarietyNumber(
        parent.itemNumber,
        children.map((row) => row.itemNumber),
      )
      if (next === null) return { ok: false, error: 'pack-full' }
      return {
        ok: true,
        item: insertItem({ orderId, itemNumber: next, parentItemId, createdBy }),
      }
    }),
  )
}

export function orderExists(id: string): boolean {
  return (
    getOrm().select({ id: orders.id }).from(orders).where(eq(orders.id, id)).get() !==
    undefined
  )
}

function _getOrderDetail(orderId: string): OrderDetail | undefined {
  const orm = getOrm()
  const orderRow = orm.select().from(orders).where(eq(orders.id, orderId)).get()
  if (!orderRow) return undefined

  const itemRows = orm
    .select()
    .from(items)
    .where(eq(items.orderId, orderId))
    .orderBy(items.itemNumber)
    .all()
  const imageRows = orm
    .select()
    .from(images)
    .where(eq(images.orderId, orderId))
    .orderBy(images.seq)
    .all()

  const nodes = new Map(
    itemRows.map((row) => [
      row.id,
      { ...toItem(row), images: [], children: [] } as OrderItemNode,
    ]),
  )
  const tops: OrderItemNode[] = []
  for (const row of itemRows) {
    const node = nodes.get(row.id)
    if (!node) continue
    const parent = row.parentItemId ? nodes.get(row.parentItemId) : undefined
    // An unknown parent id should be impossible (same order + cascade);
    // show the item at top level rather than lose it.
    if (parent) parent.children.push(node)
    else tops.push(node)
  }
  for (const row of imageRows) nodes.get(row.itemId)?.images.push(toImage(row))

  return { order: toOrder(orderRow), items: tops }
}

// Scoped read for the item-images page: the order (for its header and the
// back link), the item itself and its photos in seq order. The client
// refetches this after every mutation on that page.
function _getItemDetail(itemId: string): ItemDetail | undefined {
  const orm = getOrm()
  const itemRow = orm.select().from(items).where(eq(items.id, itemId)).get()
  if (!itemRow) return undefined
  const orderRow = orm.select().from(orders).where(eq(orders.id, itemRow.orderId)).get()
  if (!orderRow) return undefined
  const imageRows = orm
    .select()
    .from(images)
    .where(eq(images.itemId, itemId))
    .orderBy(images.seq)
    .all()
  return {
    order: toOrder(orderRow),
    item: toItem(itemRow),
    images: imageRows.map(toImage),
  }
}

export function itemExists(id: string): boolean {
  return (
    getOrm().select({ id: items.id }).from(items).where(eq(items.id, id)).get() !==
    undefined
  )
}

// Deletes the item row; children and image rows follow via ON DELETE
// CASCADE. Files are unlinked afterwards, best effort. The form only ever
// creates one variety level (a variety cannot parent another), so item +
// direct children cover every descendant image.
export function deleteItemCascade(itemId: string): boolean {
  const orm = getOrm()
  const children = orm
    .select({ id: items.id })
    .from(items)
    .where(eq(items.parentItemId, itemId))
  const keys = orm
    .select({ storageKey: images.storageKey })
    .from(images)
    .where(or(eq(images.itemId, itemId), inArray(images.itemId, children)))
    .all()
  const result = orm.delete(items).where(eq(items.id, itemId)).run()
  if (result.changes === 0) return false
  for (const row of keys) removeStoredFiles(row.storageKey)
  return true
}

// Deletes the order; the FK cascade removes its items and image rows. The
// storage keys are read inside the transaction, then the files are unlinked
// after the commit (best effort, same rule as deleteItemCascade).
export function deleteOrderCascade(orderId: string): boolean {
  const orm = getOrm()
  const keys = orm.transaction((): string[] | null => {
    const rows = orm
      .select({ storageKey: images.storageKey })
      .from(images)
      .where(eq(images.orderId, orderId))
      .all()
    const result = orm.delete(orders).where(eq(orders.id, orderId)).run()
    return result.changes > 0 ? rows.map((row) => row.storageKey) : null
  })

  if (!keys) return false
  for (const key of keys) removeStoredFiles(key)
  return true
}

// ---------------------------------------------------------------------------
// Images (row + file together)
// ---------------------------------------------------------------------------

// Allocates the next per-item seq, writes the three files and inserts the row
// in one synchronous transaction: a failed write rolls the row back too. In a
// cross-process seq race the orphan files from the losing attempt are the
// accepted cost (withRetry then re-runs with the next seq).
//
// The derivatives are built before this call, outside the transaction: sharp
// is async and awaiting it here would break the "all file work inside one
// synchronous transaction" rule this module has always kept.
export function saveImage(input: {
  itemId: string
  package: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  createdBy: string
  buffer: Buffer
  web: Buffer
  thumb: Buffer
}): ImageRecord {
  const orm = getOrm()
  // Rebuilt per attempt: withRetry re-runs the transaction after a lost
  // cross-process race, and a retry must re-read the seq it lost.
  return withRetry(() =>
    orm.transaction((): ImageRecord => {
      const target = orm
        .select({
          itemNumber: items.itemNumber,
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderDate: orders.orderDate,
          line: orders.line,
        })
        .from(items)
        .innerJoin(orders, eq(orders.id, items.orderId))
        .where(eq(items.id, input.itemId))
        .get()
      if (!target) throw new Error('saveImage: item not found')

      const seq =
        orm
          .select({ next: sql<number>`coalesce(max(${images.seq}), 0) + 1` })
          .from(images)
          .where(eq(images.itemId, input.itemId))
          .get()?.next ?? 1
      // The three formats the form accepts; anything else is rejected by the
      // route before reaching here, so the fallback is jpeg (old chat flow).
      const ext =
        input.mimeType === 'image/png'
          ? 'png'
          : input.mimeType === 'image/webp'
            ? 'webp'
            : 'jpg'
      const key = buildKey(
        target.orderDate,
        target.orderNumber,
        target.line,
        target.itemNumber,
        seq,
        input.package,
        ext,
      )
      const original = originalPath(key)
      // The write path needs the same guard as the read path: a key that
      // resolves outside the storage root would drop a file anywhere on the
      // disk. buildKey() already makes every segment a plain name, so this is
      // the second line of defence rather than the only one.
      if (!isInsideRoot(original)) {
        throw new Error('saveImage: storage key escapes the storage root')
      }
      ensureDirForFile(original)
      writeFileSync(original, input.buffer)

      const web = derivativePath(key, 'web')
      const thumb = derivativePath(key, 'thumb')
      ensureDirForFile(web)
      ensureDirForFile(thumb)
      writeFileSync(web, input.web)
      writeFileSync(thumb, input.thumb)

      const row = {
        id: randomUUID(),
        itemId: input.itemId,
        orderId: target.orderId,
        seq,
        // The route validated the package against PACKAGE_OPTIONS; the cast is
        // only here because the column type is the narrower enum.
        package: input.package as PackageName | null,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey: key,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
      }
      orm.insert(images).values(row).run()
      return toImage(row)
    }),
  )
}

// saveImageOriginal: saves only the original file + creates the DB record.
// Variants (web/thumb) are written later via writeImageVariants (deferred via
// `after()`), so the upload response is not blocked by sharp.
// Returns the image record and the storage key so the caller can schedule
// variant generation after the response.
export function saveImageOriginal(input: {
  itemId: string
  package: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  createdBy: string
  buffer: Buffer
}): { image: ImageRecord; key: string } {
  const orm = getOrm()
  return withRetry(() => {
    const result = orm.transaction((): { image: ImageRecord; key: string } => {
      const target = orm
        .select({
          itemNumber: items.itemNumber,
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderDate: orders.orderDate,
          line: orders.line,
        })
        .from(items)
        .innerJoin(orders, eq(orders.id, items.orderId))
        .where(eq(items.id, input.itemId))
        .get()
      if (!target) throw new Error('saveImageOriginal: item not found')

      const seq =
        orm
          .select({ next: sql<number>`coalesce(max(${images.seq}), 0) + 1` })
          .from(images)
          .where(eq(images.itemId, input.itemId))
          .get()?.next ?? 1
      const ext =
        input.mimeType === 'image/png'
          ? 'png'
          : input.mimeType === 'image/webp'
            ? 'webp'
            : 'jpg'
      const key = buildKey(
        target.orderDate,
        target.orderNumber,
        target.line,
        target.itemNumber,
        seq,
        input.package,
        ext,
      )
      const original = originalPath(key)
      if (!isInsideRoot(original)) {
        throw new Error('saveImageOriginal: storage key escapes the storage root')
      }
      ensureDirForFile(original)
      writeFileSync(original, input.buffer)

      const row = {
        id: randomUUID(),
        itemId: input.itemId,
        orderId: target.orderId,
        seq,
        package: input.package as PackageName | null,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey: key,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
      }
      orm.insert(images).values(row).run()
      return { image: toImage(row), key }
    })
    return result
  })
}

// Write the web/thumb derivative files for a previously saved image.
// Called from `after()` so the upload response is not blocked by sharp.
export function writeImageVariants(key: string, web: Buffer, thumb: Buffer): void {
  const webPath = derivativePath(key, 'web')
  const thumbPath = derivativePath(key, 'thumb')
  if (!isInsideRoot(webPath) || !isInsideRoot(thumbPath)) {
    throw new Error('writeImageVariants: storage key escapes the storage root')
  }
  ensureDirForFile(webPath)
  ensureDirForFile(thumbPath)
  writeFileSync(webPath, web)
  writeFileSync(thumbPath, thumb)
}

// Minimal shape for the file-serving route. storage_key deliberately stays
// out of ImageRecord so API responses never leak filesystem layout.
function _getImageFile(
  id: string,
): { storageKey: string; mimeType: string | null } | undefined {
  const row = getOrm()
    .select({ storageKey: images.storageKey, mimeType: images.mimeType })
    .from(images)
    .where(eq(images.id, id))
    .get()
  return row ?? undefined
}

function _getImage(id: string): ImageRecord | undefined {
  const row = getOrm().select().from(images).where(eq(images.id, id)).get()
  return row ? toImage(row) : undefined
}

// Row first, file second: the database stays the source of truth and a
// failed unlink only leaves a harmless orphan on disk.
export function deleteImage(id: string): boolean {
  const orm = getOrm()
  const row = orm
    .select({ storageKey: images.storageKey })
    .from(images)
    .where(eq(images.id, id))
    .get()
  if (!row) return false
  const result = orm.delete(images).where(eq(images.id, id)).run()
  if (result.changes === 0) return false
  removeStoredFiles(row.storageKey)
  return true
}

export function setImagePackage(id: string, pkg: string | null): boolean {
  // Same cast as saveImage: the caller (a route handler) validated the value
  // against PACKAGE_OPTIONS before it got here.
  const result = getOrm()
    .update(images)
    .set({ package: pkg as PackageName | null })
    .where(eq(images.id, id))
    .run()
  return result.changes > 0
}

// React cache() wrappers (within-request dedup).
export const listLines = cache(_listLines)
export const getOrderSummary = cache(_getOrderSummary)
export const getOrderOverview = cache(_getOrderOverview)

// Cross-request cache for the dashboard overview (60s revalidation).
// Every write expires the tag immediately (safeRevalidateTag), so the first
// read after a mutation recomputes instead of serving the old numbers.
export const getCachedOrderOverview = unstable_cache(
  async (today: string) => _getOrderOverview(today),
  ['order-overview'],
  { revalidate: 60, tags: ['orders'] },
)
export const listOrders = cache(_listOrders)
export const getOrderDetail = cache(_getOrderDetail)
export const getItemDetail = cache(_getItemDetail)
export const getImage = cache(_getImage)
export const getImageFile = cache(_getImageFile)
