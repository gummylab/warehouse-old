// The single source of truth for the database shape.
//
// `drizzle-kit generate` reads this file and writes the SQL under `drizzle/`;
// `lib/db/index.ts` runs those migrations when the file is opened. Changing a
// column or an index here without running the generator leaves the running
// database behind, so the generator is the only supported way to change the
// schema (see docs/adr/0013).
//
// Column names stay snake_case because the SQLite file is inspected by hand
// and by older branches; the TypeScript property names are camelCase.
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core'

// Relative on purpose: `drizzle-kit generate` bundles this file with esbuild,
// which does not apply the `@/` path alias.
import { PACKAGE_OPTIONS } from '../order-images/packages'

// A CHECK constraint cannot take bound parameters, so the package names are
// inlined. PACKAGE_OPTIONS stays the one list the form, the upload validation
// and this constraint read from.
const PACKAGE_SQL_LIST = sql.raw(
  PACKAGE_OPTIONS.map((name) => `'${name}'`).join(', '),
)

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    // 'rejected' is not a stored status: rejecting deletes the row (ADR 0003).
    // The enum option is type-level only; the CHECK below is what the file
    // enforces.
    status: text('status', { enum: ['pending', 'approved'] })
      .notNull()
      .default('pending'),
    requestedAt: text('requested_at').notNull(),
    decidedAt: text('decided_at'),
    lineUserId: text('line_user_id'),
  },
  (table) => [
    index('idx_users_status').on(table.status),
    // One request per LINE user; multiple NULLs stay allowed for rows that
    // predate LIFF identity.
    uniqueIndex('idx_users_line_user_id').on(table.lineUserId),
    check('users_status_check', sql`${table.status} IN ('pending', 'approved')`),
  ],
)

// Catalog of production lines the order-image form's dropdown offers. Seeded
// once when empty, so a future admin edit survives restarts.
export const lines = sqliteTable('lines', {
  name: text('name').primaryKey(),
})

// order_date is the Bangkok calendar date as plain 'YYYY-MM-DD' text: no
// timezone math anywhere downstream (storage key, unique constraint, Thai
// display all reuse the string). created_by stores the LINE user id or
// 'local-device' (ADR 0004) and deliberately has no FK to users: revoking
// deletes the users row (ADR 0003) and order history must survive it.
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull(),
    orderDate: text('order_date').notNull(),
    line: text('line').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    // Order identity = number + date + line: the same printed number can
    // appear on more than one production line on the same day.
    uniqueIndex('idx_orders_number_date_line').on(
      table.orderNumber,
      table.orderDate,
      table.line,
    ),
    index('idx_orders_order_number').on(table.orderNumber),
    index('idx_orders_line').on(table.line),
    // The admin list filters by order_date range and sorts by it.
    index('idx_orders_order_date').on(table.orderDate),
  ],
)

// Items self-reference for varieties (110-190 under parent 100); the database
// allows any depth but the form only ever creates depth 2.
export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // The explicit return type breaks the circular inference a table needs
    // when it references its own column.
    parentItemId: text('parent_item_id').references(
      (): AnySQLiteColumn => items.id,
      { onDelete: 'cascade' },
    ),
    itemNumber: integer('item_number').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_items_order_number').on(table.orderId, table.itemNumber),
    index('idx_items_parent').on(table.parentItemId),
  ],
)

// package stays NULL until someone labels the photo; filenames fall back to
// 'Primary' like the old chat flow did. seq restarts per item.
export const images = sqliteTable(
  'images',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    package: text('package', { enum: PACKAGE_OPTIONS }),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
    storageKey: text('storage_key').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_images_item_seq').on(table.itemId, table.seq),
    index('idx_images_order').on(table.orderId),
    check(
      'images_package_check',
      sql`${table.package} IS NULL OR ${table.package} IN (${PACKAGE_SQL_LIST})`,
    ),
  ],
)

// Line-walk log. The composite key is the record's identity: re-saving the
// same date, shift, line, brand and pack style updates its counts instead of
// creating a second row. lib/line-walks/validation.ts mirrors the shift list.
export const lineWalks = sqliteTable(
  'line_walks',
  {
    id: text('id').primaryKey(),
    walkDate: text('walk_date').notNull(),
    shift: text('shift', { enum: ['day', 'night'] }).notNull(),
    line: text('line').notNull(),
    brand: text('brand').notNull(),
    packStyle: text('pack_style').notNull(),
    people: integer('people').notNull(),
    amount: integer('amount').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_line_walks_key').on(
      table.walkDate,
      table.shift,
      table.line,
      table.brand,
      table.packStyle,
    ),
    index('idx_line_walks_date').on(table.walkDate),
    check('line_walks_shift_check', sql`${table.shift} IN ('day', 'night')`),
    check('line_walks_people_check', sql`${table.people} >= 0`),
    check('line_walks_amount_check', sql`${table.amount} >= 0`),
  ],
)

// Row shapes for the data layer. The public, client-safe shapes stay in
// ./types.ts; these are the ORM's own view of a row.
export type UserRow = typeof users.$inferSelect
export type LineRow = typeof lines.$inferSelect
export type OrderRow = typeof orders.$inferSelect
export type ItemRow = typeof items.$inferSelect
export type ImageRow = typeof images.$inferSelect
export type LineWalkRow = typeof lineWalks.$inferSelect
