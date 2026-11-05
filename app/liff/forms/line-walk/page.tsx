import type { Metadata } from 'next'

import { io } from 'next/cache'

import { listLines } from '@/lib/db/order-images'
import { PAGE_TITLES } from '@/lib/page-titles'

import { LineWalkForm } from './line-walk-form'

// Same instant-navigation opt-out as the other form routes: the LIFF gate
// withholds children until the session resolves (see /liff/forms).
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/liff/forms/line-walk'],
}

// The form shell is UI-only for now. The catalog read is what lets the line
// select offer the same list as the order-image form; saving comes later.
export default async function LineWalkPage() {
  await io()
  const lines = listLines()

  return <LineWalkForm lines={lines} />
}
