'use client'

import { createColumnHelper } from '@tanstack/react-table'

import { type DataTableFeatures } from '@/components/data-table/data-table-features'
import { Button } from '@/components/ui/button'

import { actionsHeader, profileColumn, requestedAtColumn, type RegisterUser } from './columns'

const columnHelper = createColumnHelper<DataTableFeatures, RegisterUser>()

// Approval queue table: same identity columns as the approved table, but with
// one-click approve/reject instead of a dropdown — the queue is high-frequency
// work, so each action must cost a single click.
export const pendingColumns = columnHelper.columns([
  profileColumn,
  requestedAtColumn,
  columnHelper.display({
    id: 'actions',
    header: () => actionsHeader,
    cell: () => (
      <div className="flex justify-center gap-2">
        {/* TODO: wire approve to the backend API when it exists. */}
        <Button size="sm">อนุมัติ</Button>
        {/* TODO: wire reject to the backend API when it exists. */}
        <Button size="sm" variant="destructive">
          ปฏิเสธ
        </Button>
      </div>
    ),
  }),
])
