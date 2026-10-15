import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { PAGE_TITLES } from '@/lib/page-titles'

export const metadata: Metadata = {
  title: PAGE_TITLES['/liff/authorization'],
}

export default function AuthorizationPage() {
  return (
    <main>
      <Button>ขอสิทธิ์การใช้งานระบบ</Button>
    </main>
  )
}
