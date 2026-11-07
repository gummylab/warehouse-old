import type { Metadata } from 'next'
import { io } from 'next/cache'
import { Suspense } from 'react'

import { FootprintsIcon, InboxIcon } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { StateScreen } from '@/components/layout/state-screen'
import { ButtonLink } from '@/components/ui/button'
import { getLineWalkOverview, listLineWalks, getCachedLineWalkOverview } from '@/lib/db/line-walks'
import { listLines } from '@/lib/db/order-images'
import {
  hasLineWalkFilters,
  lineWalkListHref,
  parseLineWalkListParams,
} from '@/lib/line-walks/filters'
import { todayBangkok } from '@/lib/order-images/validation'
import { PAGE_TITLES } from '@/lib/page-titles'

import { LineWalkFilters } from './line-walk-filters'
import { LineWalkOverview } from './line-walk-overview'
import { LineWalkPagination } from './line-walk-pagination'
import { LineWalkTable } from './line-walk-table'

// The admin list is dynamic and local-only. Instant navigation has no value
// here, and the page is the only place that reads the unfiltered tables.
export const instant = false

export const metadata: Metadata = {
  title: PAGE_TITLES['/line-walks'],
}

export default async function LineWalksPage(
  props: PageProps<'/line-walks'>,
) {
  const params = await props.searchParams

  return (
    <Suspense fallback={<StateScreen loading title="กำลังโหลด..." />}>
      <LineWalksData params={params} />
    </Suspense>
  )
}

async function LineWalksData({
  params,
}: {
  params: Record<string, string | string[] | undefined>
}) {
  // io() keeps the synchronous SQLite reads out of the static shell; the
  // parser reads the clock for the default "today", so it also runs after this
  // dynamic access rather than during prerendering.
  await io()
  const filters = parseLineWalkListParams(params)

  // The whole catalog, not only the lines that already have records.
  const lines = listLines()
  const today = todayBangkok()
  // The KPI and the chart share one window and ignore the table filters.
  const overview = await getCachedLineWalkOverview(today)
  const result = listLineWalks(filters)
  const filtered = hasLineWalkFilters(filters)
  const defaultToday = filters.period === 'day' && filters.date === today

  return (
    <div className="flex flex-1 flex-col gap-4 md:min-h-0 md:overflow-hidden">
      <div className="flex shrink-0 justify-end">
        <ButtonLink
          href="/liff/forms/line-walk"
          target="_blank"
          rel="noreferrer">
          <FootprintsIcon />
          บันทึกการเดินไลน์
        </ButtonLink>
      </div>

      <LineWalkOverview overview={overview} today={today} />

      <LineWalkFilters
        key={lineWalkListHref(filters, 1)}
        lines={lines}
        filters={filters}
      />

      {result.total === 0 ? (
        <EmptyState
          variant="page"
          className="md:min-h-0 md:overflow-y-auto"
          icon={<InboxIcon />}
          title={
            filtered
              ? 'ไม่พบบันทึกตามเงื่อนไข'
              : defaultToday
                ? 'วันนี้ยังไม่มีการเดินไลน์'
                : 'ไม่พบบันทึกในช่วงเวลาที่เลือก'
          }
          description={
            filtered
              ? 'ลองเปลี่ยนช่วงเวลา ไลน์ผลิต กะ หรือคำค้น'
              : defaultToday
                ? 'บันทึกจากการเดินไลน์ในฟอร์ม LIFF แล้วจะแสดงที่นี่'
                : 'ลองเลือกช่วงเวลาอื่น หรือกลับไปดูของวันนี้'
          }
          actions={
            filtered || !defaultToday ? (
              <ButtonLink href="/line-walks" variant="outline">
                {filtered ? 'ล้างตัวกรอง' : 'กลับไปวันนี้'}
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <LineWalkTable rows={result.rows} />
          <LineWalkPagination
            filters={filters}
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
          />
        </>
      )}
    </div>
  )
}
