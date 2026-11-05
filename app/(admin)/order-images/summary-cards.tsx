'use client'

import { ImageIcon, PackageIcon, ShoppingCartIcon } from 'lucide-react'

import { useIsMobile } from '@/hooks/use-mobile'
import type { OrderSummary } from '@/lib/db/types'
import { cn } from '@/lib/utils'

// The KPI cells inside the overview card. The card owns the border, the
// background and the aria-label; this grid only lays the three numbers out and
// draws the line between them and the chart below.
export function SummaryCards({ summary }: { summary: OrderSummary }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border border-t">
      <SummaryCard
        icon={<ShoppingCartIcon />}
        label="ออเดอร์"
        value={summary.orders}
      />
      <SummaryCard
        icon={<PackageIcon />}
        label="ไอเท็ม"
        value={summary.items}
      />
      <SummaryCard
        icon={<ImageIcon />}
        label="รูปภาพ"
        value={summary.images}
      />
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const mobile = useIsMobile()

  return (
    <div className="flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      {/* The icon is decorative: the label and the number carry the meaning. */}
      {!mobile && (
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-9 [&_svg]:size-4">
          {icon}
        </span>
      )}

      <div className={cn(!mobile && 'flex', 'min-w-0 flex-1 gap-4 items-center')}>
        <p className="text-center truncate text-xs text-muted-foreground">{label}</p>
        <p
          data-slot="summary-value"
          className={cn(
            'text-xl font-semibold tabular-nums sm:text-2xl text-center',
            // A zero is a real answer, but it should not compete with the
            // counts that carry work.
            value === 0 && 'text-muted-foreground'
          )}>
          {value.toLocaleString('th-TH')}
        </p>
        <p className="text-center truncate text-xs text-muted-foreground">รายการ</p>
      </div>
    </div>
  )
}
