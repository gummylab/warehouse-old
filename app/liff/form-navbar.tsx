'use client'

import { PageHeader } from '@/components/layout/page-header'

import { LocalDeviceBadge } from './local-device-badge'

// The compact sticky header of a LIFF form. It is a thin wrapper over the
// shared PageHeader so the title, the back control and the local-device
// badge keep the same spacing as the admin header.
//
// The header owns its own padding and sits outside the padded body (see
// FormPage), so it spans the viewport without a negative margin.
export function FormNavbar({
  title,
  subtitle,
  action,
  width = 'form',
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  width?: 'form' | 'full'
}) {
  return (
    <PageHeader
      variant="form"
      width={width}
      sticky
      title={title}
      subtitle={subtitle}
      leading={action}
      trailing={<LocalDeviceBadge />}
    />
  )
}
