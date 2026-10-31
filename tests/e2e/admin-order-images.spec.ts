import { existsSync } from 'node:fs'

import { expect, test } from '@playwright/test'

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
  await expect(page.getByText('ออเดอร์ทั้งหมด')).toBeVisible()
  // The first view is today, by day.
  await expect(page.getByLabel('วันที่')).toHaveValue(today)
  // Base UI renders the raw value unless the select receives its items, so
  // these two assertions guard the Thai labels on the trigger.
  await expect(page.getByRole('combobox', { name: 'ช่วงเวลา' })).toContainText(
    'รายวัน',
  )
  await expect(page.getByRole('combobox', { name: 'ไลน์ผลิต' })).toContainText(
    'ทั้งหมด',
  )

  const orderLink = page.getByRole('link', { name: orderNumber })
  await expect(orderLink).toBeVisible()

  // The same order stays visible when the view widens to the month and year.
  const period = page.getByRole('combobox', { name: 'ช่วงเวลา' })
  await period.click()
  await page.getByRole('option', { name: 'รายเดือน' }).click()
  await page.getByRole('button', { name: 'กรอง' }).click()
  await expect(period).toContainText('รายเดือน')
  await expect(orderLink).toBeVisible()

  await period.click()
  await page.getByRole('option', { name: 'รายปี' }).click()
  await page.getByRole('button', { name: 'กรอง' }).click()
  await expect(orderLink).toBeVisible()

  // The order-number search narrows the table to the seeded order.
  await page.getByLabel('ค้นหาเลขออเดอร์').fill(orderNumber)
  await page.getByRole('button', { name: 'กรอง' }).click()
  await expect(orderLink).toBeVisible()
  await orderLink.click()

  await expect(
    page.getByRole('heading', { name: `ออเดอร์ ${orderNumber}` }),
  ).toBeVisible()
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
