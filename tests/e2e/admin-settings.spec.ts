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
