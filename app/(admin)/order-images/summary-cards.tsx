import {
  ImageIcon,
  PackageIcon,
  ShoppingCartIcon,
} from 'lucide-react'

import type { OrderSummary } from '@/lib/db/types'

// The three facts an operator checks before opening the table. The values are
// global, not filtered, so the summary keeps its meaning while the table
// below is narrowed by the filter bar.
export function SummaryCards({ summary }: { summary: OrderSummary }) {
  return (
    <section aria-label="ภาพรวมออเดอร์" className="grid grid-cols-2 gap-4 xl:grid-cols-3">
      <SummaryCard
        icon={<ShoppingCartIcon />}
        label="ออเดอร์ทั้งหมด"
        value={summary.orders.toLocaleString('th-TH')}
      />
      <SummaryCard
        icon={<PackageIcon />}
        label="ไอเท็มทั้งหมด"
        value={summary.items.toLocaleString('th-TH')}
      />
      <SummaryCard
        icon={<ImageIcon />}
        label="รูปภาพทั้งหมด"
        value={summary.images.toLocaleString('th-TH')}
      />
    </section>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
