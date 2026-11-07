import { NextResponse } from 'next/server'

import { safeRevalidateTag } from '@/lib/cache/revalidate'
import { findLineWalk, saveLineWalks } from '@/lib/db/line-walks'
import { lineExists } from '@/lib/db/order-images'
import { authenticateOrderImageRequest } from '@/lib/liff/order-session'
import {
  lineWalkLookupSchema,
  lineWalkSaveSchema,
  parseJsonBody,
} from '@/lib/liff/schemas'
import {
  isLineWalkShift,
  lineWalkKey,
  normalizeLineWalkText,
  parseLineWalkEntry,
} from '@/lib/line-walks/validation'
import { isValidCalendarDate } from '@/lib/order-images/validation'

// The line-walk log. The record's identity is the composite key, so a POST is
// an upsert: the same key updates the counts, a new key creates a row. Both
// methods authenticate the caller exactly like the order-image endpoints.

export async function GET(request: Request) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const params = new URL(request.url).searchParams
  const body = lineWalkLookupSchema.safeParse({
    date: params.get('date') ?? '',
    shift: params.get('shift') ?? '',
    line: params.get('line') ?? '',
    brand: params.get('brand') ?? '',
    packStyle: params.get('packStyle') ?? '',
  })
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? 'invalid-query' },
      { status: 400 },
    )
  }

  const { date, shift, line, brand, packStyle } = body.data
  if (!isValidCalendarDate(date) || !isLineWalkShift(shift)) {
    return NextResponse.json({ error: 'invalid-query' }, { status: 400 })
  }

  const normalizedLine = normalizeLineWalkText(line)
  if (!lineExists(normalizedLine)) {
    return NextResponse.json({ error: 'unknown-line' }, { status: 400 })
  }

  const key = lineWalkKey({
    walkDate: date,
    shift,
    line: normalizedLine,
    brand: normalizeLineWalkText(brand),
    packStyle: normalizeLineWalkText(packStyle),
  })
  if (!key) {
    return NextResponse.json({ error: 'invalid-query' }, { status: 400 })
  }

  return NextResponse.json({
    entry:
      findLineWalk({
        walkDate: date,
        shift,
        line: normalizedLine,
        brand: normalizeLineWalkText(brand),
        packStyle: normalizeLineWalkText(packStyle),
      }) ?? null,
  })
}

export async function POST(request: Request) {
  const auth = await authenticateOrderImageRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status })
  }

  const body = await parseJsonBody(request, lineWalkSaveSchema)
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 })
  }

  const entries = []
  const keys = new Set<string>()

  for (const raw of body.data.entries) {
    const parsed = parseLineWalkEntry(raw)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    if (!lineExists(parsed.entry.line)) {
      return NextResponse.json({ error: 'unknown-line' }, { status: 400 })
    }

    const key = lineWalkKey(parsed.entry)
    if (!key || keys.has(key)) {
      return NextResponse.json({ error: 'duplicate-entry' }, { status: 400 })
    }
    keys.add(key)
    entries.push(parsed.entry)
  }

  const saved = saveLineWalks(entries, auth.createdBy)
  safeRevalidateTag('line-walks')
  return NextResponse.json({ entries: saved })
}
