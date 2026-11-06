import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

export const metadata: Metadata = {
  title: PAGE_TITLES['/line-walks'],
}

// Stub for the line-walk records screen. The data and the table come later;
// the route and the sidebar entry exist now so the navigation is in place.
export default function LineWalksPage() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      หน้านี้อยู่ระหว่างพัฒนา
    </div>
  )
}
