'use client'

import Link from 'next/link'

import { FootprintsIcon, ImagePlusIcon, LockIcon } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { formById, type FormId } from '@/lib/forms/registry'

import { useLiffSession } from '../liff-session-context'

// What each card needs beyond the registry: the icon and the one-line
// description. The label and the route come from the registry, so a form's
// name stays in one place. A new form needs an entry here as well, which is
// why the map is keyed by FormId: the compiler points at this file.
const CARD_DETAILS: Record<FormId, { icon: React.ReactNode; description: string }> = {
  'order-image': {
    icon: <ImagePlusIcon />,
    description: 'แนบรูปภาพแพ็กเกจของไอเท็มตามเลขออเดอร์',
  },
  'line-walk': {
    icon: <FootprintsIcon />,
    description: 'บันทึกจำนวนรอบที่เดินตรวจไลน์ผลิต',
  },
}

// The form hub for an approved LINE user. It renders only the forms the
// status call granted, in the order the server sent them. The gate has already
// withheld this page until the session resolves, so `forms` is final here.
export function FormsHub() {
  const { forms } = useLiffSession()

  if (forms.length === 0) {
    return (
      <EmptyState
        variant="page"
        icon={<LockIcon />}
        title="ยังไม่ได้รับสิทธิ์แบบฟอร์ม"
        description="กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ใช้งาน"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {forms.map((id) => {
        const form = formById(id)
        const details = form ? CARD_DETAILS[form.id] : undefined
        if (!form || !details) return null

        return (
          <FormCard
            key={form.id}
            href={form.path}
            icon={details.icon}
            title={form.label}
            description={details.description}
          />
        )
      })}
    </div>
  )
}

// The whole card is the link, so the phone target is the full row and the
// browser's own navigation keeps working.
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
