import type { Metadata } from 'next'
import { io } from 'next/cache'
import { Suspense } from 'react'

import { FootprintsIcon, InboxIcon } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { StateScreen } from '@/components/layout/state-screen'
import { ButtonLink } from '@/components/ui/button'
import { getCachedLineWalkOverview, listLineWalks } from '@/lib/db/line-walks'
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

export default async function LineWalkManagementPage(props: PageProps<'/line-walks'>) {
  const params = await props.searchParams
  await io()

  const filters = parseLineWalkListParams(params)
  const today = todayBangkok()
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

      <Suspense fallback={<StateScreen loading title="กำลังโหลดภาพรวม…" />}>
        <LineWalkOverviewSection today={today} />
      </Suspense>

      <Suspense fallback={<StateScreen loading title="กำลังโหลดตัวกรอง…" />}>
        <LineWalkFiltersSection filters={filters} />
      </Suspense>

      <Suspense fallback={<StateScreen loading title="กำลังโหลดตาราง…" />}>
        <LineWalkTableSection filters={filters} filtered={filtered} defaultToday={defaultToday} today={today} />
      </Suspense>
    </div>
  )
}

// Streams the KPI strip + chart independently.
async function LineWalkOverviewSection({ today }: { today: string }) {
  const overview = await getCachedLineWalkOverview(today)
  return <LineWalkOverview overview={overview} today={today} />
}

// Streams the filter bar (line catalog).
async function LineWalkFiltersSection({ filters }: { filters: ReturnType<typeof parseLineWalkListParams> }) {
  const lines = listLines()
  return (
    <LineWalkFilters
      key={lineWalkListHref(filters, 1)}
      lines={lines}
      filters={filters}
    />
  )
}

// Streams the table (or empty state).
async function LineWalkTableSection({
  filters,
  filtered,
  defaultToday,
  today,
}: {
  filters: ReturnType<typeof parseLineWalkListParams>
  filtered: boolean
  defaultToday: boolean
  today: string
}) {
  const result = listLineWalks(filters)
  if (result.total === 0) {
    return (
      <EmptyState
        variant="page"
        bordered
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
            ? 'ลองเปลี่ยนช่วงเวลา ไลน์ผลิต กะ แบรนด์ หรือ pack style'
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
    )
  }
  return (
    <>
      <LineWalkTable rows={result.rows} />
      <LineWalkPagination
        filters={filters}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </>
  )
}
