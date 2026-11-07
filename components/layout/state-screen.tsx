import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// One layout for every non-actionable screen: loading, empty, error and
// not-found. The page shells provide the height, so this component only
// centres its own content with `flex-1` and never sets a viewport height.
export function StateScreen({
  title,
  description,
  reference,
  debug,
  actions,
  tone = 'neutral',
  loading = false,
  headingLevel = 'h1',
  className,
}: {
  title: string
  description?: string
  // A digest the operator can match against the server log.
  reference?: string
  // Development-only diagnosis (for example the LIFF bootstrap stage).
  debug?: string
  actions?: React.ReactNode
  tone?: 'neutral' | 'error'
  loading?: boolean
  // Use h2 when the page already has the shell's h1 above it (the admin
  // error boundary renders inside AppHeader).
  headingLevel?: 'h1' | 'h2'
  className?: string
}) {
  const headingClassName = cn(
    'text-lg font-semibold',
    tone === 'error' && 'text-destructive',
  )

  return (
    <div
      data-slot="state-screen"
      role={tone === 'error' ? 'alert' : undefined}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center',
        className,
      )}>
      {/* The title below is the live announcement; hiding the spinner
          avoids reading "กำลังโหลด" twice. */}
      {loading ? <Spinner aria-hidden="true" className="size-6" /> : null}

      {loading ? (
        <p role="status" className={headingClassName}>
          {title}
        </p>
      ) : headingLevel === 'h2' ? (
        <h2 className={headingClassName}>{title}</h2>
      ) : (
        <h1 className={headingClassName}>{title}</h1>
      )}

      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}

      {reference ? (
        <p className="text-xs text-muted-foreground">รหัสอ้างอิง: {reference}</p>
      ) : null}

      {debug ? <p className="text-xs text-muted-foreground">{debug}</p> : null}

      {actions ? <div className="flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </div>
  )
}
