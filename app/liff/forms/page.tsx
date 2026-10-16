import type { Metadata } from 'next'

import { PAGE_TITLES } from '@/lib/page-titles'

// The LIFF layout gate withholds this page until the LINE session resolves
// (status loading → the gate shows its notice instead of children), so the
// dev server's instant-navigation simulation never renders this segment and
// reports it as "dropped". The masking is the design, not a defect — this
// opts the route out of that validation (docs: instant-navigation guide).
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/liff/forms'],
}

// First landing spot for approved LINE users (the layout gate sends them
// here); the real form replaces this placeholder later.
export default function FormsPage() {
  return <p className="text-muted-foreground">อยู่ระหว่างการพัฒนา</p>
}
