import { connection } from 'next/server'
import { NextResponse } from 'next/server'

import { getDb } from '@/lib/db'

export async function GET() {
  await connection()

  const mem = process.memoryUsage()
  const uptime = process.uptime()

  let dbStatus: { ok: boolean; tables?: Record<string, number>; error?: string } = { ok: false }
  try {
    const db = getDb()
    const tables = ['orders', 'items', 'images', 'lines', 'users', 'line_walks']
    const counts: Record<string, number> = {}
    for (const t of tables) {
      try {
        counts[t] = (db.prepare(`SELECT count(*) AS c FROM ${t}`).get() as { c: number }).c
      } catch {
        counts[t] = -1
      }
    }
    dbStatus = { ok: true, tables: counts }
  } catch (error) {
    dbStatus = { ok: false, error: String(error) }
  }

  return NextResponse.json({
    status: dbStatus.ok ? 'ok' : 'degraded',
    uptime: Math.round(uptime),
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
    },
    db: dbStatus,
    timestamp: new Date().toISOString(),
  })
}

