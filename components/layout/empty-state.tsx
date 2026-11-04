import type { ReactNode } from 'react'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'

// One empty state for every "there is no data yet" screen on both surfaces.
//
// It wraps shadcn's Empty primitive for two reasons:
//   1. EmptyTitle renders a <div>, so a page-level empty state would have no
//      heading at all. This component renders a real <h2> where the screen
//      needs one, and keeps the div only for inline notes.
//   2. Empty ships with flex-1 and p-12, which is right for a page that fills
//      the shell and wrong inside a card, a table or a phone form. The
//      variants below own that difference so pages do not repeat overrides.
//
// Both shells (the admin AppHeader and the LIFF FormNavbar) already render the
// page's <h1>, so page and section default to <h2>. Pass headingLevel="none"
// when the empty state is a note inside a table cell, and headingLevel="h1"
// only on a screen that renders outside both shells.
export type EmptyStateVariant = 'page' | 'section' | 'inline'

export function EmptyState({
  title,
  description,
  icon,
  actions,
  variant = 'section',
  headingLevel,
  announce = false,
  bordered,
  className,
}: {
  title: string
  description?: string
  // A lucide icon element, rendered inside the muted square.
  icon?: ReactNode
  actions?: ReactNode
  variant?: EmptyStateVariant
  headingLevel?: 'h1' | 'h2' | 'none'
  // Search-triggered empties appear after the user acts, so a polite live
  // region announces the result. Initial empties stay silent on purpose.
  announce?: boolean
  // Defaults per variant: page has no frame, section and inline show the
  // dashed outline. Empty only sets border-dashed, so the width is added here.
  bordered?: boolean
  className?: string
}) {
  const resolvedHeading =
    headingLevel ?? (variant === 'inline' ? 'none' : 'h2')
  const showBorder = bordered ?? variant !== 'page'

  return (
    <Empty
      data-slot="empty-state"
      role={announce ? 'status' : undefined}
      className={cn(
        variant === 'page' && 'flex-1 p-6 sm:p-12',
        variant === 'section' && 'flex-none p-6 sm:p-8',
        variant === 'inline' && 'flex-none gap-2 p-4 sm:p-6',
        showBorder ? 'border' : 'border-0',
        className,
      )}>
      <EmptyHeader>
        {icon ? (
          <EmptyMedia
            variant="icon"
            className={cn(variant === 'inline' && 'size-8 rounded-lg')}>
            {icon}
          </EmptyMedia>
        ) : null}

        {resolvedHeading === 'none' ? (
          <EmptyTitle className={cn(variant === 'inline' && 'text-base')}>
            {title}
          </EmptyTitle>
        ) : resolvedHeading === 'h2' ? (
          <h2 className={titleClassName(variant)}>{title}</h2>
        ) : (
          <h1 className={titleClassName(variant)}>{title}</h1>
        )}

        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>

      {actions ? <EmptyContent>{actions}</EmptyContent> : null}
    </Empty>
  )
}

// Matches EmptyTitle's own classes so a real heading looks the same as the
// div the primitive ships with.
function titleClassName(variant: EmptyStateVariant): string {
  return cn(
    'font-heading text-lg font-medium tracking-tight',
    variant === 'inline' && 'text-base',
  )
}
