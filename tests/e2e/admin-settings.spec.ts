import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { collectConsoleErrors } from './support/console'
import { E2E_STORAGE_DIR } from './support/env'

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

  const database = page.getByLabel('ฐานข้อมูล', { exact: true })
  const storage = page.getByLabel('ที่จัดเก็บ', { exact: true })

  await expect(database).toHaveValue(/.+\.db$/)
  await expect(storage).toHaveValue(/order-images$/)

  const moved = join(E2E_STORAGE_DIR, 'moved')
  await storage.fill(moved)
  await page.getByRole('button', { name: 'บันทึกที่จัดเก็บ' }).click()
  await expect(page.getByText('บันทึกตำแหน่งที่ตั้งแล้ว')).toBeVisible()
  // The rule appends the app's folder name, and the field shows what the app
  // will actually use rather than what was typed.
  await expect(storage).toHaveValue(join(moved, 'order-images'))

  // A database file that does not exist yet must be confirmed before the app
  // switches to a brand-new empty database.
  const missing = join(E2E_STORAGE_DIR, 'missing.db')
  await database.fill(missing)
  await page.getByRole('button', { name: 'บันทึกฐานข้อมูล' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'ยกเลิก' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(database).toHaveValue(missing)

  // Put the run's own root back, so a later spec and the next run see the
  // same folder.
  await storage.fill(E2E_STORAGE_DIR)
  await page.getByRole('button', { name: 'บันทึกที่จัดเก็บ' }).click()
  await expect(storage).toHaveValue(
    join(E2E_STORAGE_DIR, 'order-images'),
  )

  expect(errors).toEqual([])
})
