import { expect, test } from '@playwright/test'

import { collectConsoleErrors } from './support/console'

// The dashboard has no overview yet, so the page is a placeholder. This spec
// pins what the operator should see there and keeps the page from drifting
// back into a half-built screen. The admin surface is local-only (ADR 0007)
// and the browser runs on 127.0.0.1, so the page renders without any setup.
test('shows the under-development placeholder', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')

  // The header owns the page title, so the placeholder does not repeat it.
  await expect(page.getByRole('heading', { name: 'แดชบอร์ด', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'อยู่ระหว่างการพัฒนา' })).toBeVisible()
  await expect(page.locator('[data-slot="empty-state"]')).toBeVisible()

  expect(errors).toEqual([])
})
