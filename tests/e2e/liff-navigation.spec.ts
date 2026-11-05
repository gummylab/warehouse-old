import { expect, test } from '@playwright/test'

import { collectConsoleErrors } from './support/console'

// Routing and the client-side gate, driven by a real browser against a real
// server. Running on 127.0.0.1 means the layout gate resolves the session
// through local device mode (ADR 0004) instead of LINE, so an approved user is
// the normal case here.
test.describe('LIFF routing', () => {
  test('sends the LIFF root to the form hub and marks local device mode', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.goto('/liff')

    // /liff is a 307 from next.config.ts, then the gate replaces the
    // authorization screen with the form hub because this session is approved.
    await expect(page).toHaveURL(/\/liff\/forms$/)
    await expect(page.getByRole('heading', { name: 'แบบฟอร์ม' })).toBeVisible()
    // The badge must be visible for as long as the session skipped LINE.
    await expect(page.getByText('Admin')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('never leaves an approved session on the authorization screen', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.goto('/liff/authorization')

    await expect(page).toHaveURL(/\/liff\/forms$/)

    expect(consoleErrors).toEqual([])
  })

  test('opens the order-image form from the hub', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.goto('/liff/forms')

    await page.getByRole('link', { name: /อัปโหลดรูปภาพออเดอร์/ }).click()

    await expect(page).toHaveURL(/\/liff\/forms\/order-image$/)
    await expect(page.getByRole('heading', { name: 'อัปโหลดรูปภาพออเดอร์' })).toBeVisible()

    // The form sits one level below the hub, so its navbar carries the way
    // back to the hub.
    await page.getByRole('link', { name: 'กลับไปหน้าแบบฟอร์ม' }).click()
    await expect(page).toHaveURL(/\/liff\/forms$/)
    await expect(page.getByRole('heading', { name: 'แบบฟอร์ม' })).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('opens the line-walk form from the hub', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    await page.goto('/liff/forms')

    await page.getByRole('link', { name: /บันทึกจำนวนการเดินไลน์/ }).click()

    await expect(page).toHaveURL(/\/liff\/forms\/line-walk$/)
    await expect(
      page.getByRole('heading', { name: 'บันทึกจำนวนการเดินไลน์' }),
    ).toBeVisible()

    // The shell starts with one section and exposes its four fields.
    await expect(
      page.getByRole('region', { name: 'รายการที่ 1' }),
    ).toBeVisible()
    await expect(page.getByLabel(/วันที่ รายการที่ 1/)).toBeVisible()
    await expect(
      page.getByRole('combobox', { name: /ไลน์ผลิต รายการที่ 1/ }),
    ).toBeVisible()
    await expect(page.getByLabel(/ชื่อแบรนด์/)).toBeVisible()
    await expect(page.getByLabel(/Pack style/)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /บันทึกทั้งหมด/ }),
    ).toBeDisabled()

    // The dashed card appends a section, and the second can be removed.
    await page.getByRole('button', { name: /เพิ่มรายการ/ }).click()
    await expect(
      page.getByRole('region', { name: 'รายการที่ 2' }),
    ).toBeVisible()
    await expect(page.getByLabel(/วันที่ รายการที่/)).toHaveCount(2)

    await page.getByRole('button', { name: 'ลบรายการที่ 2' }).click()
    await expect(page.getByRole('region', { name: 'รายการที่ 2' })).toHaveCount(0)
    await expect(page.getByLabel(/วันที่ รายการที่/)).toHaveCount(1)

    await expect(
      page.getByText('ฟอร์มนี้อยู่ระหว่างพัฒนา ยังไม่บันทึกข้อมูล'),
    ).toBeVisible()

    await page.getByRole('link', { name: 'กลับไปหน้าแบบฟอร์ม' }).click()
    await expect(page).toHaveURL(/\/liff\/forms$/)
    await expect(page.getByRole('heading', { name: 'แบบฟอร์ม' })).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
