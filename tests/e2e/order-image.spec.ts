import { existsSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { buildKey, toAbsolute } from '../../lib/order-images/storage'

import { collectConsoleErrors } from './support/console'

// The whole order-image journey in a browser, against the harness's own
// database and upload folder. Every value it creates is unique, because the
// specs share one database.
const ORDER_DATE = '2026-01-15'

// A one-pixel PNG. The server never decodes an upload (it stores and serves
// the bytes), so this only has to be recognisable on the way back out.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const UPLOAD = { name: 'e2e-photo.png', mimeType: 'image/png', buffer: PNG_BYTES }

test('uploads, labels and deletes a photo for an item', async ({ page, request }) => {
  const orderNumber = `E2E-${Date.now()}`
  // The item cards and the photo page carry links that look like buttons.
  // A component library complains in the console when that is done the
  // wrong way, and the complaint is invisible to a locator assertion, so
  // the errors are collected and checked at the end of the journey.
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/order-image')

  // ---- step 1: identify the order -------------------------------------
  await page.getByLabel('เลขออเดอร์').fill(orderNumber)
  await page.getByLabel('วันที่ออเดอร์').fill(ORDER_DATE)
  await page.getByLabel('ไลน์ผลิต').click()
  const firstLine = page.getByRole('option').first()
  // The line name is read from the catalog instead of hard-coded, so the
  // expected storage key below cannot drift from the seeded data.
  const line = ((await firstLine.textContent()) ?? '').trim()
  await firstLine.click()
  await page.getByRole('button', { name: 'ถัดไป' }).click()

  // ---- step 2: build the item tree ------------------------------------
  await expect(page.getByRole('heading', { name: `ออเดอร์ ${orderNumber}` })).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มไอเท็ม (100)' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'เพิ่มไอเท็ม (200)' })).toBeVisible()

  await page.getByRole('button', { name: 'เพิ่มไอเท็มย่อย (110)' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 110' })).toBeVisible()

  // ---- the item's own photo page --------------------------------------
  // The card's photo control is a Button rendered AS a link
  // (render={<Link .../>} in order-items-step.tsx), so its role is link.
  await page.getByRole('link', { name: 'เพิ่มรูปภาพไอเท็ม 100' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toBeVisible()

  await page.locator('input[type=file]').setInputFiles(UPLOAD)

  // The caption of the tile turns into "ยังไม่ระบุแพ็คเกจ" (unlabelled)
  // once the upload response lands, and the tile itself carries the photo.
  const thumbnail = page.locator('button:has(img[alt="รูปที่ 1"])')
  await expect(thumbnail).toBeVisible()

  // ---- the bytes round-trip through the auth-gated file endpoint -------
  const src = await page.locator('img[alt="รูปที่ 1"]').getAttribute('src')
  expect(src).toMatch(/^\/api\/liff\/order-images\/images\/[0-9a-f-]+\/file$/)

  const download = await request.get(src ?? '')
  expect(download.status()).toBe(200)
  expect(download.headers()['content-type']).toBe('image/png')
  expect((await download.body()).length).toBe(PNG_BYTES.length)

  // ---- the key on disk matches the documented layout -------------------
  // Built with the same helper the server writes with, so this asserts the
  // layout (date/order/line/item/seq-package.ext) rather than a copy of it.
  const key = buildKey(ORDER_DATE, orderNumber, line, 100, 1, null, 'png')
  expect(key.endsWith('/100/1-Primary.png')).toBe(true)
  const storedFile = toAbsolute(key)
  expect(existsSync(storedFile)).toBe(true)

  // ---- label the photo -------------------------------------------------
  await thumbnail.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('แพ็กเกจ').click()
  await page.getByRole('option', { name: 'Inner Box' }).click()
  await expect(dialog.getByText('Inner Box')).toBeVisible()
  await dialog.getByRole('button', { name: 'ปิด' }).click()

  await expect(thumbnail).toContainText('Inner Box')
  // Labelling is metadata only: the file written at upload time keeps the
  // Primary fallback in its name (characterised in the unit tests too).
  expect(existsSync(storedFile)).toBe(true)

  // ---- delete the photo ------------------------------------------------
  await thumbnail.click()
  await dialog.getByRole('button', { name: 'ลบรูปนี้' }).click()
  await dialog.getByRole('button', { name: 'ยืนยันลบ' }).click()
  await expect(page.getByText('ยังไม่มีรูปภาพ')).toBeVisible()
  expect(existsSync(storedFile)).toBe(false)

  // ---- delete the item, taking its variety with it ---------------------
  await page.getByRole('link', { name: 'กลับออเดอร์' }).click()
  await expect(page.getByRole('heading', { name: `ออเดอร์ ${orderNumber}` })).toBeVisible()

  await page.getByRole('button', { name: 'ลบไอเท็ม 100' }).click()
  await dialog.getByRole('button', { name: 'ลบไอเท็ม' }).click()

  await expect(page.getByText('ออเดอร์นี้ยังไม่มีไอเท็ม')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 110' })).toHaveCount(0)

  expect(consoleErrors).toEqual([])
})

test('rejects an incomplete step 1 before it reaches the network', async ({ page }) => {
  const orderImageCalls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/liff/order-images/orders')) {
      orderImageCalls.push(request.url())
    }
  })

  await page.goto('/liff/forms/order-image')

  await page.getByRole('button', { name: 'ถัดไป' }).click()
  await expect(page.getByText('กรุณาระบุเลขออเดอร์')).toBeVisible()

  await page.getByLabel('เลขออเดอร์').fill('1234')
  await page.getByLabel('วันที่ออเดอร์').fill('')
  await page.getByRole('button', { name: 'ถัดไป' }).click()
  await expect(page.getByText('วันที่ไม่ถูกต้อง')).toBeVisible()

  await page.getByLabel('วันที่ออเดอร์').fill(ORDER_DATE)
  await page.getByRole('button', { name: 'ถัดไป' }).click()
  await expect(page.getByText('กรุณาเลือกไลน์ผลิต')).toBeVisible()

  // All three checks run client-side with the same helpers the route uses.
  expect(orderImageCalls).toEqual([])
})
