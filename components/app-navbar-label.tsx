'use client'

import { usePathname } from 'next/navigation'

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { getPageTitle } from '@/lib/page-titles'

// Single responsibility: show the current page title as plain text.
export function AppNavbarLabel() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
