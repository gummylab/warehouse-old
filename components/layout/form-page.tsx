import { cn } from '@/lib/utils'

import { PageBody } from './page-body'

// The frame of a LIFF form page: a full-bleed sticky header and a body that
// uses the shared page body for its gutter. `width="form"` keeps the 42rem
// reading column; `width="full"` lets a page with tiles (the order-image form
// and its item page) use the desktop width. The bottom padding respects the
// phone's safe area.
export function FormPage({
  header,
  children,
  width = 'form',
  className,
}: {
  header: React.ReactNode
  children: React.ReactNode
  width?: 'form' | 'full'
  className?: string
}) {
  return (
    <div data-slot="form-page" className={cn('flex flex-1 flex-col', className)}>
      {header}
      <PageBody
        width={width}
        fill
        className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </PageBody>
    </div>
  )
}
