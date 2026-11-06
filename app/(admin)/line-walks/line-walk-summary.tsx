'use client'

import { ClipboardListIcon, PackageIcon, UsersIcon } from 'lucide-react'

import { useIsMobile } from '@/hooks/use-mobile'
import type { LineWalkSummary } from '@/lib/db/types'
import { cn } from '@/lib/utils'

// The three numbers for the chosen overview window. The card owns the border
// and the aria-label; this grid only lays the cells out and draws the line
// between them and the chart below.
export function LineWalkSummaryCards({
  summary,
}: {
  summary: LineWalkSummary
}) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border border-t">
      <SummaryCell
        icon={<ClipboardListIcon />}
        label="บันทึก"
        value={summary.records}
        unit="รายการ"
      />
      <SummaryCell
        icon={<UsersIcon />}
        label="จำนวนคน"
        value={summary.people}
        unit="คน"
      />
      <SummaryCell
        icon={<PackageIcon />}
        label="ยอดสินค้า"
        value={summary.amount}
        unit="ชิ้น"
      />
    </div>
  )
}

function SummaryCell({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
}) {
  const mobile = useIsMobile()

  return (
    <div className="flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      {!mobile && (
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-9 [&_svg]:size-4">
          {icon}
        </span>
      )}

      <div
        className={cn(
          !mobile && 'flex',
          'min-w-0 flex-1 items-center gap-4',
        )}>
        <p className="truncate text-center text-xs text-muted-foreground">
          {label}
        </p>
        <p
          data-slot="line-walk-summary-value"
          className={cn(
            'text-center text-xl font-semibold tabular-nums sm:text-2xl',
            value === 0 && 'text-muted-foreground',
          )}>
          {value.toLocaleString('th-TH')}
        </p>
        <p className="truncate text-center text-xs text-muted-foreground">
          {unit}
        </p>
      </div>
    </div>
  )
}
