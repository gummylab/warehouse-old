// The production line catalog the order-image form's dropdown offers.
//
// The names are carried over from eu-shipment's mock catalog
// (app/mock/data.ts) so the new form starts with the same dropdown.
//
// The seeding lives in its own module because it runs when the database is
// opened (lib/db/index.ts) and the read path must stay write-free: a write
// inside a read would make the catalog uncacheable, and every form page
// load would run a pointless COUNT.

import type Database from 'better-sqlite3'

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

// Seed only when the catalog is empty: a future admin edit (renamed or
// removed line) must survive restarts, so this never re-inserts over rows.
export function seedLines(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM lines').get() as { c: number }).c
  if (count > 0) return
  const insert = db.prepare('INSERT OR IGNORE INTO lines (name) VALUES (?)')
  for (const name of SEED_LINES) insert.run(name)
}
