'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { orderListHref, type OrderListFilters } from '@/lib/order-images/filters'

// The KPI scope is a view option, not a table filter: switching it keeps the
// current filters and page. The default is the filtered view, so the URL only
// carries `summary=all` when the operator asks for the whole system.
export function SummaryScopeToggle({ filters }: { filters: OrderListFilters }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <ToggleGroup
      aria-label="ขอบเขต KPI"
      value={[filters.summary]}
      onValueChange={(value) => {
        const next = value[0]
        if (next !== 'filtered' && next !== 'all') return
        startTransition(() => {
          router.replace(orderListHref({ ...filters, summary: next }, filters.page))
        })
      }}
      variant="outline"
      spacing={0}
      disabled={pending}>
      <ToggleGroupItem value="filtered">ตามตัวกรอง</ToggleGroupItem>
      <ToggleGroupItem value="all">ทั้งหมด</ToggleGroupItem>
    </ToggleGroup>
  )
}
