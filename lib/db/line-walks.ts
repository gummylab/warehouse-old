import 'server-only'

import { randomUUID } from 'node:crypto'

import { getDb } from './index'
import type { LineWalkInput, LineWalkRecord, LineWalkShift } from './types'

type LineWalkRow = {
  id: string
  walk_date: string
  shift: string
  line: string
  brand: string
  pack_style: string
  people: number
  amount: number
  created_by: string
  created_at: string
  updated_at: string
}

function toRecord(row: LineWalkRow): LineWalkRecord {
  return {
    id: row.id,
    walkDate: row.walk_date,
    shift: row.shift as LineWalkShift,
    line: row.line,
    brand: row.brand,
    packStyle: row.pack_style,
    people: row.people,
    amount: row.amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// The composite key is the identity. Callers pass trimmed brand and pack style,
// because those are the values the unique index stores.
export function findLineWalk(key: {
  walkDate: string
  shift: LineWalkShift
  line: string
  brand: string
  packStyle: string
}): LineWalkRecord | undefined {
  const row = getDb()
    .prepare(
      `SELECT * FROM line_walks
       WHERE walk_date = ? AND shift = ? AND line = ? AND brand = ? AND pack_style = ?`,
    )
    .get(key.walkDate, key.shift, key.line, key.brand, key.packStyle) as
    | LineWalkRow
    | undefined

  return row ? toRecord(row) : undefined
}

// Upsert a whole batch in one transaction. A row that already exists keeps its
// id, created_by and created_at; only the counts and updated_at move. The
// returned records are re-read so the caller sees the stored values.
export function saveLineWalks(
  entries: LineWalkInput[],
  createdBy: string,
): LineWalkRecord[] {
  const db = getDb()
  const now = new Date().toISOString()

  const upsert = db.prepare(
    `INSERT INTO line_walks
       (id, walk_date, shift, line, brand, pack_style, people, amount,
        created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (walk_date, shift, line, brand, pack_style)
     DO UPDATE SET
       people = excluded.people,
       amount = excluded.amount,
       updated_at = excluded.updated_at`,
  )

  const read = db.prepare(
    `SELECT * FROM line_walks
     WHERE walk_date = ? AND shift = ? AND line = ? AND brand = ? AND pack_style = ?`,
  )

  const run = db.transaction((rows: LineWalkInput[]) =>
    rows.map((entry) => {
      upsert.run(
        randomUUID(),
        entry.walkDate,
        entry.shift,
        entry.line,
        entry.brand,
        entry.packStyle,
        entry.people,
        entry.amount,
        createdBy,
        now,
        now,
      )
      const row = read.get(
        entry.walkDate,
        entry.shift,
        entry.line,
        entry.brand,
        entry.packStyle,
      ) as LineWalkRow
      return toRecord(row)
    }),
  )

  return run(entries)
}
