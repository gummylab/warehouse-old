import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// A responsive grid of equal tiles: items, varieties, or photos. The column
// count follows the viewport, and the minimum tile width keeps a phone at two
// columns instead of a fixed breakpoint list.
export function TileGrid({
  label,
  children,
  className,
}: {
  // Gives the section an accessible name, so several grids on one page are
  // distinguishable to a screen reader.
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={label}
      data-slot="tile-grid"
      className={cn(
        'grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 rounded-xl border p-4',
        className,
      )}>
      {children}
    </section>
  )
}

// The dashed add cell that closes a tile grid. It carries the size overrides
// the grid needs (`h-auto`, the vertical layout and the padding) so pages do
// not have to override the Button primitive every time.
export function TileButton({
  label,
  hint,
  icon,
  height = 'default',
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string
  hint?: string
  icon?: React.ReactNode
  height?: 'default' | 'tall'
}) {
  return (
    <Button
      variant="outline"
      className={cn(
        'h-auto flex-col gap-2 rounded-xl border-dashed',
        height === 'tall' ? 'py-14' : 'py-10',
        className,
      )}
      {...props}>
      {icon ?? <PlusIcon />}
      <span className="text-xs leading-tight">{label}</span>
      {hint ? (
        <span className="text-xs leading-tight text-muted-foreground">{hint}</span>
      ) : null}
    </Button>
  )
}
