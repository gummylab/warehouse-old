import { expect, test } from '@playwright/test'

import { todayBangkok } from '../../lib/order-images/validation'

import { collectConsoleErrors } from './support/console'
import { seedLineWalk, uniqueSuffix } from './support/data'

// The admin surface is local-only (ADR 0007), and the e2e browser runs on
// 127.0.0.1, so the gate lets the page render without any setup.
test('lists line walks with the overview and table filters', async ({
  page,
}) => {
  const today = todayBangkok()
  const dayBrand = `E2E Walk Day ${uniqueSuffix()}`
  const nightBrand = `E2E Walk Night ${uniqueSuffix()}`

  seedLineWalk({
    walkDate: today,
    shift: 'day',
    line: 'ดอกแค',
    brand: dayBrand,
    packStyle: 'box',
    people: 3,
    amount: 30,
  })
  seedLineWalk({
    walkDate: today,
    shift: 'night',
    line: 'กุหลาบ',
    brand: nightBrand,
    packStyle: 'bag',
    people: 2,
    amount: 20,
  })

  const consoleErrors = collectConsoleErrors(page)
  await page.goto('/line-walks')

  await expect(
    page.getByRole('heading', { name: 'รายการเดินไลน์', level: 1 }),
  ).toBeVisible()

  const overview = page.getByRole('region', { name: 'ภาพรวมการเดินไลน์' })
  await expect(overview).toBeVisible()

  // Both seeded rows are in today's table.
  await expect(page.getByText(dayBrand, { exact: true })).toBeVisible()
  await expect(page.getByText(nightBrand, { exact: true })).toBeVisible()

  // The overview ignores the table filters: narrow the table, then compare.
  const kpi = overview.locator('[data-slot="line-walk-summary-value"]')
  const before = await kpi.allTextContents()

  await page.getByRole('combobox', { name: 'กะ' }).click()
  await page.getByRole('option', { name: 'กลางคืน' }).click()
  await page.getByRole('button', { name: 'ค้นหา' }).click()

  await expect(page).toHaveURL(/shift=night/)
  await expect(page.getByText(nightBrand, { exact: true })).toBeVisible()
  await expect(page.getByText(dayBrand, { exact: true })).toHaveCount(0)
  expect(await kpi.allTextContents()).toEqual(before)

  // Clear and search by brand.
  await page.getByRole('link', { name: 'ล้างตัวกรอง' }).click()
  await expect(page).toHaveURL(/\/line-walks$/)
  await page.getByLabel(/ค้นหาแบรนด์/).fill(dayBrand)
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(page.getByText(dayBrand, { exact: true })).toBeVisible()
  await expect(page.getByText(nightBrand, { exact: true })).toHaveCount(0)

  // The chart opens with both series and switches grain.
  await page.getByRole('link', { name: 'ล้างตัวกรอง' }).click()
  await page.getByRole('button', { name: 'แสดงกราฟ' }).click()
  await expect(
    page.getByRole('img', { name: /จำนวนคนและยอดสินค้า/ }),
  ).toBeVisible()

  const legend = page.locator('[data-slot="line-walk-chart-legend"]')
  await expect(legend.getByText('ยอดสินค้า')).toBeVisible()
  await expect(legend.getByText('จำนวนคน')).toBeVisible()

  await page.getByRole('combobox', { name: 'ช่วงภาพรวม' }).click()
  await page.getByRole('option', { name: 'เดือน' }).click()
  await expect(
    page.getByRole('img', { name: /จำนวนคนและยอดสินค้า/ }),
  ).toBeVisible()

  expect(consoleErrors).toEqual([])
})
