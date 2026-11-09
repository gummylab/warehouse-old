import { existsSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { findOrCreateOrder } from '../../lib/db/order-images'
import { derivativePath, originalPath } from '../../lib/order-images/storage'
import { todayBangkok } from '../../lib/order-images/validation'

import { collectConsoleErrors } from './support/console'
import { seedOrder, uniqueOrderNumber } from './support/data'
import { toNumbers } from './support/numbers'

// The admin side of the order-image journey: the form writes the rows, this
// page reads the summary, opens one order, relabels a photo and deletes the
// order with its files.
test('summarizes, inspects and deletes an uploaded order', async ({
  page,
}) => {
  const orderNumber = uniqueOrderNumber()
  const today = todayBangkok()
  const seeded = await seedOrder({ orderNumber, orderDate: today })
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
  await expect(page.getByLabel('วันที่', { exact: true })).toHaveAttribute('data-date', today)
  // The line select still uses Base UI's items so the trigger shows Thai.
  await expect(page.getByRole('combobox', { name: 'ไลน์ผลิต' })).toContainText(
    'ทั้งหมด',
  )
  // The period is a single-select toggle group, and it sits directly after
  // the date it controls.
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
  ).toEqual(['วันที่', 'ช่วงเวลา', 'ไลน์ผลิต', 'ค้นหาเลขออเดอร์', 'ค้นหา'])

  const orderLink = page.getByRole('link', { name: orderNumber })
  await expect(orderLink).toBeVisible()
  // The clear action is hidden on the clean today view.
  await expect(
    page.getByRole('link', { name: 'ล้างตัวกรอง' }),
  ).toHaveCount(0)

  // The same order stays visible when the view widens to the month and year.
  await periodGroup.getByRole('button', { name: 'รายเดือน' }).click()
  await expect(page.getByLabel('เดือน', { exact: true })).toHaveAttribute(
    'data-month',
    today.slice(0, 7),
  )
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(orderLink).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'ล้างตัวกรอง' }),
  ).toBeVisible()

  await periodGroup.getByRole('button', { name: 'รายปี' }).click()
  await expect(page.getByLabel('ปี', { exact: true })).toHaveAttribute(
    'data-year',
    today.slice(0, 4),
  )
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
    breadcrumb.getByRole('link', { name: 'บันทึกภาพออเดอร์' }),
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

  // Let the thumbnail that will be deleted finish loading before the action
  // unlinks its file. An in-flight request would 404 after the unlink and the
  // console collector would flag it, even though the delete itself worked.
  // The second tile can stay lazy: the page navigates away when the whole
  // order is deleted, so its request never lands after the unlink.
  await expect
    .poll(() =>
      page
        .locator('img[alt="รูปที่ 1"]')
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)

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
    .poll(() => existsSync(originalPath(seeded.storageKeys[0])))
    .toBe(false)
  // The delete unlinks the derivatives too; a leftover would outlive the row.
  expect(existsSync(derivativePath(seeded.storageKeys[0], 'web'))).toBe(false)
  expect(existsSync(derivativePath(seeded.storageKeys[0], 'thumb'))).toBe(false)

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
    .poll(() => existsSync(originalPath(seeded.storageKeys[1])))
    .toBe(false)

  expect(consoleErrors).toEqual([])
})

test('picks a day, a month and a year from the filter pickers', async ({
  page,
}) => {
  const today = todayBangkok()
  const [year, month] = today.split('-')
  // Pick a day in the same month that is not today, so the seeded order only
  // appears after the picker changes the filter.
  const otherDay = today.endsWith('-01') ? '02' : '01'
  const pickedDate = `${year}-${month}-${otherDay}`
  const orderNumber = uniqueOrderNumber()
  await seedOrder({ orderNumber, orderDate: pickedDate })
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/order-images')
  await page.getByLabel('วันที่', { exact: true }).click()
  await page.locator(`[data-iso="${pickedDate}"]`).click()
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(page.getByRole('link', { name: orderNumber })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`date=${pickedDate}`))

  const periodGroup = page.getByRole('group', { name: 'ช่วงเวลา' })

  // The month picker starts on the month of the current filter.
  await periodGroup.getByRole('button', { name: 'รายเดือน' }).click()
  await expect(page.getByLabel('เดือน', { exact: true })).toHaveAttribute(
    'data-month',
    `${year}-${month}`,
  )
  await page.getByLabel('เดือน', { exact: true }).click()
  await page.locator(`[data-month-value="${year}-${month}"]`).click()
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(page).toHaveURL(
    new RegExp(`period=month.*date=${year}-${month}-01`),
  )
  await expect(page.getByRole('link', { name: orderNumber })).toBeVisible()

  // The year picker keeps the stored Gregorian year and shows the Buddhist one.
  await periodGroup.getByRole('button', { name: 'รายปี' }).click()
  await expect(page.getByLabel('ปี', { exact: true })).toHaveAttribute('data-year', year)
  await page.getByLabel('ปี', { exact: true }).click()
  await page.locator(`[data-year-value="${year}"]`).click()
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(page).toHaveURL(
    new RegExp(`period=year.*date=${year}-01-01`),
  )
  await expect(page.getByRole('link', { name: orderNumber })).toBeVisible()

  expect(consoleErrors).toEqual([])
})

test('switches the overview window and keeps it out of the URL', async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page)
  await page.goto('/order-images')

  const range = page.getByRole('combobox', { name: 'ช่วงภาพรวม' })
  await expect(range).toContainText('วัน')

  // The chart starts collapsed, so the KPI stays visible and the table keeps
  // the height. Opening it must not disturb the window or the URL.
  const chart = page.getByRole('img', { name: /กราฟออเดอร์/ })
  await expect(chart).toBeHidden()
  await page.getByRole('button', { name: 'แสดงกราฟ' }).click()
  await expect(
    page.getByRole('img', { name: /7 วันล่าสุด/ }),
  ).toBeVisible()

  await range.click()
  await page.getByRole('option', { name: 'เดือน' }).click()
  await expect(range).toContainText('เดือน')
  await expect(chart).toBeVisible()

  await range.click()
  await page.getByRole('option', { name: 'ปี' }).click()
  await expect(range).toContainText('ปี')
  await expect(
    page.getByRole('img', { name: /กราฟออเดอร์รายเดือน/ }),
  ).toBeVisible()

  // The switch is client state on purpose: it must not add a query parameter.
  expect(page.url()).toMatch(/\/order-images$/)
  expect(consoleErrors).toEqual([])
})

test('opens and collapses the trend chart', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page)
  await page.goto('/order-images')

  const chart = page.getByRole('img', { name: /กราฟออเดอร์/ })
  // Collapsed by default: the KPI strip is the first thing the page shows.
  await expect(chart).toBeHidden()

  await page.getByRole('button', { name: 'แสดงกราฟ' }).click()
  await expect(chart).toBeVisible()

  await page.getByRole('button', { name: 'ซ่อนกราฟ' }).click()
  await expect(chart).toBeHidden()
  await expect(
    page.getByRole('region', { name: 'ภาพรวมออเดอร์' }),
  ).toBeVisible()

  expect(consoleErrors).toEqual([])
})

test('scrolls the table on desktop and the page on mobile', async ({ page }) => {
  // Six shared digits plus a three-digit index keeps every order number nine
  // digits, while the prefix still matches all 26 rows in the text search.
  const prefix = String(Date.now()).slice(-6)
  const today = todayBangkok()

  // More rows than one page (25) and more than the viewport, so the table has
  // somewhere to scroll on desktop and the page has somewhere to scroll on
  // mobile.
  for (let index = 0; index < 26; index += 1) {
    findOrCreateOrder({
      orderNumber: `${prefix}${String(index).padStart(3, '0')}`,
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
    page.getByRole('link', { name: new RegExp(`^${prefix}`) }).first(),
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
    page.getByRole('link', { name: new RegExp(`^${prefix}`) }).first(),
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

// A write from the phone has to reach the KPI strip on the next load. Adding an
// item is the write that used to skip the tag: only creating an order and
// deleting one expired 'orders', so a new item stayed out of the "ไอเท็ม" cell
// until the 60 second revalidation.
//
// The prime write is an order creation, which expires the tag in both the old
// and the new code. Without it the first read could be served from the entry an
// earlier test in this file cached, and `before` would not describe this test's
// data at all. The measured write is the item add.
//
// One reload only. If the item add does not expire the tag, that reload is
// answered from the entry cached before it and the cell keeps its old value.
test('updates the overview on the first load after a write', async ({
  page,
  request,
}) => {
  const today = todayBangkok()
  const seeded = await seedOrder({
    orderNumber: uniqueOrderNumber(),
    orderDate: today,
  })
  const consoleErrors = collectConsoleErrors(page)

  const prime = await request.post('/api/liff/order-images/orders', {
    data: { orderNumber: uniqueOrderNumber(), orderDate: today, line: 'ดอกแค' },
  })
  expect(prime.status()).toBe(200)

  await page.goto('/order-images')
  const kpi = page
    .getByRole('region', { name: 'ภาพรวมออเดอร์' })
    .locator('[data-slot="summary-value"]')
  // The overview streams in behind a Suspense boundary, so the values are not
  // in the DOM when the load event fires.
  await expect(kpi).toHaveCount(3)
  const before = toNumbers(await kpi.allTextContents())

  const response = await request.post(
    `/api/liff/order-images/orders/${seeded.orderId}/items`,
    { data: { parentItemId: null } },
  )
  expect(response.status()).toBe(201)

  await page.reload()
  await expect(kpi).toHaveCount(3)

  // The cells are ออเดอร์, ไอเท็ม and รูปภาพ, in that order.
  const after = toNumbers(await kpi.allTextContents())
  expect(after).toEqual([before[0], before[1] + 1, before[2]])

  expect(consoleErrors).toEqual([])
})

