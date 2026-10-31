import { randomUUID } from 'node:crypto'

// Relative imports, unlike the unit tests: this file is loaded by the
// Playwright test loader rather than by Next or Vite, so it does not resolve
// the "@/*" alias.
//
// A LINE-verified identity cannot be produced from a browser (ADR 0003), so
// the register queue and the cookie cases are set up by writing the same rows
// the LIFF endpoints would write, through the same data layer the server
// uses. The paths those modules read are set by playwright.config.ts before
// any worker starts.
import {
  addItem,
  findOrCreateOrder,
  getImageFile,
  saveImage,
} from '../../../lib/db/order-images'
import type { ImageRecord } from '../../../lib/db/types'
import { approvePendingUser, createPendingUser } from '../../../lib/db/users'

export type SeededUser = {
  id: string
  lineUserId: string
  displayName: string
  status: 'pending' | 'approved'
}

// Names and ids carry a random suffix: the specs share one database, so a row
// created by another spec must never match a locator or a lookup.
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8)
}

export function seedUser({
  status,
  displayName = `E2E User ${uniqueSuffix()}`,
  lineUserId = `U-e2e-${randomUUID()}`,
}: {
  status: 'pending' | 'approved'
  displayName?: string
  lineUserId?: string
}): SeededUser {
  const created = createPendingUser({ lineUserId, displayName })
  if (status === 'approved') {
    // The same write the register screen performs, so the row looks like any
    // other approved user to the server.
    approvePendingUser(created.id, new Date().toISOString())
  }
  return { id: created.id, lineUserId, displayName, status }
}

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

export type SeededOrder = {
  orderId: string
  orderNumber: string
  orderDate: string
  line: string
  packId: string
  varietyId: string
  imageIds: string[]
  storageKeys: string[]
}

// An order as the LIFF form would leave it: one pack, one variety and a
// photo on each, written through the same data layer the server uses. The
// run's database and upload folder are already isolated by the harness.
export function seedOrder({
  orderNumber = `E2E-ORDER-${uniqueSuffix()}`,
  orderDate = '2026-10-19',
  line = 'ดอกแค',
  createdBy = 'local-device',
  imageCount = 2,
}: {
  orderNumber?: string
  orderDate?: string
  line?: string
  createdBy?: string
  imageCount?: number
} = {}): SeededOrder {
  const order = findOrCreateOrder({
    orderNumber,
    orderDate,
    line,
    createdBy,
  })

  const pack = addItem(order.id, null, createdBy)
  if (!pack.ok) throw new Error(`seedOrder: pack failed (${pack.error})`)
  const variety = addItem(order.id, pack.item.id, createdBy)
  if (!variety.ok) throw new Error(`seedOrder: variety failed (${variety.error})`)

  const targets = [pack.item.id, variety.item.id]
  const images: ImageRecord[] = []
  for (let index = 0; index < imageCount; index++) {
    const itemId = targets[index % targets.length]
    images.push(
      saveImage({
        itemId,
        package: null,
        fileName: `e2e-${index + 1}.png`,
        mimeType: 'image/png',
        fileSize: PNG_BYTES.length,
        createdBy,
        buffer: PNG_BYTES,
      }),
    )
  }

  return {
    orderId: order.id,
    orderNumber,
    orderDate,
    line,
    packId: pack.item.id,
    varietyId: variety.item.id,
    imageIds: images.map((image) => image.id),
    storageKeys: images.map(
      (image) => getImageFile(image.id)?.storageKey ?? '',
    ),
  }
}
