'use client'

import { Separator } from '@/components/ui/separator'
import { LocalDeviceBadge } from './local-device-badge'

// The sticky bar over a form.
//
// It spans the full width of the viewport (-mx-4 cancels the padding the
// liff layout puts around the content, px-4 puts the content back inside
// it) and sticks to the top while the form scrolls. The travel is bounded
// by the parent that renders it, so the parent has to wrap the whole form
// and not just its top.
//
// Three slots, so any form can use it: the title, an optional second line
// and an optional control on the right. The badge names local device mode
// while the session skipped LINE (ADR 0004), so a screen on this machine
// is never mistaken for what a LINE user sees.
//
// The bar is frosted: a translucent background with a backdrop blur, so the
// content scrolling underneath shows through as a soft wash instead of
// disappearing behind a solid panel.
export function FormNavbar({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center min-w-0 gap-x-1">
        {action && (
          <>
            {action}
            <Separator orientation="vertical" className="my-2" />
          </>
        )}

        <div className="flex flex-col ml-2">
          <h1 className="truncate font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LocalDeviceBadge />
      </div>
    </header>
  )
}
