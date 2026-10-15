import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

export const metadata: Metadata = {
  title: PAGE_TITLES['/'],
}

export default function DashboardPage() {
  return <main>Dashboard</main>
}
