import type { Metadata } from 'next'
import { io } from 'next/cache'

import { storageRoot } from '@/lib/order-images/storage'
import { PAGE_TITLES } from '@/lib/page-titles'
import { databaseFile } from '@/lib/settings/paths'

import { LocationsCard } from './locations-card'

// Both values are read from disk, so the page has to run per request: a
// prerendered page would bake the build machine's paths into the HTML.
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/settings'],
}

export default async function SettingsPage() {
  await io()

  return (
    <LocationsCard
      databasePath={databaseFile()}
      storagePath={storageRoot()}
    />
  )
}
