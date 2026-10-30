import { randomUUID } from 'node:crypto'

// Relative imports, unlike the unit tests: this file is loaded by the
// Playwright test loader rather than by Next or Vite, so it does not resolve
// the "@/*" alias.
//
// A LINE-verified identity cannot be produced from a browser (ADR 0003), so
// the register queue and the cookie cases are set up by writing the same rows
// the LIFF endpoints would write, through the same data layer the server
// uses. The paths those modules read are set by playwright.config.ts before
// any worker starts.
import { approvePendingUser, createPendingUser } from '../../../lib/db/users'

export type SeededUser = {
  id: string
  lineUserId: string
  displayName: string
  status: 'pending' | 'approved'
}

// Names and ids carry a random suffix: the specs share one database, so a row
// created by another spec must never match a locator or a lookup.
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8)
}

export function seedUser({
  status,
  displayName = `E2E User ${uniqueSuffix()}`,
  lineUserId = `U-e2e-${randomUUID()}`,
}: {
  status: 'pending' | 'approved'
  displayName?: string
  lineUserId?: string
}): SeededUser {
  const created = createPendingUser({ lineUserId, displayName })
  if (status === 'approved') {
    // The same write the register screen performs, so the row looks like any
    // other approved user to the server.
    approvePendingUser(created.id, new Date().toISOString())
  }
  return { id: created.id, lineUserId, displayName, status }
}
