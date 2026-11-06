import { expect, test } from '@playwright/test'

// The admin surface is local-only (ADR 0007), and the e2e browser runs on
// 127.0.0.1, so the gate lets the page render without any setup.
test('shows the line-walk admin page stub', async ({ page }) => {
  await page.goto('/line-walks')

  await expect(
    page.getByRole('heading', { name: 'รายการเดินไลน์', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('หน้านี้อยู่ระหว่างพัฒนา')).toBeVisible()
})
