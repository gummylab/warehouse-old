// Thin typed client for the order-images endpoints, shared by both form
// steps. All calls rely on the session cookie (same-origin fetch sends it
// automatically); a 401 re-exchanges the token once and retries, so an
// expired cookie mid-session heals instead of dead-ending the form.
// Domain records come from the data layer as type-only imports — erased at
// compile time, so no server code reaches the client bundle.
import type { ImageRecord, ItemDetail, ItemRecord, OrderDetail } from '@/lib/db/types'
import { toastMessages } from '@/lib/messages'
import { notifyError } from '@/lib/toast'

import { postJson, type LiffToken } from '../../liff-session-context'

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

// Set once by the form on mount; used to renew an expired cookie. Module
// state on purpose: every endpoint shares the same single renewal path.
let sessionToken: LiffToken | null = null

export function setSessionToken(token: LiffToken | null): void {
  sessionToken = token
}

// Reuses the shared LIFF POST helper: a null token sends the empty body of
// local-device mode (ADR 0004) and a null result means failure of any kind
// (network, timeout, non-2xx) — postJson already folds those together.
export async function postSession(): Promise<boolean> {
  const data = await postJson('/api/liff/order-images/session', sessionToken)
  return data !== null
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response = await fetch(path, init).catch(() => null)
  if (response?.status === 401) {
    // Expired cookie: one renewal attempt, then a single retry. A failed
    // renewal is a page-wide auth failure, so it gets one shared toast
    // instead of an inline message on whichever card happened to call first.
    const renewed = await postSession()
    if (!renewed) {
      notifyError(toastMessages.sessionUnavailable, {
        id: 'order-image-session',
        description: toastMessages.sessionUnavailableDescription,
      })
      return { ok: false, status: 401, error: 'unauthorized' }
    }
    response = await fetch(path, init).catch(() => null)
  }
  if (!response) return { ok: false, status: 0, error: 'network-error' }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null
  if (!response.ok || !data) {
    return { ok: false, status: response.status, error: data?.error ?? 'unknown-error' }
  }
  return { ok: true, data }
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

export type LookupInput = {
  orderNumber: string
  orderDate: string
  line: string
}

// Finds the order by number+date+line (creating it once). Items are not part
// of step 1 — they come and go in step 2 through the auto-numbered add
// buttons, so the response is the order id only.
export function lookupOrder(input: LookupInput) {
  return request<{ orderId: string }>('/api/liff/order-images/orders', jsonInit('POST', input))
}

export function getOrder(orderId: string) {
  return request<OrderDetail>(`/api/liff/order-images/orders/${orderId}`)
}

export function getItem(itemId: string) {
  return request<ItemDetail>(`/api/liff/order-images/items/${itemId}`)
}

export function addItem(orderId: string, parentItemId: string | null) {
  return request<{ item: ItemRecord }>(`/api/liff/order-images/orders/${orderId}/items`, {
    ...jsonInit('POST', { parentItemId }),
    // The server treats a missing body as "top-level", so an empty POST
    // would also work — the explicit field keeps the intent readable.
  })
}

export function deleteItem(itemId: string) {
  return request<{ ok: true }>(`/api/liff/order-images/items/${itemId}`, {
    method: 'DELETE',
  })
}

// The signal lets the caller abort an upload that is still in flight, for
// example when the upload dialog is closed while a file is on its way.
export function uploadImage(itemId: string, file: File, signal?: AbortSignal) {
  const form = new FormData()
  form.append('file', file)
  return request<{ image: ImageRecord }>(`/api/liff/order-images/items/${itemId}/images`, {
    method: 'POST',
    body: form,
    signal,
  })
}

export function setImagePackage(imageId: string, pkg: string | null) {
  return request<{ image: ImageRecord }>(`/api/liff/order-images/images/${imageId}`, {
    ...jsonInit('PATCH', { package: pkg }),
  })
}

export function deleteImage(imageId: string) {
  return request<{ ok: true }>(`/api/liff/order-images/images/${imageId}`, {
    method: 'DELETE',
  })
}

// Server error codes the form shows verbatim as Thai copy; anything else
// falls back to a generic message.
export const ERROR_MESSAGES: Record<string, string> = {
  'network-error': 'การเชื่อมต่อขัดข้อง กรุณาลองใหม่',
  'unknown-error': 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  'session-failed': 'ไม่สามารถเข้าสู่ระบบได้ กรุณาเปิดหน้านี้ใหม่',
  'line-required': 'กรุณาเลือกไลน์ผลิต',
  'invalid-order-number': 'กรุณากรอกเลขออเดอร์ 9 หลัก',
  'invalid-order-date': 'วันที่ไม่ถูกต้อง',
  'unknown-line': 'ไม่มีไลน์ผลิตนี้',
  'order-not-found': 'ไม่พบออเดอร์นี้',
  'item-not-found': 'ไม่พบไอเท็มนี้',
  'image-not-found': 'ไม่พบรูปภาพนี้',
  'parent-missing': 'ไม่พบไอเท็มต้นทาง',
  'variety-of-variety': 'ไม่สามารถเพิ่มไอเท็มย่อยใต้ไอเท็มย่อยได้',
  'pack-full': 'ไอเท็มย่อยครบแล้ว (สูงสุด 9 รายการ)',
  'invalid-package': 'แพ็กเกจไม่ถูกต้อง',
  'file-missing': 'ไม่พบไฟล์รูปภาพ',
  'file-too-large': 'ไฟล์ใหญ่เกิน 10 MB',
  'unsupported-type': 'รองรับเฉพาะไฟล์ JPG, PNG และ WebP',
}

// Auth failures all arrive as the code 'unauthorized'; the HTTP status is
// what separates them (expired session vs revoked user vs misconfigured
// secret), so the message needs it too.
function authMessage(status: number): string {
  if (status === 403) return 'บัญชีของคุณไม่มีสิทธิ์ใช้งานแบบฟอร์มนี้'
  if (status === 503) return 'ระบบยังตั้งค่าเซสชันไม่เรียบร้อย กรุณาติดต่อผู้ดูแล'
  if (status === 0) return ERROR_MESSAGES['network-error']
  return ERROR_MESSAGES['session-failed']
}

export function errorMessage(code: string, status = 0): string {
  if (code === 'unauthorized') return authMessage(status)
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES['unknown-error']
}
