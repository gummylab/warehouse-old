import { cn } from '@/lib/utils'

import { PageBody } from './page-body'

// The frame of a LIFF form page: a full-bleed sticky header and a body that
// uses the shared page body for its gutter and 42rem cap. The bottom padding
// respects the phone's safe area.
export function FormPage({
  header,
  children,
  className,
}: {
  header: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="form-page" className={cn('flex flex-1 flex-col', className)}>
      {header}
      <PageBody
        width="form"
        fill
        className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </PageBody>
    </div>
  )
}
