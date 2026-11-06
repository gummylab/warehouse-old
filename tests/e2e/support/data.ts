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
import { saveLineWalks } from '../../../lib/db/line-walks'
import {
  addItem,
  findOrCreateOrder,
  getImageFile,
  saveImage,
} from '../../../lib/db/order-images'
import type {
  ImageRecord,
  LineWalkRecord,
  LineWalkShift,
} from '../../../lib/db/types'
import { approvePendingUser, createPendingUser } from '../../../lib/db/users'
import { buildImageVariants } from '../../../lib/order-images/optimize'

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

// Order numbers are nine digits now, so the specs need a unique value in that
// shape. The timestamp gives the first six digits and the random tail keeps
// two specs that start in the same millisecond apart.
export function uniqueOrderNumber(): string {
  const stamp = String(Date.now()).slice(-6)
  const tail = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `${stamp}${tail}`
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
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADklEQVQImWP4DwYMEAoAU7oL9W/sIDEAAAAASUVORK5CYII=',
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
export async function seedOrder({
  orderNumber = uniqueOrderNumber(),
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
} = {}): Promise<SeededOrder> {
  const order = findOrCreateOrder({
    orderNumber,
    orderDate,
    line,
    createdBy,
  })

  // The seed writes rows the way the upload route does, so it builds the two
  // display sizes the same way. Byte-for-byte fixtures would be served as
  // image/webp and fail to render.
  const variants = await buildImageVariants(PNG_BYTES)

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
        web: variants.web,
        thumb: variants.thumb,
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

// A line-walk row written through the data layer, the way the LIFF form saves
// it. The brand gets a random suffix because the specs share one database.
export function seedLineWalk({
  walkDate = '2026-11-05',
  shift = 'day',
  line = 'ดอกแค',
  brand = `E2E Walk ${uniqueSuffix()}`,
  packStyle = 'box',
  people = 5,
  amount = 100,
  createdBy = 'local-device',
}: {
  walkDate?: string
  shift?: LineWalkShift
  line?: string
  brand?: string
  packStyle?: string
  people?: number
  amount?: number
  createdBy?: string
} = {}): LineWalkRecord {
  return saveLineWalks(
    [{ walkDate, shift, line, brand, packStyle, people, amount }],
    createdBy,
  )[0]
}
