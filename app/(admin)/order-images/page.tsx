import type { Metadata } from 'next'
import { io } from 'next/cache'
import { Suspense } from 'react'

import { InboxIcon } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { StateScreen } from '@/components/layout/state-screen'
import { ButtonLink } from '@/components/ui/button'
import { getOrderOverview, listLines, listOrders } from '@/lib/db/order-images'
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

  return (
    <Suspense fallback={<StateScreen loading title="กำลังโหลด..." />}>
      <OrderImagesData params={params} />
    </Suspense>
  )
}

async function OrderImagesData({ params }: { params: Record<string, string | string[] | undefined> }) {
  // io() keeps the synchronous SQLite reads out of the static shell. The
  // parser reads the clock for the default "today", so it also runs after
  // this dynamic access rather than during prerendering.
  await io()
  const filters = parseOrderListParams(params)

  // The whole catalog, not only the lines that already have orders: the
  // operator picks a line before its first order exists.
  const lines = listLines()
  const today = todayBangkok()
  // The KPI strip and the chart share this window; the table keeps its own
  // filters below.
  const overview = getOrderOverview(today)
  const result = listOrders(filters)
  const filtered = hasOrderFilters(filters)
  const defaultToday = filters.period === 'day' && filters.date === today

  return (
    <div className="flex flex-1 flex-col gap-4 md:min-h-0 md:overflow-hidden">
      <OrderOverview overview={overview} today={today} />

      <OrderFilters key={orderListHref(filters, 1)} lines={lines} filters={filters} />

      {result.total === 0 ? (
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
              ? 'ลองเปลี่ยนช่วงเวลา ไลน์ผลิต หรือเลขออเดอร์ที่ค้นหา'
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
      ) : (
        <>
          <OrderTable rows={result.rows} />
          <OrderPagination filters={filters} page={result.page} pageCount={result.pageCount} total={result.total} />
        </>
      )}
    </div>
  )
}
