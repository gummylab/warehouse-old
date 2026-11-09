import type { Metadata } from 'next'

import { ConstructionIcon } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { PAGE_TITLES } from '@/lib/page-titles'

export const metadata: Metadata = {
  title: PAGE_TITLES['/'],
}

// The overview this page will show does not exist yet. Until it does, the page
// says so plainly instead of rendering an empty report, and the header, the
// sidebar and the footer still lead to the screens that do work.
export default function DashboardPage() {
  return (
    <EmptyState
      variant="page"
      icon={<ConstructionIcon />}
      title="อยู่ระหว่างการพัฒนา"
      description="กำลังพัฒนาหน้าภาพรวม ระหว่างนี้เลือกใช้งานเมนูเพื่อไปยังหน้าที่ต้องการได้"
    />
  )
}
