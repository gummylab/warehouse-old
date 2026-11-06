import 'server-only'

import { randomUUID } from 'node:crypto'

import { fillLineWalkTrend } from '../line-walks/trend'
import { TREND_GRAINS, trendWindow } from '../trend'
import { getDb } from './index'
import { escapeLike } from './sql'
import type {
  LineWalkInput,
  LineWalkListFilters,
  LineWalkListResult,
  LineWalkListRow,
  LineWalkOverview,
  LineWalkPoint,
  LineWalkRecord,
  LineWalkShift,
  LineWalkSummary,
  TrendGrain,
} from './types'

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

type LineWalkListRowSql = LineWalkRow & {
  creator_name: string | null
}

function toListRow(row: LineWalkListRowSql): LineWalkListRow {
  return {
    ...toRecord(row),
    creatorName:
      row.creator_name ??
      (row.created_by === 'local-device' ? 'แอดมิน' : row.created_by),
  }
}

// Shared WHERE for the line-walk list: the table narrows by the day/month/year
// range, line, shift and the brand or pack-style search.
function buildLineWalkWhere(filters: LineWalkListFilters): {
  whereSql: string
  params: (string | number)[]
} {
  const where: string[] = []
  const params: (string | number)[] = []

  if (filters.from) {
    where.push('lw.walk_date >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    where.push('lw.walk_date <= ?')
    params.push(filters.to)
  }
  if (filters.line) {
    where.push('lw.line = ?')
    params.push(filters.line)
  }
  if (filters.shift) {
    where.push('lw.shift = ?')
    params.push(filters.shift)
  }
  if (filters.query) {
    where.push(
      "(lw.brand LIKE ? ESCAPE '\\' OR lw.pack_style LIKE ? ESCAPE '\\')",
    )
    const like = `%${escapeLike(filters.query)}%`
    params.push(like, like)
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  }
}

// The overview KPI and chart read one date window and nothing else: a line,
// shift or search belongs to the table below.
export function getLineWalkSummary(range: {
  from: string
  to: string
}): LineWalkSummary {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS records,
              COALESCE(SUM(people), 0) AS people,
              COALESCE(SUM(amount), 0) AS amount
       FROM line_walks
       WHERE walk_date BETWEEN ? AND ?`,
    )
    .get(range.from, range.to) as LineWalkSummary
}

export function listLineWalks(
  filters: LineWalkListFilters,
): LineWalkListResult {
  const db = getDb()
  const pageSize = Math.max(1, Math.min(100, Math.floor(filters.pageSize)))
  const { whereSql, params } = buildLineWalkWhere(filters)

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS total FROM line_walks lw ${whereSql}`)
      .get(...params) as { total: number }
  ).total

  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0
  const page = Math.min(
    Math.max(1, Math.floor(filters.page)),
    Math.max(1, pageCount),
  )

  const rows = db
    .prepare(
      `SELECT lw.*, u.display_name AS creator_name
       FROM line_walks lw
       LEFT JOIN users u ON u.line_user_id = lw.created_by
       ${whereSql}
       ORDER BY lw.walk_date DESC, lw.updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as LineWalkListRowSql[]

  return { rows: rows.map(toListRow), total, page, pageCount }
}

// A day bucket is the stored date; a year bucket groups the same dates by their
// month prefix, matching the trendWindow buckets.
function getLineWalkPoints(
  grain: TrendGrain,
  from: string,
  to: string,
): LineWalkPoint[] {
  const bucketSql =
    grain === 'year' ? 'substr(walk_date, 1, 7)' : 'walk_date'

  return getDb()
    .prepare(
      `SELECT ${bucketSql} AS bucket,
              COALESCE(SUM(people), 0) AS people,
              COALESCE(SUM(amount), 0) AS amount
       FROM line_walks
       WHERE walk_date BETWEEN ? AND ?
       GROUP BY bucket
       ORDER BY bucket`,
    )
    .all(from, to) as LineWalkPoint[]
}

// The three overview windows in one call, so the switch needs no refetch.
export function getLineWalkOverview(today: string): LineWalkOverview {
  const overview = {} as LineWalkOverview

  for (const grain of TREND_GRAINS) {
    const window = trendWindow(grain, today)
    overview[grain] = {
      points: fillLineWalkTrend(
        window.buckets,
        getLineWalkPoints(grain, window.from, window.to),
      ),
      summary: getLineWalkSummary(window),
    }
  }

  return overview
}
