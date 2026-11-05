import type { Metadata } from 'next'
import Link from 'next/link'

import { FootprintsIcon, ImagePlusIcon } from 'lucide-react'

import { FormPage } from '@/components/layout/form-page'
import { PAGE_TITLES } from '@/lib/page-titles'

import { FormNavbar } from '../form-navbar'

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
    <FormPage
      width="full"
      header={<FormNavbar width="full" title="แบบฟอร์ม" />}>
      <FormCard
        href="/liff/forms/order-image"
        icon={<ImagePlusIcon />}
        title="อัปโหลดรูปภาพออเดอร์"
        description="แนบรูปภาพแพ็กเกจของไอเท็มตามเลขออเดอร์"
      />
      <FormCard
        href="/liff/forms/line-walk"
        icon={<FootprintsIcon />}
        title="บันทึกจำนวนการเดินไลน์"
        description="บันทึกจำนวนรอบที่เดินตรวจไลน์ผลิต"
      />
    </FormPage>
  )
}

// The whole card is the link, so the phone target is the full row and the
// browser's own navigation keeps working. Two forms already share the layout,
// so it lives here until a third surface needs it.
function FormCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted">
      <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
