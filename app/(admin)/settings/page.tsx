import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

export const metadata: Metadata = {
  title: PAGE_TITLES['/settings'],
}

// Placeholder on purpose: the route exists so the sidebar entry has a real
// destination. The page holds nothing until the first setting is designed;
// the admin layout already supplies the header, the shell and the local-only
// gate, so there is nothing to repeat here.
export default function SettingsPage() {
  return null
}
