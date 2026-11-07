import type { Metadata } from 'next'
import { io } from 'next/cache'
import { Suspense } from 'react'

import { InboxIcon } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { StateScreen } from '@/components/layout/state-screen'
import { ButtonLink } from '@/components/ui/button'
import { getCachedOrderOverview, listLines, listOrders } from '@/lib/db/order-images'
import { hasOrderFilters, orderListHref, parseOrderListParams } from '@/lib/order-images/filters'
import { todayBangkok } from '@/lib/order-images/validation'
import { PAGE_TITLES } from '@/lib/page-titles'

import { OrderFilters } from './order-filters'
import { OrderOverview } from './order-overview'
import { OrderPagination } from './order-pagination'
import { OrderTable } from './order-table'

// The admin list is dynamic and local-only. Instant navigation has no value
// here, and the page is the only place that reads the unfiltered tables.
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/order-images'],
}

export default async function OrderImageManagementPage(props: PageProps<'/order-images'>) {
  const params = await props.searchParams
  await io()

  const filters = parseOrderListParams(params)
  const today = todayBangkok()
  const filtered = hasOrderFilters(filters)
  const defaultToday = filters.period === 'day' && filters.date === today

  return (
    <div className="flex flex-1 flex-col gap-4 md:min-h-0 md:overflow-hidden">
      <Suspense fallback={<StateScreen loading title="กำลังโหลดภาพรวม…" />}>
        <OrderOverviewSection today={today} />
      </Suspense>

      <Suspense fallback={<StateScreen loading title="กำลังโหลดตัวกรอง…" />}>
        <OrderFiltersSection filters={filters} />
      </Suspense>

      <Suspense fallback={<StateScreen loading title="กำลังโหลดตาราง…" />}>
        <OrderTableSection filters={filters} filtered={filtered} defaultToday={defaultToday} today={today} />
      </Suspense>
    </div>
  )
}

// Streams the KPI strip + chart independently.
async function OrderOverviewSection({ today }: { today: string }) {
  const overview = await getCachedOrderOverview(today)
  return <OrderOverview overview={overview} today={today} />
}

// Streams the filter bar (line catalog).
async function OrderFiltersSection({ filters }: { filters: ReturnType<typeof parseOrderListParams> }) {
  const lines = listLines()
  return <OrderFilters key={orderListHref(filters, 1)} lines={lines} filters={filters} />
}

// Streams the order table (or empty state).
async function OrderTableSection({
  filters,
  filtered,
  defaultToday,
  today,
}: {
  filters: ReturnType<typeof parseOrderListParams>
  filtered: boolean
  defaultToday: boolean
  today: string
}) {
  const result = listOrders(filters)
  if (result.total === 0) {
    return (
      <EmptyState
        variant="page"
        className="md:min-h-0 md:overflow-y-auto"
        icon={<InboxIcon />}
        title={
          filtered
            ? 'ไม่พบออเดอร์ตามเงื่อนไข'
            : defaultToday
              ? 'วันนี้ยังไม่มีออเดอร์'
              : 'ไม่พบออเดอร์ในช่วงเวลาที่เลือก'
        }
        description={
          filtered
            ? 'ลองเปลี่ยนตัวกรองหรือล้างตัวกรองเพื่อดูออเดอร์อื่น'
            : defaultToday
              ? 'ออเดอร์จะแสดงที่นี่เมื่อพนักงานส่งจากฟอร์ม LIFF'
              : 'ลองเลือกช่วงเวลาอื่น หรือกลับไปดูของวันนี้'
        }
        actions={
          filtered || !defaultToday ? (
            <ButtonLink href="/order-images" variant="outline">
              {filtered ? 'ล้างตัวกรอง' : 'กลับไปวันนี้'}
            </ButtonLink>
          ) : undefined
        }
      />
    )
  }
  return (
    <>
      <OrderTable rows={result.rows} />
      <OrderPagination filters={filters} page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  )
}
