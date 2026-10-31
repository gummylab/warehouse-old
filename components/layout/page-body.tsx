import { cn } from '@/lib/utils'

// The padded content area of a page. It owns the page gutter, so a page
// never has to repeat `p-4 md:p-6`, and it can cap the content width for
// the LIFF forms without touching the header above it.
export function PageBody({
  id,
  width = 'full',
  fill = false,
  scroll = false,
  className,
  children,
}: {
  // The skip link target. Only the shell that renders the skip link needs it.
  id?: string
  width?: 'full' | 'form'
  // Use when the parent is a flex column and this area should take the
  // remaining height (the admin shell and the data table depend on it).
  fill?: boolean
  // Make this area the scroll container. The admin shell uses it so the
  // document itself never scrolls; a page that fills the height (the order
  // list) leaves it idle and scrolls its own table instead.
  scroll?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      id={id}
      // The skip link target must be programmatically focusable, or the
      // browser scrolls without moving focus.
      tabIndex={id ? -1 : undefined}
      data-slot="page-body"
      className={cn(
        'flex flex-col gap-4 px-4 py-4 md:px-6',
        fill && 'flex-1 md:min-h-0',
        scroll && 'md:overflow-y-auto',
        width === 'form' && 'mx-auto w-full max-w-[42rem]',
        className,
      )}>
      {children}
    </div>
  )
}
