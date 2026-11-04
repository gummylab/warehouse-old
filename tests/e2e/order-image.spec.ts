import { existsSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { buildKey, toAbsolute } from '../../lib/order-images/storage'

import { collectConsoleErrors } from './support/console'

// The whole order-image journey in a browser, against the harness's own
// database and upload folder. Every value it creates is unique, because the
// specs share one database.

// A one-pixel PNG. The server never decodes an upload (it stores and serves
// the bytes), so this only has to be recognisable on the way back out.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const UPLOAD = { name: 'e2e-photo.png', mimeType: 'image/png', buffer: PNG_BYTES }

// A second photo, because the viewer only has somewhere to walk with a
// neighbour. The dialog takes the whole list and uploads it one by one.
const UPLOAD_2 = { name: 'e2e-photo-2.png', mimeType: 'image/png', buffer: PNG_BYTES }

test('uploads, labels and deletes a photo for an item', async ({ page, request }) => {
  const orderNumber = `E2E-${Date.now()}`
  // The item cards and the photo page carry links that look like buttons.
  // A component library complains in the console when that is done the
  // wrong way, and the complaint is invisible to a locator assertion, so
  // the errors are collected and checked at the end of the journey.
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/order-image')

  // The form defaults to today in Bangkok; read the value the picker actually
  // shows instead of recomputing the clock in the test process.
  const orderDate =
    (await page.getByLabel('วันที่ออเดอร์').getAttribute('data-date')) ?? ''
  expect(orderDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

  // ---- step 1: identify the order -------------------------------------
  await page.getByLabel('เลขออเดอร์').fill(orderNumber)
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

  await page.getByRole('button', { name: 'เพิ่มรูปภาพ' }).click()
  // The camera input cannot be driven from a test, so only its presence is
  // asserted; `:not([capture])` selects the gallery picker the upload goes
  // through.
  await expect(page.locator('input[type=file][capture="environment"]')).toHaveCount(1)
  await page.locator('input[type=file]:not([capture])').setInputFiles([UPLOAD, UPLOAD_2])
  await page.getByRole('button', { name: 'อัปโหลด' }).click()

  // The caption of the tile turns into "ยังไม่ระบุแพ็กเกจ" (unlabelled) once
  // the upload response lands, and the tile itself carries the photo.
  const thumbnail = page.locator('button:has(img[alt="รูปที่ 1"])')
  await expect(thumbnail).toBeVisible()
  await expect(page.locator('img[alt="รูปที่ 2"]')).toBeVisible()

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
  const key = buildKey(orderDate, orderNumber, line, 100, 1, null, 'png')
  expect(key.endsWith('/100/1-Primary.png')).toBe(true)
  const storedFile = toAbsolute(key)
  expect(existsSync(storedFile)).toBe(true)

  // ---- label the photo -------------------------------------------------
  // The package lives in the card's menu: open the menu, open the
  // "แพ็กเกจ" submenu, then pick a package from it.
  const settings = page.getByRole('button', { name: 'ตั้งค่ารูปที่ 1' })
  await settings.click()
  await page.getByRole('menuitem', { name: 'แพ็กเกจ' }).click()
  await page.getByRole('menuitemradio', { name: 'Inner Box' }).click()

  // The toast confirms the label after the PATCH lands.
  await expect(page.getByText('เปลี่ยนแพ็กเกจเป็น Inner Box แล้ว')).toBeVisible()
  // The menu closes on the pick, so the card's label holds the only
  // "Inner Box" on the page.
  await expect(page.getByText('Inner Box', { exact: true })).toBeVisible()
  // Labelling is metadata only: the file written at upload time keeps the
  // Primary fallback in its name (characterised in the unit tests too).
  expect(existsSync(storedFile)).toBe(true)

  // ---- the viewer walks the item's photos ------------------------------
  await thumbnail.click()
  // Named after the photo on screen, so the locator matches any position and
  // the counter below says which one it is.
  const viewer = page.getByRole('dialog', { name: /รูปที่ \d+ จาก 2/ })
  await expect(viewer.getByRole('img', { name: 'รูปที่ 1' })).toBeVisible()
  // Nothing to manage in here: the package picker and the delete live on the
  // card's menu.
  await expect(viewer.getByRole('menuitem')).toHaveCount(0)

  // First photo: the way back is closed and the way forward is not.
  await expect(viewer.getByRole('button', { name: 'รูปก่อนหน้า' })).toBeDisabled()
  await expect(viewer.getByText('1 / 2')).toBeVisible()

  await viewer.getByRole('button', { name: 'รูปถัดไป' }).click()
  await expect(viewer.getByRole('img', { name: 'รูปที่ 2' })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'รูปถัดไป' })).toBeDisabled()
  await expect(viewer.getByText('2 / 2')).toBeVisible()

  // The arrow keys are the same walk without the buttons.
  await page.keyboard.press('ArrowLeft')
  await expect(viewer.getByRole('img', { name: 'รูปที่ 1' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)

  // ---- delete the photo ------------------------------------------------
  await settings.click()
  await page.getByRole('menuitem', { name: 'ลบรูปนี้' }).click()
  const confirm = page.getByRole('dialog', { name: 'ยืนยันการลบรูปภาพ' })
  await confirm.getByRole('button', { name: 'ยืนยันลบ' }).click()
  // The deleted card is gone, the other photo is untouched, so the grid holds
  // one card plus the add cell. The filter skips the previous page, which the
  // router keeps in the DOM but hidden.
  await expect(thumbnail).toHaveCount(0)
  await expect(page.locator('img[alt="รูปที่ 2"]')).toHaveCount(1)
  await expect(
    page.locator('section[data-slot="tile-grid"] > *').filter({ visible: true }),
  ).toHaveCount(2)
  // The card leaves the grid on the click; the unlink happens on the server
  // response, so poll the disk instead of reading it in the same tick.
  await expect.poll(() => existsSync(storedFile)).toBe(false)

  // ---- delete the item, taking its variety with it ---------------------
  await page.getByRole('link', { name: 'กลับออเดอร์' }).click()
  await expect(page.getByRole('heading', { name: `ออเดอร์ ${orderNumber}` })).toBeVisible()

  await page.getByRole('button', { name: 'ลบไอเท็ม 100' }).click()
  await page
    .getByRole('dialog', { name: 'ยืนยันการลบไอเท็ม' })
    .getByRole('button', { name: 'ลบไอเท็ม' })
    .click()

  // The item frame is back to the add cell alone, and the next number
  // starts over at 100.
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'เพิ่มไอเท็ม (100)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 110' })).toHaveCount(0)

  expect(consoleErrors).toEqual([])
})

test('filters the item cards as a number is typed', async ({ page }) => {
  const orderNumber = `E2E-${Date.now()}`
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/order-image')

  await page.getByLabel('เลขออเดอร์').fill(orderNumber)
  await page.getByLabel('ไลน์ผลิต').click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: 'ถัดไป' }).click()

  // Two packs, one of them with a variety, so the search has something to
  // tell apart at both levels.
  await page.getByRole('button', { name: 'เพิ่มไอเท็ม (100)' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มไอเท็มย่อย (110)' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 110' })).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มไอเท็ม (200)' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 200' })).toBeVisible()

  // Every keystroke filters: there is no submit button to press.
  const search = page.getByLabel('ค้นหาเลขไอเท็ม')
  await search.pressSequentially('200')

  await expect(page.getByRole('heading', { name: 'ไอเท็ม 200' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toHaveCount(0)

  // The match is per tile: item 110 appears alone, without pack 100.
  await search.fill('110')
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 110' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 200' })).toHaveCount(0)

  // A number nobody holds leaves the dashed "not found" note instead of an
  // empty page.
  await search.fill('999')
  await expect(page.getByText('ไม่พบไอเท็มที่ตรงกับเลข 999')).toBeVisible()

  await page.getByRole('button', { name: 'ล้างคำค้นหา' }).click()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 200' })).toBeVisible()

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
  await page.getByRole('button', { name: 'ถัดไป' }).click()
  await expect(page.getByText('กรุณาเลือกไลน์ผลิต')).toBeVisible()

  // Both checks run client-side with the same helpers the route uses.
  expect(orderImageCalls).toEqual([])
})

test('uses the desktop width for the LIFF form hub and order form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })

  for (const path of ['/liff/forms', '/liff/forms/order-image']) {
    await page.goto(path)

    const body = page.locator('[data-slot="page-body"]:visible')
    await expect(body).toBeVisible()
    expect((await body.boundingBox())?.width ?? 0).toBeGreaterThan(1000)

    const headerRow = page.locator('[data-slot="page-header-row"]:visible')
    await expect(headerRow).toBeVisible()
    expect((await headerRow.boundingBox())?.width ?? 0).toBeGreaterThan(1000)
  }
})
