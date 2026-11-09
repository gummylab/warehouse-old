import { expect, test, type Locator, type Page } from '@playwright/test'

import { collectConsoleErrors } from './support/console'
import { uniqueSuffix } from './support/data'

// The line-walk form end to end in local device mode: complete a key, save,
// inspect the saved row, edit it and save again.

async function fillKey(page: Page, section: Locator, brand: string) {
  await section
    .getByRole('group', { name: /กะ/ })
    .getByRole('button', { name: 'กลางวัน' })
    .click()
  await section.getByRole('combobox', { name: /ไลน์ผลิต/ }).click()
  await page.getByRole('option').first().click()
  await section.getByLabel(/ชื่อแบรนด์/).fill(brand)
  await section.getByLabel(/Pack style/).fill('box')
}

test('saves a line-walk entry, reloads it and updates it', async ({ page }) => {
  const brand = `brand-${uniqueSuffix()}`
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/line-walk')

  const first = page.getByRole('region', { name: 'รายการที่ 1' })
  await fillKey(page, first, brand)

  await expect(first.getByText('ยังไม่มีข้อมูล')).toBeVisible()

  await first.getByLabel(/จำนวนคน/).fill('5')
  await first.getByLabel(/ยอดสินค้า/).fill('120')
  await page.getByRole('button', { name: 'บันทึกทั้งหมด' }).click()

  await expect(page.getByText('บันทึกแล้ว 1 รายการ')).toBeVisible()

  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByText('มีข้อมูลเดิม')).toBeVisible()
  await expect(page.getByLabel(/จำนวนคน/)).toHaveValue('5')
  await expect(page.getByLabel(/ยอดสินค้า/)).toHaveValue('120')

  await page.getByLabel(/จำนวนคน/).fill('7')
  await page.getByRole('button', { name: 'บันทึกทั้งหมด' }).click()
  await expect(page.getByText('บันทึกแล้ว 1 รายการ')).toBeVisible()

  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByLabel(/จำนวนคน/)).toHaveValue('7')

  expect(consoleErrors).toEqual([])
})

test('starts fresh after leaving the success screen', async ({ page }) => {
  const brand = `brand-${uniqueSuffix()}`
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/line-walk')

  const first = page.getByRole('region', { name: 'รายการที่ 1' })
  await fillKey(page, first, brand)
  await expect(first.getByText('ยังไม่มีข้อมูล')).toBeVisible()
  await first.getByLabel(/จำนวนคน/).fill('2')
  await first.getByLabel(/ยอดสินค้า/).fill('20')
  await page.getByRole('button', { name: 'บันทึกทั้งหมด' }).click()
  await expect(page.getByText('บันทึกแล้ว 1 รายการ')).toBeVisible()

  await page.getByRole('link', { name: 'กลับไปหน้าหลัก' }).click()
  await expect(page.getByRole('heading', { name: 'แบบฟอร์ม' })).toBeVisible()

  await page.getByRole('link', { name: /บันทึกการเดินไลน์/ }).click()
  await expect(
    page.getByRole('heading', { name: 'บันทึกการเดินไลน์' }),
  ).toBeVisible()
  await expect(page.getByText('บันทึกแล้ว 1 รายการ')).toHaveCount(0)
  await expect(page.getByLabel(/ชื่อแบรนด์/)).toHaveValue('')
  await expect(
    page.getByRole('button', { name: 'บันทึกทั้งหมด' }),
  ).toBeDisabled()

  expect(consoleErrors).toEqual([])
})

// The route keeps its client state while it is hidden, so the navbar exit has
// to clear it as well. "ตรวจสอบ" deliberately returns to the form with the
// saved values in place for editing; without a reset on the way out, the next
// visit would show them as if they had never been saved.
test('starts fresh after leaving through the navbar back button', async ({
  page,
}) => {
  const brand = `brand-${uniqueSuffix()}`
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/line-walk')

  const first = page.getByRole('region', { name: 'รายการที่ 1' })
  await fillKey(page, first, brand)
  await first.getByLabel(/จำนวนคน/).fill('2')
  await first.getByLabel(/ยอดสินค้า/).fill('20')
  await page.getByRole('button', { name: 'บันทึกทั้งหมด' }).click()
  await expect(page.getByText('บันทึกแล้ว 1 รายการ')).toBeVisible()

  await page.getByRole('button', { name: 'ตรวจสอบ' }).click()
  await expect(page.getByLabel(/ชื่อแบรนด์/)).toHaveValue(brand)

  await page.getByRole('link', { name: 'กลับไปหน้าแบบฟอร์ม' }).click()
  await expect(page.getByRole('heading', { name: 'แบบฟอร์ม' })).toBeVisible()

  await page.getByRole('link', { name: /บันทึกการเดินไลน์/ }).click()
  await expect(page.getByLabel(/ชื่อแบรนด์/)).toHaveValue('')
  // The counts only exist once a key is complete, so a fresh section has none.
  await expect(page.getByLabel(/จำนวนคน/)).toHaveCount(0)
  await expect(page.getByText('บันทึกแล้ว 1 รายการ')).toHaveCount(0)

  expect(consoleErrors).toEqual([])
})

test('flags a duplicate key before saving', async ({ page }) => {  const brand = `brand-${uniqueSuffix()}`
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/liff/forms/line-walk')

  const first = page.getByRole('region', { name: 'รายการที่ 1' })
  await fillKey(page, first, brand)
  await expect(first.getByText('ยังไม่มีข้อมูล')).toBeVisible()
  await first.getByLabel(/จำนวนคน/).fill('5')
  await first.getByLabel(/ยอดสินค้า/).fill('120')

  await page.getByRole('button', { name: /เพิ่มรายการ/ }).click()
  const second = page.getByRole('region', { name: 'รายการที่ 2' })

  // The new section starts with today's date, so the same shift, line, brand
  // and pack style reproduce the first key exactly.
  await fillKey(page, second, brand)

  await expect(
    second.getByText('รายการซ้ำกับรายการที่ 1'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'บันทึกทั้งหมด' }),
  ).toBeDisabled()

  expect(consoleErrors).toEqual([])
})
