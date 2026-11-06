import { Button, ButtonLink } from '@/components/ui/button'
import type { LineWalkListFilters } from '@/lib/db/types'
import { lineWalkListHref } from '@/lib/line-walks/filters'

// Page links preserve every active filter. The edge buttons become disabled
// Buttons rather than links, because a link with aria-disabled still
// navigates on some browsers.
export function LineWalkPagination({
  filters,
  page,
  pageCount,
  total,
}: {
  filters: LineWalkListFilters
  page: number
  pageCount: number
  total: number
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        พบ {total.toLocaleString('th-TH')} รายการ
        {pageCount > 1 ? ` · หน้า ${page} จาก ${pageCount}` : ''}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <ButtonLink
              variant="outline"
              size="sm"
              href={lineWalkListHref(filters, page - 1)}>
              ก่อนหน้า
            </ButtonLink>
          ) : (
            <Button variant="outline" size="sm" disabled>
              ก่อนหน้า
            </Button>
          )}

          {page < pageCount ? (
            <ButtonLink
              variant="outline"
              size="sm"
              href={lineWalkListHref(filters, page + 1)}>
              ถัดไป
            </ButtonLink>
          ) : (
            <Button variant="outline" size="sm" disabled>
              ถัดไป
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
