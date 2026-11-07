import 'server-only'

import { cache } from 'react'
import { unstable_cache, revalidateTag } from 'next/cache'

import { randomUUID } from 'node:crypto'

import { and, between, eq, sql, type SQL } from 'drizzle-orm'

import { fillLineWalkTrend } from '../line-walks/trend'
import { TREND_GRAINS, trendWindow } from '../trend'
import { getOrm } from './index'
import { lineWalks, users } from './schema'
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

// The stored row in the client-facing shape. created_by stays out: the list
// resolves it to a display name instead.
function toRecord(row: typeof lineWalks.$inferSelect): LineWalkRecord {
  return {
    id: row.id,
    walkDate: row.walkDate,
    shift: row.shift,
    line: row.line,
    brand: row.brand,
    packStyle: row.packStyle,
    people: row.people,
    amount: row.amount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// The composite key as a WHERE clause. Used by both the lookup and the
// upsert's re-read, so the two can never drift apart.
function keyMatch(key: {
  walkDate: string
  shift: LineWalkShift
  line: string
  brand: string
  packStyle: string
}): SQL {
  return and(
    eq(lineWalks.walkDate, key.walkDate),
    eq(lineWalks.shift, key.shift),
    eq(lineWalks.line, key.line),
    eq(lineWalks.brand, key.brand),
    eq(lineWalks.packStyle, key.packStyle),
  )!
}

// The composite key is the identity. Callers pass trimmed brand and pack style,
// because those are the values the unique index stores.
function _findLineWalk(key: {
  walkDate: string
  shift: LineWalkShift
  line: string
  brand: string
  packStyle: string
}): LineWalkRecord | undefined {
  const row = getOrm()
    .select()
    .from(lineWalks)
    .where(keyMatch(key))
    .get()
  return row ? toRecord(row) : undefined
}

// Upsert a whole batch in one transaction. A row that already exists keeps its
// id, created_by and created_at; only the counts and updated_at move. The
// returned records are re-read so the caller sees the stored values.
//
// The callback stays synchronous: better-sqlite3's transaction commits only
// after the callback returns, and nothing here waits on IO.
export function saveLineWalks(
  entries: LineWalkInput[],
  createdBy: string,
): LineWalkRecord[] {
  const orm = getOrm()
  const now = new Date().toISOString()

  return orm.transaction((tx) =>
    entries.map((entry) => {
      tx.insert(lineWalks)
        .values({
          id: randomUUID(),
          walkDate: entry.walkDate,
          shift: entry.shift,
          line: entry.line,
          brand: entry.brand,
          packStyle: entry.packStyle,
          people: entry.people,
          amount: entry.amount,
          createdBy,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            lineWalks.walkDate,
            lineWalks.shift,
            lineWalks.line,
            lineWalks.brand,
            lineWalks.packStyle,
          ],
          // Only the counts and the stamp move: id, created_by and created_at
          // belong to the first save of that key.
          set: {
            people: entry.people,
            amount: entry.amount,
            updatedAt: now,
          },
        })
        .run()

      const row = tx.select().from(lineWalks).where(keyMatch(entry)).get()
      // The row was just written in this transaction, so a miss means the
      // database is broken, not that the caller asked for nothing.
      if (!row) {
        throw new Error('line walk disappeared right after the upsert')
      }
      return toRecord(row)
    }),
  )
}

// The admin list row: the record plus the creator's display name. A row saved
// on this machine has no users entry, so it falls back to the local label.
function toListRow(
  row: typeof lineWalks.$inferSelect,
  creatorName: string | null,
): LineWalkListRow {
  return {
    ...toRecord(row),
    creatorName:
      creatorName ??
      (row.createdBy === 'local-device' ? 'แอดมิน' : row.createdBy),
  }
}

// The table narrows by the day/month/year range, line, shift and the brand or
// pack-style search. An empty list means "no filter", which Drizzle reads as
// an undefined WHERE.
function buildLineWalkWhere(
  filters: LineWalkListFilters,
): SQL | undefined {
  const conditions: SQL[] = []

  if (filters.from) {
    conditions.push(sql`${lineWalks.walkDate} >= ${filters.from}`)
  }
  if (filters.to) {
    conditions.push(sql`${lineWalks.walkDate} <= ${filters.to}`)
  }
  if (filters.line) {
    conditions.push(eq(lineWalks.line, filters.line))
  }
  if (filters.shift) {
    conditions.push(eq(lineWalks.shift, filters.shift))
  }
  if (filters.query) {
    // LIKE treats % and _ as wildcards; escapeLike made them literal, and the
    // ESCAPE clause is what makes the backslash count as the escape character.
    const like = `%${escapeLike(filters.query)}%`
    conditions.push(
      sql`(${lineWalks.brand} LIKE ${like} ESCAPE '\\' OR ${lineWalks.packStyle} LIKE ${like} ESCAPE '\\')`,
    )
  }

  return conditions.length ? and(...conditions) : undefined
}

// The overview KPI and chart read one date window and nothing else: a line,
// shift or search belongs to the table below.
function _getLineWalkSummary(range: {
  from: string
  to: string
}): LineWalkSummary {
  const row = getOrm()
    .select({
      records: sql<number>`count(*)`,
      people: sql<number>`coalesce(sum(${lineWalks.people}), 0)`,
      amount: sql<number>`coalesce(sum(${lineWalks.amount}), 0)`,
    })
    .from(lineWalks)
    .where(between(lineWalks.walkDate, range.from, range.to))
    .get()

  // An aggregate over zero rows still returns one row, so undefined only
  // happens if the query itself is wrong.
  return row ?? { records: 0, people: 0, amount: 0 }
}

function _listLineWalks(
  filters: LineWalkListFilters,
): LineWalkListResult {
  const orm = getOrm()
  const pageSize = Math.max(1, Math.min(100, Math.floor(filters.pageSize)))
  const where = buildLineWalkWhere(filters)

  const total = orm
    .select({ total: sql<number>`count(*)` })
    .from(lineWalks)
    .where(where)
    .get()?.total ?? 0

  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0
  const page = Math.min(
    Math.max(1, Math.floor(filters.page)),
    Math.max(1, pageCount),
  )

  const rows = orm
    .select({
      record: lineWalks,
      // NULL for a row the local device saved: created_by holds a LINE id only
      // when a LINE user wrote it (ADR 0004).
      creatorName: users.displayName,
    })
    .from(lineWalks)
    .leftJoin(users, eq(users.lineUserId, lineWalks.createdBy))
    .where(where)
    .orderBy(sql`${lineWalks.walkDate} DESC`, sql`${lineWalks.updatedAt} DESC`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()

  return {
    rows: rows.map((row) => toListRow(row.record, row.creatorName)),
    total,
    page,
    pageCount,
  }
}

// A day bucket is the stored date; a year bucket groups the same dates by their
// month prefix, matching the trendWindow buckets.
function getLineWalkPoints(
  grain: TrendGrain,
  from: string,
  to: string,
): LineWalkPoint[] {
  const bucket =
    grain === 'year'
      ? sql<string>`substr(${lineWalks.walkDate}, 1, 7)`
      : sql<string>`${lineWalks.walkDate}`

  return getOrm()
    .select({
      bucket,
      people: sql<number>`coalesce(sum(${lineWalks.people}), 0)`,
      amount: sql<number>`coalesce(sum(${lineWalks.amount}), 0)`,
    })
    .from(lineWalks)
    .where(between(lineWalks.walkDate, from, to))
    .groupBy(bucket)
    .orderBy(bucket)
    .all()
}

// The three overview windows in one call, so the switch needs no refetch.
function _getLineWalkOverview(today: string): LineWalkOverview {
  const overview = {} as LineWalkOverview

  for (const grain of TREND_GRAINS) {
    const window = trendWindow(grain, today)
    overview[grain] = {
      points: fillLineWalkTrend(
        window.buckets,
        getLineWalkPoints(grain, window.from, window.to),
      ),
      summary: _getLineWalkSummary(window),
    }
  }

  return overview
}

// React cache() wrappers (within-request dedup).
export const findLineWalk = cache(_findLineWalk)
export const getLineWalkSummary = cache(_getLineWalkSummary)
export const listLineWalks = cache(_listLineWalks)
export const getLineWalkOverview = cache(_getLineWalkOverview)

// Cross-request cache for the line-walk overview (60s revalidation).
export const getCachedLineWalkOverview = unstable_cache(
  async (today: string) => _getLineWalkOverview(today),
  ['line-walk-overview'],
  { revalidate: 60, tags: ['line-walks'] },
)
