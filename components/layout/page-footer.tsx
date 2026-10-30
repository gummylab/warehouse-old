import { cn } from '@/lib/utils'

// The last row of a page. It is not sticky: the document scrolls, so the
// footer simply sits after the content. Sticky action bars belong to the
// form that needs one, not to the shell.
export function PageFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <footer
      data-slot="page-footer"
      className={cn(
        'shrink-0 border-t px-4 py-2 text-xs text-muted-foreground md:px-6',
        className,
      )}>
      {children}
    </footer>
  )
}
