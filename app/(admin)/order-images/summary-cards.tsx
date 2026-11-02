'use client'

import { ImageIcon, PackageIcon, ShoppingCartIcon } from 'lucide-react'

import { useIsMobile } from '@/hooks/use-mobile'
import type { OrderSummary, SummaryScope } from '@/lib/db/types'
import { cn } from '@/lib/utils'

// The values follow the selected KPI scope: filtered counts only the orders
// matching the filter bar; all counts the whole system. The table below stays
// narrowed by the filter bar in both cases.
//
// One strip with dividers rather than three free-floating cards: the three
// numbers belong to one set, and the shared surface keeps the row from
// leaving an orphan card on the second line at medium widths.
export function SummaryCards({
  summary,
  scope,
}: {
  summary: OrderSummary
  scope: SummaryScope
}) {
  const all = scope === 'all'

  return (
    <section
      aria-label="ภาพรวมออเดอร์"
      className="grid shrink-0 grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border bg-card text-card-foreground">
      <SummaryCard
        icon={<ShoppingCartIcon />}
        label={all ? 'ออเดอร์ทั้งหมด' : 'ออเดอร์'}
        value={summary.orders}
      />
      <SummaryCard
        icon={<PackageIcon />}
        label={all ? 'ไอเท็มทั้งหมด' : 'ไอเท็ม'}
        value={summary.items}
      />
      <SummaryCard
        icon={<ImageIcon />}
        label={all ? 'รูปภาพทั้งหมด' : 'รูปภาพ'}
        value={summary.images}
      />
    </section>
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
