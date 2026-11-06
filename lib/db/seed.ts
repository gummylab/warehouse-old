// The production line catalog the order-image form's dropdown offers.
//
// The names are carried over from eu-shipment's mock catalog
// (app/mock/data.ts) so the new form starts with the same dropdown.
//
// The seeding lives in its own module because it runs when the database is
// opened (lib/db/index.ts) and the read path must stay write-free: a write
// inside a read would make the catalog uncacheable, and every form page
// load would run a pointless COUNT.

import { sql } from 'drizzle-orm'

import type { Orm } from './index'
import { lines } from './schema'

export const SEED_LINES = [
  'ดอกแค',
  'ดาวเรือง 1',
  'ดาวเรือง 2',
  'ดาวเรือง 3',
  'ดาวเรือง 4',
  'ออฟติมัส 1',
  'ออฟติมัส 2',
  'ทอร์นาโด',
  'ดอกรัก',
  'กุหลาบ',
  'ลิลลี่',
  'ทิวลิป',
  'ซากุระ',
  'ลาเวนเดอร์',
  'มะลิ',
  'บานชื่น',
  'กล้วยไม้ 1',
  'เฟื่องฟ้า',
  'ดาหลา',
  'พวงชมพู',
  'ดอกแก้ว',
  'ดาวเรือง 5',
  'ดาวเรือง 6',
  'ชบาแก้ว',
  'เดซี่',
  'โรส',
  'กล้วยไม้ 2',
]

// The ORM is passed in rather than read from getOrm(): this runs from
// openDatabase(), before the connection is cached, so calling getOrm() here
// would open the file a second time.
//
// Seed only when the catalog is empty: a future admin edit (renamed or
// removed line) must survive restarts, so this never re-inserts over rows.
// onConflictDoNothing is the belt to that braces, in case two processes seed
// at the same moment.
export function seedLines(orm: Orm): void {
  const count =
    orm.select({ count: sql<number>`count(*)` }).from(lines).get()?.count ?? 0
  if (count > 0) return
  orm
    .insert(lines)
    .values(SEED_LINES.map((name) => ({ name })))
    .onConflictDoNothing()
    .run()
}
