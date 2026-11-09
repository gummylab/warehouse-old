import type { Metadata } from 'next'

import { FormPage } from '@/components/layout/form-page'
import { PAGE_TITLES } from '@/lib/page-titles'

import { FormNavbar } from '../form-navbar'
import { FormsHub } from './forms-hub'

// The LIFF layout gate withholds this page until the LINE session resolves
// (status loading → the gate shows its notice instead of children), so the
// dev server's instant-navigation simulation never renders this segment and
// reports it as "dropped". The masking is the design, not a defect — this
// opts the route out of that validation (docs: instant-navigation guide).
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/liff/forms'],
}

// Form hub for approved LINE users (the layout gate sends them here first).
// The cards come from the grants the status call returned, so a user sees
// only the forms the admin picked for them.
export default function FormsPage() {
  return (
    <FormPage
      width="full"
      header={<FormNavbar width="full" title="แบบฟอร์ม" />}>
      <FormsHub />
    </FormPage>
  )
}
