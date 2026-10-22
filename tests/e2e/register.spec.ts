import { expect, test } from '@playwright/test'

import { deletePendingUser, getUserByLineId } from '../../lib/db/users'

import { collectConsoleErrors } from './support/console'
import { seedUser, uniqueSuffix } from './support/data'

// The approval queue on /register. Requests are seeded straight into the
// database because a real one needs a LINE-verified identity (ADR 0003), which
// a browser cannot produce; everything after that is the real UI and the real
// server actions.
//
// Every name carries a random suffix and each assertion is scoped to that
// user's row, since the specs share one database and the queue may hold rows
// created by another spec.
test('approving a request moves the user into the approved table', async ({ page }) => {
  const user = seedUser({ status: 'pending', displayName: `E2E Approve ${uniqueSuffix()}` })
  const consoleErrors = collectConsoleErrors(page)

  await page.goto('/register')
  await page.getByPlaceholder('ค้นหา...').fill(user.displayName)

  const pendingRow = page.getByRole('row').filter({ hasText: user.displayName })
  await expect(pendingRow).toBeVisible()

  await pendingRow.getByRole('button', { name: 'อนุมัติ' }).click()

  // The row leaves the queue as soon as the server action revalidates.
  await expect(pendingRow).toHaveCount(0)
  // The row leaving the table proves the UI updated, not that the write
  // reached the database: the revalidated RSC payload travels in the same
  // response and React commits it before the write is flushed. Polling is
  // what waits for the write itself.
  await expect.poll(() => getUserByLineId(user.lineUserId)?.status).toBe('approved')

  // The search term survives the tab switch, so the approved table shows the
  // same single row.
  await page.getByRole('tab', { name: /ผู้ใช้ที่อนุมัติแล้ว/ }).click()
  const approvedRow = page.getByRole('row').filter({ hasText: user.displayName })
  await expect(approvedRow).toBeVisible()

  expect(consoleErrors).toEqual([])
})

test('revoking an approved user deletes the row and closes the dialog', async ({ page }) => {
  const user = seedUser({ status: 'approved', displayName: `E2E Revoke ${uniqueSuffix()}` })

  await page.goto('/register')
  await page.getByRole('tab', { name: /ผู้ใช้ที่อนุมัติแล้ว/ }).click()
  await page.getByPlaceholder('ค้นหา...').fill(user.displayName)

  const approvedRow = page.getByRole('row').filter({ hasText: user.displayName })
  await approvedRow.getByRole('button', { name: 'เพิกถอนสิทธิ์' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(user.displayName)).toBeVisible()
  await dialog.getByRole('button', { name: 'เพิกถอนสิทธิ์' }).click()

  await expect(approvedRow).toHaveCount(0)
  await expect
    .poll(() => getUserByLineId(user.lineUserId))
    .toBeUndefined()
})

test('rejecting a request deletes the row instead of storing a status', async ({ page }) => {
  const user = seedUser({ status: 'pending', displayName: `E2E Reject ${uniqueSuffix()}` })

  await page.goto('/register')
  await page.getByPlaceholder('ค้นหา...').fill(user.displayName)

  const pendingRow = page.getByRole('row').filter({ hasText: user.displayName })
  await pendingRow.getByRole('button', { name: 'ปฏิเสธ' }).click()

  await expect(pendingRow).toHaveCount(0)
  // ADR 0003: there is no rejected row, the user simply sees the request
  // button again on their next visit.
  await expect.poll(() => getUserByLineId(user.lineUserId)).toBeUndefined()
})

test('a refused decision puts the row back in the table', async ({ page }) => {
  // The row leaves the table on the click, before the server answers, so
  // the optimistic removal has to be undone when the write is refused. The
  // request is deleted underneath the operator, which is what the server
  // action reports as "not found".
  const user = seedUser({ status: 'pending', displayName: `E2E Refused ${uniqueSuffix()}` })

  await page.goto('/register')
  await page.getByPlaceholder('ค้นหา...').fill(user.displayName)

  const pendingRow = page.getByRole('row').filter({ hasText: user.displayName })
  await expect(pendingRow).toBeVisible()

  // The request disappears between the operator opening the page and
  // clicking the button, so the server refuses the decision.
  deletePendingUser(user.id)

  await pendingRow.getByRole('button', { name: 'อนุมัติ' }).click()

  // The refusal is reported next to the button, and the row comes back:
  // the operator has to see that their click did nothing.
  await expect(page.getByText('ไม่พบคำขอนี้')).toBeVisible()
  await expect(pendingRow).toBeVisible()
})
