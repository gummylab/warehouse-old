import type { Metadata } from 'next'

import { ChevronLeftIcon } from 'lucide-react'

import { FormPage } from '@/components/layout/form-page'
import { ButtonLink } from '@/components/ui/button'
import { PAGE_TITLES } from '@/lib/page-titles'

import { FormNavbar } from '../../form-navbar'

// Same instant-navigation opt-out as the other form routes: the LIFF gate
// withholds children until the session resolves (see /liff/forms).
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/liff/forms/line-walk'],
}

// Placeholder for the line-walk form. The hub can link there today; the form
// body replaces this message without moving the route.
export default function LineWalkPage() {
  return (
    <FormPage
      header={
        <FormNavbar
          title="บันทึกจำนวนการเดินไลน์"
          action={
            <ButtonLink
              variant="ghost"
              size="icon"
              aria-label="กลับไปหน้าแบบฟอร์ม"
              href="/liff/forms">
              <ChevronLeftIcon />
            </ButtonLink>
          }
        />
      }>
      <p className="text-sm text-muted-foreground">
        ฟอร์มนี้อยู่ระหว่างพัฒนา
      </p>
    </FormPage>
  )
}
