import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

export const metadata: Metadata = {
  title: PAGE_TITLES['/order-images'],
}

export default function OrderImageManagementPage() {
  return <p>จัดการรูปภาพออเดอร์</p>
}
