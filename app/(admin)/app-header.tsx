'use client'

import { usePathname } from 'next/navigation'

import { PageHeader } from '@/components/layout/page-header'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { getPageTitle } from '@/lib/page-titles'

// The admin top bar: the sidebar trigger on the left and the current page
// title in the header. Keeping it a client component lets the title follow
// client navigation without making the layout itself dynamic.
export function AppHeader() {
  const title = getPageTitle(usePathname())

  return <PageHeader title={title} leading={<SidebarTrigger className="-ml-1" />} sticky />
}
