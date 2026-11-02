import { existsSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { findOrCreateOrder } from '../../lib/db/order-images'
import { toAbsolute } from '../../lib/order-images/storage'
import { todayBangkok } from '../../lib/order-images/validation'

import { collectConsoleErrors } from './support/console'
import { seedOrder } from './support/data'

// The admin side of the order-image journey: the form writes the rows, this
// page reads the summary, opens one order, relabels a photo and deletes the
// order with its files.
test('summarizes, inspects and deletes an uploaded order', async ({
  page,
}) => {
  const orderNumber = `E2E-ADMIN-${Date.now()}`
  const today = todayBangkok()
  const seeded = seedOrder({ orderNumber, orderDate: today })
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/order-images')
  const summaryRegion = page.getByRole('region', { name: 'ภาพรวมออเดอร์' })
  await expect(
    summaryRegion.getByText('ออเดอร์', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'สร้างออเดอร์' }),
  ).toHaveAttribute('href', '/liff/forms/order-image')
  // The first view is today, by day.
  await expect(page.getByLabel('วันที่')).toHaveValue(today)
  // The line select still uses Base UI's items so the trigger shows Thai.
  await expect(page.getByRole('combobox', { name: 'ไลน์ผลิต' })).toContainText(
    'ทั้งหมด',
  )
  // The period is a single-select toggle group now, and the search box
  // leads the row while the period group closes it.
  const periodGroup = page.getByRole('group', { name: 'ช่วงเวลา' })
  await expect(
    periodGroup.getByRole('button', { name: 'รายวัน' }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(
    (
      await page
        .locator('form[aria-label="ตัวกรองออเดอร์"] > *')
        .allInnerTexts()
    ).map((text) => text.split('\n')[0]),
  ).toEqual(['ค้นหาเลขออเดอร์', 'วันที่', 'ไลน์ผลิต', 'ช่วงเวลา', 'ค้นหา'])

  const orderLink = page.getByRole('link', { name: orderNumber })
  await expect(orderLink).toBeVisible()
  // The clear action is hidden on the clean today view.
  await expect(
    page.getByRole('link', { name: 'ล้างตัวกรอง' }),
  ).toHaveCount(0)

  // The same order stays visible when the view widens to the month and year.
  await periodGroup.getByRole('button', { name: 'รายเดือน' }).click()
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(orderLink).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'ล้างตัวกรอง' }),
  ).toBeVisible()

  await periodGroup.getByRole('button', { name: 'รายปี' }).click()
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(orderLink).toBeVisible()

  // The order-number search narrows the table to the seeded order.
  await page.getByLabel('ค้นหาเลขออเดอร์').fill(orderNumber)
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(orderLink).toBeVisible()
  await orderLink.click()

  await expect(
    page.getByRole('heading', { name: `ออเดอร์ ${orderNumber}` }),
  ).toBeVisible()
  const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' })
  await expect(breadcrumb).toBeVisible()
  await expect(
    breadcrumb.getByRole('link', { name: 'จัดการรูปภาพออเดอร์' }),
  ).toBeVisible()
  await expect(breadcrumb.getByText(orderNumber)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'เพิ่มข้อมูล' }),
  ).toHaveAttribute(
    'href',
    `/liff/forms/order-image?orderId=${seeded.orderId}`,
  )
  await expect(
    page.getByRole('link', { name: 'กลับไปหน้ารวม' }),
  ).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 100' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ไอเท็ม 110' })).toBeVisible()

  // Relabel the first photo through the same submenu the LIFF page uses.
  await page.getByRole('button', { name: 'ตั้งค่ารูปที่ 1' }).first().click()
  await page.getByRole('menuitem', { name: 'แพ็กเกจ' }).click()
  await page.getByRole('menuitemradio', { name: 'Inner Box' }).click()
  await expect(page.getByText('Inner Box', { exact: true })).toBeVisible()

  // Delete that photo and poll the file, because the unlink happens after
  // the database response.
  await page.getByRole('button', { name: 'ตั้งค่ารูปที่ 1' }).first().click()
  await page.getByRole('menuitem', { name: 'ลบรูปนี้' }).click()
  const imageDialog = page.getByRole('dialog', {
    name: 'ยืนยันการลบรูปภาพ',
  })
  await imageDialog.getByRole('button', { name: 'ยืนยันลบ' }).click()
  await expect
    .poll(() => existsSync(toAbsolute(seeded.storageKeys[0])))
    .toBe(false)

  // Delete the whole order with the typed confirmation.
  await page.getByRole('button', { name: 'ลบออเดอร์' }).click()
  const orderDialog = page.getByRole('dialog', {
    name: 'ยืนยันการลบออเดอร์',
  })
  await orderDialog
    .getByLabel('พิมพ์เลขออเดอร์เพื่อยืนยัน')
    .fill(orderNumber)
  await orderDialog.getByRole('button', { name: 'ลบออเดอร์' }).click()
  await page.waitForURL('**/order-images')
  await expect(page.getByRole('link', { name: orderNumber })).toHaveCount(0)
  await expect
    .poll(() => existsSync(toAbsolute(seeded.storageKeys[1])))
    .toBe(false)

  expect(consoleErrors).toEqual([])
})

test('switches the KPI between the filtered view and all', async ({ page }) => {
  await page.goto('/order-images')
  const scope = page.getByRole('group', { name: 'ขอบเขต KPI' })
  await expect(
    scope.getByRole('button', { name: 'ตามตัวกรอง' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await scope.getByRole('button', { name: 'ทั้งหมด' }).click()
  await expect(page).toHaveURL(/summary=all/)
  await expect(
    scope.getByRole('button', { name: 'ทั้งหมด' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await scope.getByRole('button', { name: 'ตามตัวกรอง' }).click()
  await expect(page).not.toHaveURL(/summary=all/)
})

test('scrolls the table on desktop and the page on mobile', async ({ page }) => {
  const prefix = `E2E-SCROLL-${Date.now()}`
  const today = todayBangkok()

  // More rows than one page (25) and more than the viewport, so the table has
  // somewhere to scroll on desktop and the page has somewhere to scroll on
  // mobile.
  for (let index = 0; index < 26; index += 1) {
    findOrCreateOrder({
      orderNumber: `${prefix}-${String(index).padStart(2, '0')}`,
      orderDate: today,
      line: 'ดอกแค',
      createdBy: 'local-device',
    })
  }

  const consoleErrors = collectConsoleErrors(page)

  // Desktop: the shell is exactly one viewport and the table owns the scroll.
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/order-images?q=${prefix}`)
  // The oldest of the 26 rows sits on page two, so match any row from this
  // run instead of a specific number.
  await expect(
    page.getByRole('link', { name: new RegExp(`^${prefix}-`) }).first(),
  ).toBeVisible()

  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    ),
  ).toBeLessThanOrEqual(1)

  const tableContainer = page.locator('[data-slot="table-container"]:visible')
  expect(
    await tableContainer.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    ),
  ).toBeGreaterThan(0)

  await tableContainer.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  expect(
    await tableContainer.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0)

  // The header is sticky, so it stays visible while the rows move.
  await expect(
    page.getByRole('columnheader', { name: 'เลขออเดอร์' }),
  ).toBeVisible()

  // Mobile: the table grows with its rows and the document scrolls instead.
  await page.setViewportSize({ width: 393, height: 851 })
  await page.reload()
  await expect(
    page.getByRole('link', { name: new RegExp(`^${prefix}-`) }).first(),
  ).toBeVisible()

  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    ),
  ).toBeGreaterThan(0)
  expect(
    await tableContainer.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    ),
  ).toBeLessThanOrEqual(1)

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  expect(consoleErrors).toEqual([])
})

test('keeps the period group compact on desktop and full width on mobile', async ({
  page,
}) => {
  const periodGroup = page.getByRole('group', { name: 'ช่วงเวลา' })
  const form = page.locator('form[aria-label="ตัวกรองออเดอร์"]:visible')

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/order-images')
  expect((await periodGroup.boundingBox())?.width ?? 0).toBeLessThan(200)

  await page.setViewportSize({ width: 393, height: 851 })
  await page.reload()
  // The mobile width is applied after useIsMobile hydrates.
  await expect
    .poll(async () => {
      const group = await periodGroup.boundingBox()
      const frame = await form.boundingBox()
      return group && frame ? group.width / frame.width : 0
    })
    .toBeGreaterThan(0.8)
})

test('refuses the admin page when the request came through Cloudflare', async ({
  request,
}) => {
  const response = await request.get('/order-images', {
    headers: { 'CF-Connecting-IP': '203.0.113.10' },
  })

  expect(response.ok()).toBe(true)
  expect(await response.text()).toContain(
    'หน้านี้เปิดได้จากเครื่องของผู้ดูแลระบบเท่านั้น',
  )
})
