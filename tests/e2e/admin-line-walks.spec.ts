import { expect, test, type APIRequestContext } from '@playwright/test'

import { todayBangkok } from '../../lib/order-images/validation'

import { collectConsoleErrors } from './support/console'
import { seedLineWalk, uniqueSuffix } from './support/data'
import { toNumbers } from './support/numbers'

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
    page.getByRole('heading', { name: 'บันทึกการเดินไลน์', level: 1 }),
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

  // Clear and search by brand. The brand and the pack style have their own
  // fields now, so the label is just "แบรนด์" (it no longer says ค้นหา).
  await page.getByRole('link', { name: 'ล้างตัวกรอง' }).click()
  await expect(page).toHaveURL(/\/line-walks$/)
  await page.getByLabel('แบรนด์', { exact: true }).fill(dayBrand)
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(page.getByText(dayBrand, { exact: true })).toBeVisible()
  await expect(page.getByText(nightBrand, { exact: true })).toHaveCount(0)

  // The pack style is a separate field now: matching it keeps the row whose
  // pack style matches, and the brand box no longer matches it.
  await page.getByRole('link', { name: 'ล้างตัวกรอง' }).click()
  await expect(page).toHaveURL(/\/line-walks$/)
  await page.getByLabel('Pack style', { exact: true }).fill('bag')
  await page.getByRole('button', { name: 'ค้นหา' }).click()
  await expect(page).toHaveURL(/packStyle=bag/)
  await expect(page.getByText(nightBrand, { exact: true })).toBeVisible()
  await expect(page.getByText(dayBrand, { exact: true })).toHaveCount(0)

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

// A write on the phone has to show up in the overview on the next load, not
// the one after it. Every POST goes through the endpoint the form uses, which
// is what expires the cached overview; on 127.0.0.1 the request is trusted as
// local device mode (ADR 0004) and needs no cookie.
//
// The first write only primes: it makes the values read next come from the
// cache's fresh recomputation rather than from an entry an earlier e2e run
// left behind in the shared dist folder. The second write is the measured one.
//
// One reload only. With stale-while-revalidate semantics that reload would be
// answered from the entry cached before the second write, so the numbers would
// still be the old ones and this test would fail.
test('updates the overview on the first load after a write', async ({
  page,
  request,
}) => {
  await saveLineWalk(request, `E2E Prime ${uniqueSuffix()}`, 13, 131)

  await page.goto('/line-walks')
  const kpi = page
    .getByRole('region', { name: 'ภาพรวมการเดินไลน์' })
    .locator('[data-slot="line-walk-summary-value"]')
  // The overview streams in behind a Suspense boundary, so the values are not
  // in the DOM when the load event fires.
  await expect(kpi).toHaveCount(3)
  const before = toNumbers(await kpi.allTextContents())

  await saveLineWalk(request, `E2E Fresh ${uniqueSuffix()}`, 7, 70)

  await page.reload()
  await expect(kpi).toHaveCount(3)

  // The cells are บันทึก, จำนวนคน and ยอดสินค้า, in that order.
  const after = toNumbers(await kpi.allTextContents())
  expect(after).toEqual([before[0] + 1, before[1] + 7, before[2] + 70])
})

// The phone's own write path, so the POST and its revalidation run exactly as
// they do in the app.
async function saveLineWalk(
  request: APIRequestContext,
  brand: string,
  people: number,
  amount: number,
): Promise<void> {
  const response = await request.post('/api/liff/line-walks', {
    data: {
      entries: [
        {
          walkDate: todayBangkok(),
          shift: 'day',
          line: 'ดอกแค',
          brand,
          packStyle: 'box',
          people,
          amount,
        },
      ],
    },
  })
  expect(response.status()).toBe(200)
}
