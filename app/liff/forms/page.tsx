import type { Metadata } from 'next'
import Link from 'next/link'

import { ImagePlusIcon } from 'lucide-react'

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

// Form hub for approved LINE users (the layout gate sends them here first):
// one entry per form, each a plain link so the browser back gesture and
// shared URLs keep working without client-side routing state.
export default function FormsPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">แบบฟอร์ม</h1>
      <Link
        href="/liff/form/order-image"
        className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted"
      >
        <ImagePlusIcon className="size-5 text-muted-foreground" />
        <span className="flex flex-col">
          <span className="font-medium">อัปโหลดรูปภาพออเดอร์</span>
          <span className="text-sm text-muted-foreground">
            แนบรูปภาพแพ็กเกจของไอเท็มตามเลขออเดอร์
          </span>
        </span>
      </Link>
    </div>
  )
}
