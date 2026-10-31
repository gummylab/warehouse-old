import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// The top bar of a page. One component for both surfaces so the title, the
// leading control, the trailing status and the sticky behaviour can never
// drift apart again.
//
// `admin` is the taller desktop header; `form` is the compact phone header
// used by /liff forms. The bar owns its own horizontal padding, and the form
// variant caps its inner row at the same 42rem width as FormPage, so the
// title and the form below it share one left edge on a tablet.
export function PageHeader({
  title,
  subtitle,
  leading,
  trailing,
  sticky = false,
  variant = 'admin',
  className,
}: {
  title: string
  subtitle?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  sticky?: boolean
  variant?: 'admin' | 'form'
  className?: string
}) {
  return (
    <header
      data-slot="page-header"
      data-variant={variant}
      className={cn(
        'flex w-full shrink-0 border-b bg-background/80 backdrop-blur-md',
        variant === 'admin' ? 'h-16' : 'min-h-14',
        sticky && 'sticky top-0 z-20',
        className
      )}>
      <div
        className={cn(
          'flex w-full items-center gap-2',
          variant === 'admin' ? 'px-4 md:px-6' : 'mx-auto max-w-2xl px-4 py-2 md:px-6'
        )}>
        {leading ? (
          <>
            {leading}
            <Separator orientation="vertical" className="my-6" />
          </>
        ) : null}

        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>

        {trailing ? <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
    </header>
  )
}
