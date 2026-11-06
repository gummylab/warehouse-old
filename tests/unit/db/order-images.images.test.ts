import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  addItem,
  deleteImage,
  deleteItemCascade,
  findOrCreateOrder,
  getImage,
  getImageFile,
  saveImage,
  setImagePackage,
} from '@/lib/db/order-images'
import { buildKey, derivativePath, originalPath } from '@/lib/order-images/storage'

import { isolateTestData } from '../setup/db'

// Image rows and their files are one unit of storage: these cases check that
// the row, the bytes on disk and the storage key never disagree, and that a
// delete takes both with it.
isolateTestData()

const LINE = 'line-a'
const ORDER_DATE = '2026-10-19'
const CREATED_BY = 'U-1'

// Arbitrary bytes on purpose: nothing in the server decodes bytes here, so the
// tests only need to recognise their own payload. The two derivative buffers
// are distinct so a test can prove the right one landed in the right folder.
const BYTES = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const WEB_BYTES = Buffer.from('web-derivative')
const THUMB_BYTES = Buffer.from('thumb-derivative')

function newOrder(orderNumber: string) {
  return findOrCreateOrder({ orderNumber, orderDate: ORDER_DATE, line: LINE, createdBy: CREATED_BY })
}

function addTop(orderId: string) {
  const result = addItem(orderId, null, CREATED_BY)
  if (!result.ok) throw new Error(`expected a top-level item, got ${result.error}`)
  return result.item
}

function addVariety(orderId: string, parentItemId: string) {
  const result = addItem(orderId, parentItemId, CREATED_BY)
  if (!result.ok) throw new Error(`expected a variety, got ${result.error}`)
  return result.item
}

function upload(itemId: string, options: { mimeType?: string | null; bytes?: Buffer } = {}) {
  const bytes = options.bytes ?? BYTES
  return saveImage({
    itemId,
    // The upload route always stores NULL here; the label comes later.
    package: null,
    fileName: 'photo.png',
    mimeType: options.mimeType === undefined ? 'image/png' : options.mimeType,
    fileSize: bytes.length,
    createdBy: CREATED_BY,
    buffer: bytes,
    web: WEB_BYTES,
    thumb: THUMB_BYTES,
  })
}

function keyFor(orderNumber: string, itemNumber: number, seq: number, ext: string): string {
  return buildKey(ORDER_DATE, orderNumber, LINE, itemNumber, seq, null, ext)
}

describe('saveImage', () => {
  it('writes the bytes to disk under the key its own row records', () => {
    const order = newOrder('3000')
    const image = addTop(order.id)

    const saved = upload(image.id)
    const expectedKey = keyFor('3000', 100, 1, 'png')

    expect(saved.seq).toBe(1)
    expect(saved.package).toBeNull()
    expect(saved.createdBy).toBe(CREATED_BY)
    expect(getImageFile(saved.id)?.storageKey).toBe(expectedKey)

    const absolute = originalPath(expectedKey)
    expect(existsSync(absolute)).toBe(true)
    expect(readFileSync(absolute).equals(BYTES)).toBe(true)

    // The two display sizes land under their own kind folders and carry the
    // bytes the caller handed over, not a copy of the original.
    const web = derivativePath(expectedKey, 'web')
    const thumb = derivativePath(expectedKey, 'thumb')
    expect(readFileSync(web).equals(WEB_BYTES)).toBe(true)
    expect(readFileSync(thumb).equals(THUMB_BYTES)).toBe(true)
  })

  it('increments seq for the same item', () => {
    const order = newOrder('3100')
    const item = addTop(order.id)

    expect(upload(item.id).seq).toBe(1)
    expect(upload(item.id).seq).toBe(2)
    expect(getImageFile(upload(item.id).id)?.storageKey).toBe(keyFor('3100', 100, 3, 'png'))
  })

  it('restarts seq for every item', () => {
    const order = newOrder('3200')
    const first = addTop(order.id)
    const second = addTop(order.id)
    upload(first.id)

    expect(upload(second.id).seq).toBe(1)
    expect(getImageFile(upload(second.id).id)?.storageKey).toBe(keyFor('3200', 200, 2, 'png'))
  })

  it('derives the file extension from the mime type', () => {
    const order = newOrder('3300')
    const item = addTop(order.id)

    const keys = [
      upload(item.id, { mimeType: 'image/png' }),
      upload(item.id, { mimeType: 'image/webp' }),
      upload(item.id, { mimeType: 'image/jpeg' }),
      // Unknown or missing types fall back to the old chat flow's jpeg.
      upload(item.id, { mimeType: null }),
    ].map((image) => getImageFile(image.id)?.storageKey)

    expect(keys[0]?.endsWith('.png')).toBe(true)
    expect(keys[1]?.endsWith('.webp')).toBe(true)
    expect(keys[2]?.endsWith('.jpg')).toBe(true)
    expect(keys[3]?.endsWith('.jpg')).toBe(true)
  })

  it('refuses an item that does not exist', () => {
    expect(() => upload('no-such-item')).toThrowError('saveImage: item not found')
  })
})

describe('getImage / getImageFile', () => {
  it('keeps the storage key out of the API-shaped record', () => {
    const order = newOrder('3400')
    const saved = upload(addTop(order.id).id)

    // storage_key exists only server-side; leaking it would expose the
    // filesystem layout through every API response.
    expect('storageKey' in (getImage(saved.id) ?? {})).toBe(false)
    expect(getImage(saved.id)?.id).toBe(saved.id)
    expect(getImageFile(saved.id)?.mimeType).toBe('image/png')
  })

  it('returns undefined for an unknown image', () => {
    expect(getImage('no-such-id')).toBeUndefined()
    expect(getImageFile('no-such-id')).toBeUndefined()
  })
})

describe('setImagePackage', () => {
  it('labels a photo and clears the label again', () => {
    const order = newOrder('3500')
    const saved = upload(addTop(order.id).id)

    expect(setImagePackage(saved.id, 'Inner Box')).toBe(true)
    expect(getImage(saved.id)?.package).toBe('Inner Box')

    expect(setImagePackage(saved.id, null)).toBe(true)
    expect(getImage(saved.id)?.package).toBeNull()
  })

  it('does not rename the file that was already written', () => {
    // Characterises today's behaviour: the label is metadata, the key was
    // fixed at upload time with the Primary fallback.
    const order = newOrder('3600')
    const saved = upload(addTop(order.id).id)
    const keyBefore = getImageFile(saved.id)?.storageKey

    setImagePackage(saved.id, 'Carton')

    expect(getImageFile(saved.id)?.storageKey).toBe(keyBefore)
    expect(keyBefore?.endsWith('1-Primary.png')).toBe(true)
  })

  it('reports a miss for an unknown image', () => {
    expect(setImagePackage('no-such-id', 'Tray')).toBe(false)
  })
})

describe('deleteImage', () => {
  it('removes the row and every file together', () => {
    const order = newOrder('3700')
    const saved = upload(addTop(order.id).id)
    const key = getImageFile(saved.id)?.storageKey ?? ''
    const original = originalPath(key)
    const web = derivativePath(key, 'web')
    const thumb = derivativePath(key, 'thumb')

    expect(deleteImage(saved.id)).toBe(true)
    expect(getImage(saved.id)).toBeUndefined()
    expect(existsSync(original)).toBe(false)
    expect(existsSync(web)).toBe(false)
    expect(existsSync(thumb)).toBe(false)
  })

  it('reports a miss for an unknown image', () => {
    expect(deleteImage('no-such-id')).toBe(false)
  })
})

describe('deleteItemCascade with files', () => {
  it('unlinks the photos of the pack and of its varieties', () => {
    const order = newOrder('3800')
    const pack = addTop(order.id)
    const variety = addVariety(order.id, pack.id)
    const packImage = upload(pack.id)
    const varietyImage = upload(variety.id)

    const packFile = originalPath(getImageFile(packImage.id)?.storageKey ?? '')
    const varietyFile = originalPath(getImageFile(varietyImage.id)?.storageKey ?? '')
    expect(existsSync(packFile)).toBe(true)
    expect(existsSync(varietyFile)).toBe(true)

    expect(deleteItemCascade(pack.id)).toBe(true)

    // Cascade covers one variety level, which is the only depth the form
    // creates, so these two files are every descendant.
    expect(existsSync(packFile)).toBe(false)
    expect(existsSync(varietyFile)).toBe(false)
    expect(getImage(packImage.id)).toBeUndefined()
    expect(getImage(varietyImage.id)).toBeUndefined()
  })
})
