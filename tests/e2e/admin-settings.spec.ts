import { dirname, join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { todayBangkok } from '../../lib/order-images/validation'

import { collectConsoleErrors } from './support/console'
import { seedOrder, uniqueOrderNumber } from './support/data'
import { E2E_DB_PATH, E2E_STORAGE_DIR } from './support/env'
import { toNumbers } from './support/numbers'

// The admin surface is local-only (ADR 0007) and the browser runs on
// 127.0.0.1, so the page renders without any setup.
//
// The storage root is the safe field to exercise end to end: saving it takes
// effect on the next call and never touches the database. The database field
// only gets as far as its confirmation dialog, which is cancelled.
test('edits the two locations and applies the storage root at once', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/settings')

  const database = page.getByLabel('โฟลเดอร์ฐานข้อมูล', { exact: true })
  const storage = page.getByLabel('โฟลเดอร์ที่จัดเก็บไฟล์', { exact: true })

  await expect(database).toHaveValue(/.+/)
  await expect(storage).toHaveValue(/.+/)

  const moved = join(E2E_STORAGE_DIR, 'moved')
  await storage.fill(moved)
  await page.getByRole('button', { name: 'บันทึกโฟลเดอร์ที่จัดเก็บไฟล์' }).click()
  await expect(page.getByText('บันทึกตำแหน่งที่ตั้งแล้ว')).toBeVisible()
  // The field shows the folder the operator typed (the app appends the
  // fixed file/folder name internally).
  await expect(storage).toHaveValue(moved)

  // A database folder that does not exist yet must be confirmed before the app
  // switches to a brand-new empty database.
  const missing = join(E2E_STORAGE_DIR, 'missing.db')
  await database.fill(missing)
  await page.getByRole('button', { name: 'บันทึกโฟลเดอร์ฐานข้อมูล' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'ยกเลิก' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(database).toHaveValue(missing)

  // Put the run's own root back, so a later spec and the next run see the
  // same folder.
  await storage.fill(E2E_STORAGE_DIR)
  await page.getByRole('button', { name: 'บันทึกโฟลเดอร์ที่จัดเก็บไฟล์' }).click()
  await expect(storage).toHaveValue(E2E_STORAGE_DIR)

  expect(errors).toEqual([])
})

// Switching the database changes what every page reads. The overview numbers
// live in unstable_cache entries keyed by the day, so before the switch
// expired them the next visit kept showing the old file until the 60 second
// revalidation. This spec switches for real, writes through the LIFF endpoints
// into the new file, checks the first visit, then restores the run's own
// database so the specs after it keep reading their rows.
test('switches the database and shows the new file on the first visit', async ({
  page,
  request,
}) => {
  const errors = collectConsoleErrors(page)
  const originalOrder = uniqueOrderNumber()
  await seedOrder({ orderNumber: originalOrder, orderDate: todayBangkok() })

  await page.goto('/settings')
  const originalFolder = await page
    .getByLabel('โฟลเดอร์ฐานข้อมูล', { exact: true })
    .inputValue()
  const switchedFolder = join(dirname(E2E_DB_PATH), 'switched-db')

  try {
    await switchDatabase(page, switchedFolder, true)
    // The card owns the screen until the live connection answers a query.
    await expect(page.getByText('กำลังเชื่อมต่อฐานข้อมูล…')).toBeVisible()
    await expect(page.getByText('เชื่อมต่อฐานข้อมูลใหม่แล้ว')).toBeVisible()

    // Write into the new file through the same endpoints the phone uses.
    const newOrder = uniqueOrderNumber()
    const created = await request.post('/api/liff/order-images/orders', {
      data: {
        orderNumber: newOrder,
        orderDate: todayBangkok(),
        line: 'ดอกแค',
      },
    })
    expect(created.status()).toBe(200)
    const { orderId } = (await created.json()) as { orderId: string }
    const item = await request.post(
      `/api/liff/order-images/orders/${orderId}/items`,
      { data: { parentItemId: null } },
    )
    expect(item.status()).toBe(201)

    await page.goto('/order-images')
    await expect(page.getByRole('link', { name: newOrder })).toBeVisible()
    await expect(page.getByRole('link', { name: originalOrder })).toHaveCount(0)

    const kpi = page
      .getByRole('region', { name: 'ภาพรวมออเดอร์' })
      .locator('[data-slot="summary-value"]')
    await expect(kpi).toHaveCount(3)
    // One order, one item and no photo in the file the switch just created.
    expect(toNumbers(await kpi.allTextContents())).toEqual([1, 1, 0])
  } finally {
    // Wait for the first toast to leave, so the restore cannot pass on a stale
    // one, then put the run's own file back.
    await expect(page.getByText('เชื่อมต่อฐานข้อมูลใหม่แล้ว')).toBeHidden()
    await page.goto('/settings')
    await switchDatabase(page, originalFolder, false)
    await expect(page.getByText('เชื่อมต่อฐานข้อมูลใหม่แล้ว')).toBeVisible()
  }

  await page.goto('/order-images')
  await expect(page.getByRole('link', { name: originalOrder })).toBeVisible()
  expect(errors).toEqual([])
})

// Fills the database field and saves it. `confirm` is true for a folder with
// no wh.db yet, where the action asks before creating a new file.
async function switchDatabase(page: Page, folder: string, confirm: boolean) {
  await page.getByLabel('โฟลเดอร์ฐานข้อมูล', { exact: true }).fill(folder)
  await page.getByRole('button', { name: 'บันทึกโฟลเดอร์ฐานข้อมูล' }).click()
  if (confirm) {
    await page.getByRole('button', { name: 'สร้างและสลับ' }).click()
  }
}
