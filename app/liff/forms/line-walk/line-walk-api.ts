// Thin client for the line-walk endpoints. Same session story as the
// order-image API: the cookie is exchanged once via the LIFF session route,
// and a 401 triggers one renewal and one retry so an expired cookie heals.
import type {
  LineWalkInput,
  LineWalkRecord,
  LineWalkShift,
} from '@/lib/db/types'
import { notifyFormAccessRevoked } from '@/lib/toast'

import { postJson, type LiffToken } from '../../liff-session-context'

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

let sessionToken: LiffToken | null = null

export function setSessionToken(token: LiffToken | null): void {
  sessionToken = token
}

async function exchangeSession(): Promise<boolean> {
  const data = await postJson('/api/liff/order-images/session', sessionToken)
  return data !== null
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response = await fetch(path, init).catch(() => null)
  if (response?.status === 401) {
    if (!(await exchangeSession())) {
      return { ok: false, status: 401, error: 'unauthorized' }
    }
    response = await fetch(path, init).catch(() => null)
  }
  if (!response) return { ok: false, status: 0, error: 'network-error' }

  // Approval passed but the grant is gone: the admin removed this form while
  // the user was on it. Offer the way back; the inline error also says why.
  if (response.status === 403) notifyFormAccessRevoked()

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null
  if (!response.ok || !data) {
    return {
      ok: false,
      status: response.status,
      error: data?.error ?? 'unknown-error',
    }
  }
  return { ok: true, data }
}

export function lookupLineWalk(
  input: {
    walkDate: string
    shift: LineWalkShift
    line: string
    brand: string
    packStyle: string
  },
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    date: input.walkDate,
    shift: input.shift,
    line: input.line,
    brand: input.brand,
    packStyle: input.packStyle,
  })

  return request<{ entry: LineWalkRecord | null }>(
    `/api/liff/line-walks?${params}`,
    { signal },
  )
}

export function saveLineWalks(entries: LineWalkInput[]) {
  return request<{ entries: LineWalkRecord[] }>('/api/liff/line-walks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  })
}

// Error codes the form shows verbatim as Thai copy.
export const ERROR_MESSAGES: Record<string, string> = {
  'network-error': 'การเชื่อมต่อขัดข้อง กรุณาลองใหม่',
  'unknown-error': 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  unauthorized: 'เซสชันหมดอายุ กรุณาเปิดหน้านี้ใหม่',
  'invalid-date': 'วันที่ไม่ถูกต้อง',
  'invalid-shift': 'กะไม่ถูกต้อง',
  'unknown-line': 'ไม่มีไลน์ผลิตนี้',
  'invalid-brand': 'ชื่อแบรนด์ไม่ถูกต้อง',
  'invalid-pack-style': 'Pack style ไม่ถูกต้อง',
  'invalid-people': 'จำนวนคนไม่ถูกต้อง',
  'invalid-amount': 'ยอดสินค้าไม่ถูกต้อง',
  'duplicate-entry': 'มีรายการซ้ำกัน',
  'invalid-entries': 'รายการไม่ถูกต้อง',
}

export function errorMessage(code: string, status = 0): string {
  // A 403 with 'unauthorized' is the grant check, not an expired session.
  if (code === 'unauthorized' && status === 403) {
    return 'คุณไม่มีสิทธิ์ใช้แบบฟอร์มนี้แล้ว'
  }
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES['unknown-error']
}
